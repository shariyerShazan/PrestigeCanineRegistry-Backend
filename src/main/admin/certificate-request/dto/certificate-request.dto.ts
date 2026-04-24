import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  //   IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CertificateRequestStatus, CertificateType } from '../../../../../generated/prisma/enums';

export class CreateCertificateRequestDto {
  @ApiProperty({ example: 'canine-uuid-here', required: false })
  @IsUUID()
  @IsOptional()
  canineId?: string;

  @ApiProperty({ example: 'litter-uuid-here', required: false })
  @IsUUID()
  @IsOptional()
  litterId?: string;

@ApiProperty({
    enum: CertificateType,
    example: CertificateType.CERTIFICATE,
    required: true,
    description: 'Type of the certificate (CERTIFICATE or PEDIGREE)'
  })
  @IsEnum(CertificateType)
  certificateType!: CertificateType;
}

export class CertificateQueryDto {
  @ApiPropertyOptional({ enum: CertificateRequestStatus })
  @IsEnum(CertificateRequestStatus)
  @IsOptional()
  status?: CertificateRequestStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number;
}
