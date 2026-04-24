/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../main/prisma/prisma.service';
import { CreateCertificateRequestDto } from './dto/certificate-request.dto';
import { PaymentService } from '../../payment/payment.service';

@Injectable()
export class CertificateRequestService {
  constructor(private prisma: PrismaService , private paymentService: PaymentService) {}

  // 1. Get All Requests with logic-based filtering and safe pagination
  async getAllRequests(query: any) {
    const { status, search, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { owner: { fullName: { contains: search, mode: 'insensitive' } } },
          { owner: { email: { contains: search, mode: 'insensitive' } } },
          { requestId: { contains: search, mode: 'insensitive' } },
          { canine: { name: { contains: search, mode: 'insensitive' } } },
          { canine: { pcrId: { contains: search, mode: 'insensitive' } } },
          { litter: { pcrId: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.certificateRequest.findMany({
        where,
        include: {
          owner: {
            select: { id: true, fullName: true, email: true, pcrId: true },
          },
          canine: {
            select: { id: true, name: true, pcrId: true, tier: true },
          },
          litter: {
            select: { id: true, pcrId: true, tier: true },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.certificateRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / Number(limit)),
      },
    };
  }

  // 2. Get Detail with existence check
async getById(id: string) {
  const request = await this.prisma.certificateRequest.findUnique({
    where: { id },
    include: {
      owner: true,
      canine: {
        include: {
          breedRelation: true,
          images: true,
          // Pedigree-r jonno ancestor data (Parents & Grandparents)
          litter: {
            include: {
              mother: {
                include: {
                  images: true,
                  breedRelation: true,
                  litter: {
                    include: {
                      mother: { select: { name: true, pcrId: true } }, // Grandmother
                      father: { select: { name: true, pcrId: true } }  // Grandfather
                    }
                  }
                }
              },
              father: {
                include: {
                  images: true,
                  breedRelation: true,
                  litter: {
                    include: {
                      mother: { select: { name: true, pcrId: true } }, // Grandmother
                      father: { select: { name: true, pcrId: true } }  // Grandfather
                    }
                  }
                }
              }
            }
          }
        }
      },
      litter: {
        include: { puppies: true, breedRelation: true }
      },
    },
  });

  if (!request) {
    throw new NotFoundException(`Certificate request with ID ${id} not found`);
  }

  return request;
}

  // 3. Update Status with business logic validation
  async updateStatus(
    id: string,
    status: 'APPROVED' | 'DECLINE' | 'PENDING' | 'UNDER_REVIEW',
  ) {
    // 1. Fetch current request status
    const request = await this.prisma.certificateRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // 2. Validation: Prevent duplicate approval logic
    if (request.status === status) {
      throw new BadRequestException(
        `This certificate is already in ${status} status`,
      );
    }

    // 4. Update with Issued Date logic
    return this.prisma.certificateRequest.update({
      where: { id },
      data: {
        status: status as any,
        // If moving back to PENDING or UNDER_REVIEW, we clear the issuedDate
        issuedDate: status === 'APPROVED' ? new Date() : null,
      },
    });
  }
  // 4. Delete with existence validation
  async delete(id: string) {
    const request = await this.prisma.certificateRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Cannot delete: Request not found');
    }

    // Optional: Prevent deletion of already approved certificates for record keeping
    if (request.status === 'APPROVED') {
      throw new BadRequestException(
        'Cannot delete an approved certificate record',
      );
    }

    return this.prisma.certificateRequest.delete({
      where: { id },
    });
  }

  // 5. User Side: Create Request with Validation
async createRequest(ownerId: string, dto: CreateCertificateRequestDto) {
  // 1. Canine Validation & Eligibility Check
  if (dto.canineId) {
    const canine = await this.prisma.canine.findUnique({
      where: { id: dto.canineId },
      include: {
        asMother: {
          include: { _count: { select: { puppies: true } } }
        },
        asFather: {
          include: { _count: { select: { puppies: true } } }
        }
      },
    });

    if (!canine) throw new NotFoundException('Canine not found');

    // 2. Approval Status Check
    if (canine.status !== 'APPROVED') {
      throw new BadRequestException(
        'Cannot request a certificate for a canine that is not yet approved',
      );
    }
if (dto.certificateType === 'PEDIGREE') {
  // Canine er sathe tar litter ebong litter er parents include korte hobe
  const canineWithParents = await this.prisma.canine.findUnique({
    where: { id: dto.canineId },
    include: {
      litter: {
        include: {
          mother: true,
          father: true,
        },
      },
    },
  });

  if (!canineWithParents) throw new NotFoundException('Canine not found');

  const hasParents = canineWithParents.litter?.motherPcrId && canineWithParents.litter?.fatherPcrId;

  if (!hasParents) {
    throw new BadRequestException(
      `Pedigree request denied. Both father and mother must be registered in the system for this canine.`
    );
  }
}

    // 4. Duplicate Check (Existing Pending or Approved requests)
    const existingRequest = await this.prisma.certificateRequest.findFirst({
      where: {
        canineId: dto.canineId,
        ownerId: ownerId,
        certificateType: dto.certificateType,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingRequest) {
      const message = existingRequest.status === 'PENDING' 
        ? `Your ${dto.certificateType} request is already pending review.` 
        : `A ${dto.certificateType} has already been issued for this canine.`;
      throw new BadRequestException(message);
    }
  }

  // 5. Pricing & Payment Logic
  const user = await this.prisma.user.findUnique({
    where: { id: ownerId },
    include: { membership: { include: { servicePricings: true } } },
  });

  if (!user?.membership)
    throw new BadRequestException('No active membership found');

  const certPricing = user.membership.servicePricings.find(
    (sp) => sp.serviceType === 'CERTIFICATE',
  );
  
  const basePrice = certPricing?.price || 0;
  const discount = user.membership.certificateDiscount || 0;
  const finalAmount = Math.round(basePrice * (1 - discount) * 100); // Amount in cents/poisha

  // 6. Execution: If Free or Paid
  if (finalAmount <= 0) {
    // If amount is 0, directly create the request in a transaction
    return await this.prisma.$transaction(async (tx) => {
      return await this.executeRequestCreation(tx, ownerId, dto);
    });
  }

  // If payment is required, redirect to payment service
  // paymentService e ownerId, dto, ebong finalAmount pass kora hocche
  return await this.paymentService.createCertificateSession(ownerId, dto, finalAmount);
}

// 7. Database Logic (Transaction helper - Webhook ba Free flow theke call hobe)
async executeRequestCreation(tx: any, ownerId: string, dto: any) {
  const generatedRequestId = `CERT-${Date.now().toString().slice(-6)}`;

  return await tx.certificateRequest.create({
    data: {
      requestId: generatedRequestId,
      ownerId,
      canineId: dto.canineId || null,
      certificateType: dto.certificateType,
      status: 'PENDING',
    },
  });
}

async getMyRequests(ownerId: string) {
  const requests = await this.prisma.certificateRequest.findMany({
    where: { ownerId },
    include: {
      canine: {
        include: {
          images: true,
          litter: {
            include: {
              mother: {
                include: {
                  images: true,
                  litter: { include: { mother: true, father: true } }
                }
              },
              father: {
                include: {
                  images: true,
                  litter: { include: { mother: true, father: true } }
                }
              }
            }
          }
        },
      },
      litter: {
        select: { name: true, pcrId: true, images: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests; 
}
}
