/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { SubscriptionStatus } from '../../../generated/prisma/enums';
import { LitterService } from '../litter/litter.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CertificateRequestService } from '../admin/certificate-request/certificate-request.service';
import { OwnershipTransferService } from '../owner-transfer/owner-transfer.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly litterService: LitterService,
    private readonly certService: CertificateRequestService,
    private readonly transferService: OwnershipTransferService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  // ✅ SAFE PARSER
  private safeParse(value: any, fallback: any = {}) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET')!,
      );
      this.logger.log(`[Webhook] Event Received: ${event.id} [${event.type}]`);
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSession(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'checkout.session.expired':
        case 'payment_intent.payment_failed':
          await this.handleFailedPayment(event.data.object as any);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionStatusUpdate(
            (event.data.object as Stripe.Subscription).id,
            SubscriptionStatus.CANCELED,
          );
          break;

        case 'invoice.payment_failed':
          await this.handleSubscriptionStatusUpdate(
            (event.data.object as any).subscription as string,
            SubscriptionStatus.UNPAID,
          );
          break;

        default:
          this.logger.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      this.logger.error(
        `[Webhook] Error processing event ${event.id}: ${error.message}`,
      );
      throw new InternalServerErrorException('Webhook processing failed');
    }

    return { received: true };
  }

  private async handleCheckoutSession(session: Stripe.Checkout.Session) {
    const sessionId = session.id;
    let currentSession = session;

    if (
      !currentSession.client_reference_id ||
      !currentSession.metadata ||
      (currentSession.mode === 'subscription' &&
        !currentSession.subscription)
    ) {
      currentSession = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });
    }

    const userId = currentSession.client_reference_id;
    const metadata = currentSession.metadata || {};

    if (!userId) return;

    if (metadata.type === 'EXTRA_CANINE_REGISTRATION') {
      await this.handleExtraCaninePayment(currentSession);
      return;
    }

    if (metadata.type === 'LITTER_REGISTRATION') {
      await this.handleLitterPayment(currentSession);
      return;
    }

    if (metadata.type === 'CERTIFICATE_ORDER') {
      await this.handleCertificatePayment(currentSession);
      return;
    }

    if (metadata.type === 'TRANSFER_PAYMENT') {
      await this.handleTransferPayment(currentSession);
      return;
    }

    const membershipId = metadata.membershipId;

    let stripeSubId: string | null = null;
    if (typeof currentSession.subscription === 'string') {
      stripeSubId = currentSession.subscription;
    } else if (currentSession.subscription) {
      stripeSubId = (currentSession.subscription as any).id;
    }

    if (!membershipId || !stripeSubId) return;

    const subscription: any =
      await this.stripe.subscriptions.retrieve(stripeSubId);

    const periodEnd = new Date(subscription.current_period_end * 1000);

    await this.prisma.$transaction(async (tx) => {
      const plan = await tx.membership.findUnique({
        where: { id: membershipId },
      });
      if (!plan) throw new Error('Plan not found');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      let updateData: any = { membershipId };

      if (plan.tier === 'PRESTIGE' && user.pcrPrefix !== 'PA') {
        const newPrefix = 'PA';
        updateData.pcrPrefix = newPrefix;
        updateData.pcrId = `PCR-${newPrefix}${user.pcrIncremental}-${user.pcrRandom}`;
      }

      await tx.user.update({ where: { id: userId }, data: updateData });

      await tx.subscription.upsert({
        where: { stripeSubscriptionId: stripeSubId },
        update: {
          status: SubscriptionStatus.PAID,
          currentPeriodEnd: periodEnd,
        },
        create: {
          stripeSubscriptionId: stripeSubId,
          userId,
          membershipId,
          amountPaid: plan.currentPrice,
          status: SubscriptionStatus.PAID,
          currentPeriodEnd: periodEnd,
        },
      });
    });
  }

  private async handleExtraCaninePayment(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;
    const meta = session.metadata || {};
    if (!userId || !meta.canineData) return;

    const basic = this.safeParse(meta.canineData);
    const location = this.safeParse(meta.locationData);
    const health = this.safeParse(meta.healthData);
    const imageUrls = this.safeParse(meta.imageUrls, []);
    const docUrls = this.safeParse(meta.docUrls, []);

    await this.prisma.$transaction(async (tx) => {
      const breed = await tx.breed.findUnique({
        where: { id: basic.breedId },
      });
      if (!breed) throw new Error('Breed not found');

      const isDesigner = breed.type === 'DESIGNER';
      const pcrPrefix = isDesigner ? 'B' : 'G';
      const generation = isDesigner ? 'F1' : null;
      const genPart = generation ? `-${generation}` : '';

      const lastCanine = await tx.canine.findFirst({
        where: { pcrPrefix, pcrBreedCode: breed.breedCode },
        orderBy: { pcrIncremental: 'desc' },
      });

      const nextInc = lastCanine
        ? parseInt(lastCanine.pcrIncremental) + 1
        : 1;

      const pcrIncremental = nextInc.toString().padStart(5, '0');
      const pcrRandom = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      const pcrId = `PCR-${pcrPrefix}${breed.breedCode}${genPart}-${pcrIncremental}-${pcrRandom}`;

      const newCanine = await tx.canine.create({
        data: {
          name: basic.name,
          gender: basic.gender,
          dateOfBirth: new Date(basic.dob),
          color: basic.color,
          weight: basic.weight,
          microchipId: basic.microchip,
          city: location.city,
          state: location.state,
          country: location.country,
          zipCode: location.zip,
          generation,
          pcrId,
          pcrPrefix,
          pcrBreedCode: breed.breedCode,
          pcrIncremental,
          pcrRandom,
          ownerId: userId,
          breedId: breed.id,
          tier: isDesigner ? 'BLUE' : 'GOLD',
          primaryBreedDNA: health.pDNA,
          secondaryBreedDNA: health.sDNA,
          healthStatus: health.status,
          vaccinations: health.vacs,
          healthClearances: health.clear,
          images: {
            create: imageUrls.map((url: string) => ({
              url,
              publicId: url.split('/').pop(),
            })),
          },
          DNAdocuments: {
            create: docUrls.map((url: string) => ({
              url,
              name: 'DNA Report',
              publicId: url.split('/').pop(),
            })),
          },
        },
      });

      await tx.transaction.create({
        data: {
          stripeSessionId: session.id,
          userId,
          serviceType: 'CANINE_REG',
          amount: session.amount_total
            ? session.amount_total / 100
            : 0,
          status: 'PAID',
          resourceId: newCanine.id,
        },
      });

      await this.notificationsService.alertAdmins({
        title: 'New Canine Paid',
        message: `A new Canine "${newCanine.name}" has been registered via Stripe. PcrId: ${newCanine.pcrId}`,
        category: 'CANINE',
        sourceId: newCanine.id,
      });
    });
  }

  private async handleLitterPayment(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;
    const meta = session.metadata || {};

    if (!userId || !meta.b) return;

    const b = this.safeParse(meta.b);
    const l = this.safeParse(meta.l);
    const p = this.safeParse(meta.p, []);
    const imgs = this.safeParse(meta.imgs, []);
    const docs = this.safeParse(meta.docs, []);

    const dto = {
      litterName: b.n,
      breedId: b.bid,
      dateOfBirth: b.dob,
      motherPcrId: b.mid,
      fatherPcrId: b.fid,
      city: l.c,
      state: l.s,
      zipCode: l.z,
      country: l.co,
      puppies: p.map((pup: any) => ({
        name: pup.n,
        gender: pup.g,
        color: pup.c,
        weight: pup.w,
        microchipId: pup.m,
        healthStatus: pup.hs,
        vaccinations: pup.v,
        healthClearances: pup.hc,
      })),
    };

    await this.prisma.$transaction(async (tx) => {
      const breed = await tx.breed.findUnique({
        where: { id: dto.breedId },
      });

      const newLitter = await this.litterService.executeLitterCreation(
        tx,
        userId,
        dto,
        b.gen,
        imgs,
        docs,
        breed,
      );

      await tx.transaction.create({
        data: {
          stripeSessionId: session.id,
          userId,
          serviceType: 'LITTER_REG',
          amount: session.amount_total
            ? session.amount_total / 100
            : 0,
          status: 'PAID',
          resourceId: newLitter.id,
        },
      });

      await this.notificationsService.alertAdmins({
        title: 'New Litter Paid',
        message: `A new litter "${newLitter.name}" has been registered via Stripe. PcrId: ${newLitter.pcrId}`,
        category: 'CANINE',
        sourceId: newLitter.id,
      });
    });
  }

  private async handleFailedPayment(session: any) {
    const metadata =
      session.metadata ||
      session.last_payment_error?.payment_method?.metadata;

    const canineId = metadata?.canineId;

    if (canineId && metadata?.type === 'EXTRA_CANINE_REGISTRATION') {
      try {
        const canine = await this.prisma.canine.findUnique({
          where: { id: canineId },
        });

        if (canine && canine.status === 'PENDING_PAYMENT') {
          await this.prisma.canine.delete({ where: { id: canineId } });

          this.logger.warn(
            `Abandoned canine record ${canineId} deleted due to failed payment.`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Cleanup failed for canine ${canineId}: ${err.message}`,
        );
      }
    }
  }

  private async handleSubscriptionStatusUpdate(
    subId: string,
    status: SubscriptionStatus,
  ) {
    if (!subId) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data: { status },
    });
  }

  private async handleCertificatePayment(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;
    const meta = session.metadata || {};

    if (!userId) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        const newRequest = await this.certService.executeRequestCreation(
          tx,
          userId,
          {
            canineId: meta.canineId || null,
            litterId: meta.litterId || null,
            certificateType: meta.certificateType,
          },
        );

        await tx.transaction.create({
          data: {
            stripeSessionId: session.id,
            userId,
            serviceType: 'CERTIFICATE',
            amount: session.amount_total
              ? session.amount_total / 100
              : 0,
            status: 'PAID',
            resourceId: newRequest.id,
          },
        });

        await this.notificationsService.alertAdmins({
          title: 'New Certificate Request Paid',
          message: `A user has paid for a ${meta.certificateType} request (Id: ${newRequest.requestId}).`,
          category: 'CERTIFICATE',
          sourceId: newRequest.id,
        });
      });
    } catch (error: any) {
      this.logger.error(
        `Certificate Payment Processing Failed: ${error.message}`,
      );
    }
  }

  private async handleTransferPayment(session: any) {
    const userId = session.client_reference_id;
    const meta = session.metadata || {};

    const transferId = meta.transferId;
    const type = meta.type;

    if (type !== 'TRANSFER_PAYMENT' || !userId || !transferId) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.transferService.executeOwnershipChange(
          tx,
          transferId,
          userId,
        );

        await tx.transaction.create({
          data: {
            stripeSessionId: session.id,
            userId,
            serviceType: 'TRANSFER',
            amount: session.amount_total
              ? session.amount_total / 100
              : 0,
            status: 'PAID',
            resourceId: transferId,
          },
        });

        await this.notificationsService.alertAdmins({
          title: 'Ownership Transfer Paid',
          message: `Transfer ${transferId} has been paid and processed automatically.`,
          category: 'TRANSFER_OWNERSHIP',
          sourceId: transferId,
        });
      });
    } catch (error: any) {
      this.logger.error(`Transfer Webhook Failed: ${error.message}`);
    }
  }
}