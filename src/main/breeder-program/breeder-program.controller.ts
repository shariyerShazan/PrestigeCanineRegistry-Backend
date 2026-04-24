import { 
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, 
  UseInterceptors, UploadedFiles, UploadedFile, 
  UnauthorizedException
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { BreederProgramService } from './breeder-program.service';

import { UpsertBreederProgramDto, CreateBlogLitterDto, UpdateBlogLitterDto } from './dto/blog-breed.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../../guard/jwt.auth.guard';
import { PaGuard } from '../../guard/PaGuard';


@Controller('breeder-program')
export class BreederProgramController {
  constructor(
    private readonly breederProgramService: BreederProgramService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

@UseGuards(JwtAuthGuard, PaGuard)
@Post('profile-pa')
@UseInterceptors(FileInterceptor('banner'))
async upsertProfile(
  @Request() req: any,
  @Body() dto: UpsertBreederProgramDto,
  @UploadedFile() file?: Express.Multer.File
) {
  console.log('User from Request:', req.user); 
  const userId = req.userId 
  if (!userId) {
    throw new UnauthorizedException('User ID not found in request');
  }
  if (file) {
    const uploadResult = await this.cloudinaryService.uploadSingleImage(file, 'banners');
    dto.bannerUrl = uploadResult.url;
  }
  return await this.breederProgramService.upsertProgram(userId, dto);
}


  @Get('profile-pa/:userId')
  async getPublicProfile(@Param('userId') userId: string) {
    return await this.breederProgramService.getProgramDetails(userId);
  }


  @UseGuards(JwtAuthGuard, PaGuard)
  @Post('blog-litter')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  async createLitter(
    @Request() req: any,
    @Body() dto: CreateBlogLitterDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] }
  ) {
    if (files.images && files.images.length > 0) {
      const uploadResults = await Promise.all(
        files.images.map(file => this.cloudinaryService.uploadSingleImage(file, 'litters'))
      );
      
      dto.images = uploadResults.map((img, index) => ({
        url: img.url,
        publicId: img.public_id,
        isPrimary: index === 0
      }));
    }
    
    return await this.breederProgramService.createBlogLitter(req.userId, dto);
  }
  @UseGuards(JwtAuthGuard, PaGuard)
  @Patch('blog-litter/:id')
@UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 2 }]))
  async updateLitter(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateBlogLitterDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] }
  ) {
    if (files.images && files.images.length > 0) {
      const uploadResults = await Promise.all(
        files.images.map(file => this.cloudinaryService.uploadSingleImage(file, 'litters'))
      );
      
      dto.images = uploadResults.map((img, index) => ({
        url: img.url,
        publicId: img.public_id,
        isPrimary: index === 0
      }));
    }

    return await this.breederProgramService.updateBlogLitter(id, req.userId, dto);
  }

  @UseGuards(JwtAuthGuard, PaGuard)
  @Delete('blog-litter/:id')
  async deleteLitter(@Param('id') id: string, @Request() req: any) {
    return await this.breederProgramService.deleteBlogLitter(id, req.userId);
  }

  @Get(':userId/litters')
  async getPaginatedLitters(
    @Param('userId') userId: string,
    @Request() req: any
  ) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    return await this.breederProgramService.getPaginatedLitters(userId, page, limit);
  }
}