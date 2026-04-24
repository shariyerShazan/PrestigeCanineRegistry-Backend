/*
  Warnings:

  - Changed the type of `tier` on the `blog_litters` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BlogTier" AS ENUM ('GOLD', 'BLUE');

-- AlterTable
ALTER TABLE "blog_litters" DROP COLUMN "tier",
ADD COLUMN     "tier" "BlogTier" NOT NULL;

-- CreateTable
CREATE TABLE "blog_litter_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "litterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_litter_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_litter_images_litterId_idx" ON "blog_litter_images"("litterId");

-- AddForeignKey
ALTER TABLE "blog_litter_images" ADD CONSTRAINT "blog_litter_images_litterId_fkey" FOREIGN KEY ("litterId") REFERENCES "blog_litters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
