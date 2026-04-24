import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBreederProgramDto, CreateBlogLitterDto, UpdateBlogLitterDto } from './dto/blog-breed.dto';

const parsePoints = (val: unknown): string[] => {
  if (!val) return [];

  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
      return [val.trim()].filter(Boolean);
    } catch {
      return [val.trim()].filter(Boolean);
    }
  }

  return [];
};

@Injectable()
export class BreederProgramService {
  constructor(private prisma: PrismaService) {}



async upsertProgram(userId: string, dto: UpsertBreederProgramDto) {
  const programData = {
    programName: dto.programName,
    location: dto.location,
    website: dto.website,
    bannerUrl: dto.bannerUrl,

    // About Section
    aboutIntro: dto.aboutIntro,
    aboutPoints: parsePoints(dto.aboutPoints),
    aboutOutro: dto.aboutOutro,

    // Philosophy
    philosophyIntro: dto.philosophyIntro,
    philosophyPoints: parsePoints(dto.philosophyPoints),
    philosophyOutro: dto.philosophyOutro,

    // Goals
    goalsIntro: dto.goalsIntro,
    goalsPoints: parsePoints(dto.goalsPoints),
    goalsOutro: dto.goalsOutro,

    // Litter
    litterIntro: dto.litterIntro,
    litterPoints: parsePoints(dto.litterPoints),
    litterOutro: dto.litterOutro,

    // Screening
    screeningIntro: dto.screeningIntro,
    screeningPoints: parsePoints(dto.screeningPoints),
    screeningOutro: dto.screeningOutro,
  };

  return await this.prisma.breederProgram.upsert({
    where: { 
      userId: userId 
    },
    update: programData,
    create: {
      ...programData,
      userId: userId,
    },
  });
}

  async getProgramDetails(userId: string) {
    const program = await this.prisma.breederProgram.findUnique({
      where: { userId },
      include: {
        blogLitters: {
          include: {
            sire: { select: { id: true, name: true, images: true, pcrId: true } },
            dam: { select: { id: true, name: true, images: true, pcrId: true } },
            breedRelation: true,
            images: true,
          },
        },
      },
    });

    if (!program) throw new NotFoundException('Breeder program not found');
    return program;
  }

  async createBlogLitter(userId: string, dto: CreateBlogLitterDto) {
  const { images, isComing, ...litterData } = dto;

  const program = await this.prisma.breederProgram.findUnique({
    where: { userId },
  });

  if (!program) {
    throw new BadRequestException('You must create a breeder program before listing a litter.');
  }

 const { sireId, damId, breedId } = await this.validateLitterRelations(dto.sireId, dto.damId, dto.breedId);

  const isComingBoolean = String(isComing) === 'true';

return await this.prisma.blogLitter.create({
    data: {
      ...litterData,
      ownerId: userId,
      breederProgramId: program.id,
      sireId: sireId, 
      damId: damId,
      breedId: breedId,
      litterSize: Number(dto.litterSize),
      isComing: isComingBoolean,
      images: {
        create: images?.map(img => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: img.isPrimary || false,
        })),
      },
    },
    include: { images: true },
  });
}

async updateBlogLitter(litterId: string, userId: string, dto: UpdateBlogLitterDto) {
  const { images, isComing, ...updateData } = dto;

  const existingLitter = await this.prisma.blogLitter.findUnique({
    where: { id: litterId },
  });

  if (!existingLitter || existingLitter.ownerId !== userId) {
    throw new NotFoundException('Litter not found or you do not have permission to edit it.');
  }

  let finalSireId = existingLitter.sireId;
  let finalDamId = existingLitter.damId;
  let finalBreedId = existingLitter.breedId;

  if (dto.sireId || dto.damId || dto.breedId) {
    const validated = await this.validateLitterRelations(
      dto.sireId || undefined, // pcrId logic handled inside helper
      dto.damId || undefined,
      dto.breedId || finalBreedId,
      true // update flag
    );
    if(validated.sireId) finalSireId = validated.sireId;
    if(validated.damId) finalDamId = validated.damId;
    if(validated.breedId) finalBreedId = validated.breedId;
  }

  let isComingBoolean = existingLitter.isComing;
  if (isComing !== undefined) {
    isComingBoolean = String(isComing) === 'true';
  }

  return await this.prisma.blogLitter.update({
    where: { id: litterId },
    data: {
      ...updateData,
      sireId: finalSireId,
      damId: finalDamId,
      breedId: finalBreedId,
      litterSize: dto.litterSize ? Number(dto.litterSize) : undefined,
      isComing: isComingBoolean,
      images: images ? {
        deleteMany: {},
        create: images,
      } : undefined,
    },
    include: { images: true },
  });
}

private async validateLitterRelations(sirePcrId?: string, damPcrId?: string, breedId?: string, isUpdate = false) {
  const queries: any = {};
  
  if (breedId) queries.breed = this.prisma.breed.findUnique({ where: { id: breedId } });
  if (sirePcrId) queries.sire = this.prisma.canine.findUnique({ where: { pcrId: sirePcrId } });
  if (damPcrId) queries.dam = this.prisma.canine.findUnique({ where: { pcrId: damPcrId } });

  const results = await Promise.all(Object.values(queries));
  const keys = Object.keys(queries);
  const data: any = {};
  keys.forEach((key, index) => { data[key] = results[index]; });

  if (breedId && !data.breed) throw new NotFoundException('Selected breed not found.');
  
  if (sirePcrId) {
    if (!data.sire) throw new NotFoundException(`Sire with PCR ID ${sirePcrId} not found.`);
    if (data.sire.gender !== 'MALE') throw new BadRequestException('Sire must be a male canine.');
  }

  if (damPcrId) {
    if (!data.dam) throw new NotFoundException(`Dam with PCR ID ${damPcrId} not found.`);
    if (data.dam.gender !== 'FEMALE') throw new BadRequestException('Dam must be a female canine.');
  }

  if (sirePcrId && damPcrId && sirePcrId === damPcrId) {
    throw new BadRequestException('Sire and Dam cannot be the same dog.');
  }

  return {
    breedId: data.breed?.id,
    sireId: data.sire?.id, 
    damId: data.dam?.id, 
  };

}

async deleteBlogLitter(litterId: string, userId: string) {
  const litter = await this.prisma.blogLitter.findUnique({
    where: { id: litterId },
  });

  if (!litter || litter.ownerId !== userId) {
    throw new NotFoundException('Litter not found or unauthorized');
  }

  return await this.prisma.blogLitter.delete({
    where: { id: litterId },
  });
}

async getPaginatedLitters(userId: string, page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const program = await this.prisma.breederProgram.findUnique({
    where: { userId },
    select: { id: true, programName: true, litterIntro: true },
  });

  if (!program) throw new NotFoundException('Breeder program not found');

  const [litters, totalCount] = await Promise.all([
    this.prisma.blogLitter.findMany({
      where: { breederProgramId: program.id },
      include: {
        sire: { select: { id: true, name: true, images: true, pcrId: true } },
        dam: { select: { id: true, name: true, images: true, pcrId: true } },
        breedRelation: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.blogLitter.count({
      where: { breederProgramId: program.id },
    }),
  ]);

  return {
    program: {
      programName: program.programName,
      litterIntro: program.litterIntro,
    },
    litters,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}

}