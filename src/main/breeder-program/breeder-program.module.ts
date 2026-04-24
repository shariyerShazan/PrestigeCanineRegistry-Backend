import { Module } from '@nestjs/common';
import { BreederProgramController } from './breeder-program.controller';
import { BreederProgramService } from './breeder-program.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Module({
  controllers: [BreederProgramController],
  providers: [BreederProgramService, PrismaService, CloudinaryService]
})
export class BreederProgramModule {}
