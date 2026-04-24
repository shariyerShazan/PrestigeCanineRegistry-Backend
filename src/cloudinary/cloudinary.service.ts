// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// // src/common/cloudinary/cloudinary.service.ts
// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
// import * as streamifier from 'streamifier';
// import { Multer } from 'multer';
// @Injectable()
// export class CloudinaryService {
  
//   constructor() {
//     cloudinary.config({
//       cloud_name: process.env.CLOUDINARY_NAME!,
//       api_key: process.env.CLOUDINARY_API_KEY!,
//       api_secret: process.env.CLOUDINARY_API_SECRET!,
//     });
//   }

  
//   async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
//     if (!files || files.length === 0) return [];

//     const uploadPromises = files.map((file) => {
//       return new Promise<string>((resolve, reject) => {
//         const uploadStream = cloudinary.uploader.upload_stream(
//           { folder: 'ads' },
//           (error, result: UploadApiResponse | undefined) => {
//             if (error) {
//               return reject(
//                 new InternalServerErrorException('Cloudinary Upload Failed'),
//               );
//             }
//             if (result?.secure_url) {
//               resolve(result.secure_url);
//             } else {
//               reject(
//                 new InternalServerErrorException(
//                   'Cloudinary response missing URL',
//                 ),
//               );
//             }
//           },
//         );
//         streamifier.createReadStream(file.buffer).pipe(uploadStream);
//       });
//     });

//     console.log({
//   CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
//   CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
//   CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
// });

//     return Promise.all(uploadPromises);
//   }

//   async uploadSingleImage(
//     file: Express.Multer.File,
//     folder: string = 'profiles',
//   ) {
//     return new Promise<{ url: string; public_id: string }>(
//       (resolve, reject) => {
//         const uploadStream = cloudinary.uploader.upload_stream(
//           { folder },
//           (error, result) => {
//             if (error)
//               return reject(
//                 new InternalServerErrorException('Cloudinary Upload Failed'),
//               );
//             if (result) {
//               resolve({ url: result.secure_url, public_id: result.public_id });
//             }
//           },
//         );
//         streamifier.createReadStream(file.buffer).pipe(uploadStream);
//       },
//     );
//   }
// }



import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Multer } from 'multer';

@Injectable()
export class CloudinaryService {
  private readonly uploadPath = path.join(process.cwd(), 'uploads');
  private readonly baseUrl = process.env.BACKEND_URL!;
  constructor() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        try {
          const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
          const filePath = path.join(this.uploadPath, fileName);
          
          fs.writeFileSync(filePath, file.buffer);
          
          // Full URL path return kora hocche jate frontend theke direct access kora jay
          const fileUrl = `${this.baseUrl}/uploads/${fileName}`;
          resolve(fileUrl);
        } catch (error) {
          reject(new InternalServerErrorException('Local Upload Failed'));
        }
      });
    });

    return Promise.all(uploadPromises);
  }
async uploadSingleImage(
    file: Express.Multer.File,
    folder: string = 'profiles',
  ) {
    try {
      const specificFolder = path.join(this.uploadPath, folder);
      if (!fs.existsSync(specificFolder)) {
        fs.mkdirSync(specificFolder, { recursive: true });
      }

      const publicId = uuidv4();
      const fileName = `${publicId}${path.extname(file.originalname)}`;
      const filePath = path.join(specificFolder, fileName);

      fs.writeFileSync(filePath, file.buffer);

      return { 
        url: `${this.baseUrl}/uploads/${folder}/${fileName}`, 
        public_id: publicId 
      };
    } catch (error) {
      throw new InternalServerErrorException('Local Upload Failed');
    }
  }
}