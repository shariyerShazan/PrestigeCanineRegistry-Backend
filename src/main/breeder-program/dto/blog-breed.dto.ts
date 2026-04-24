import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { BlogTier } from '../../../../generated/prisma/enums';

class BlogLitterImageDto {
  @IsString()
  url!: string;

  @IsString()
  publicId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpsertBreederProgramDto {
  @IsString()
  programName!: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  website?: string;

  // --- About Section ---
  @IsOptional()
  @IsString()
  aboutIntro?: string;

  @IsOptional()
  aboutPoints?: any;

  @IsOptional()
  @IsString()
  aboutOutro?: string;

  // --- Philosophy Section ---
  @IsOptional()
  @IsString()
  philosophyIntro?: string;

  @IsOptional()
  philosophyPoints?: any;

  @IsOptional()
  @IsString()
  philosophyOutro?: string;

  // --- Goals Section ---
  @IsOptional()
  @IsString()
  goalsIntro?: string;

  @IsOptional()
  goalsPoints?: any;

  @IsOptional()
  @IsString()
  goalsOutro?: string;

  // --- Litter Practices ---
  @IsOptional()
  @IsString()
  litterIntro?: string;

  @IsOptional()
  litterPoints?: any;

  @IsOptional()
  @IsString()
  litterOutro?: string;

  // --- Screening Process ---
  @IsOptional()
  @IsString()
  screeningIntro?: string;

  @IsOptional()
  screeningPoints?: any;

  @IsOptional()
  @IsString()
  screeningOutro?: string;
}


export class CreateBlogLitterDto {
  @IsNotEmpty()
  @IsString()
  sireId!: string;

  @IsNotEmpty()
  @IsString()
  damId!: string;

  @IsInt()
  litterSize!: number;

  @IsNotEmpty()
  @IsString()
  breedId!: string;

  @IsEnum(BlogTier)
  tier!: BlogTier;

  @IsOptional()
  @Type(() => BlogLitterImageDto)
  images!: BlogLitterImageDto[];

  @IsOptional()
  @IsString()
  isComing?: string;

}

export class UpdateBlogLitterDto {
  @IsOptional()
  @IsString()
  sireId?: string;

  @IsOptional()
  @IsString()
  damId?: string;

  @IsOptional()
  @IsInt()
  litterSize?: number;

  @IsOptional()
  @IsString()
  breedId!: string;


  @IsOptional()
  @IsEnum(BlogTier)
  tier?: BlogTier;

  @IsOptional()
  @Type(() => BlogLitterImageDto)
  images?: BlogLitterImageDto[];

  @IsOptional()
  @IsString()
  isComing?: string;
}