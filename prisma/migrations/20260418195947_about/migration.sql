/*
  Warnings:

  - You are about to drop the column `about` on the `breeder_programs` table. All the data in the column will be lost.
  - You are about to drop the column `breedingPhilosophy` on the `breeder_programs` table. All the data in the column will be lost.
  - You are about to drop the column `goals` on the `breeder_programs` table. All the data in the column will be lost.
  - You are about to drop the column `litterPractices` on the `breeder_programs` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `breeder_programs` table. All the data in the column will be lost.
  - You are about to drop the column `screeningProcess` on the `breeder_programs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "blog_litters" ADD COLUMN     "isComing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "breeder_programs" DROP COLUMN "about",
DROP COLUMN "breedingPhilosophy",
DROP COLUMN "goals",
DROP COLUMN "litterPractices",
DROP COLUMN "logoUrl",
DROP COLUMN "screeningProcess",
ADD COLUMN     "aboutIntro" TEXT,
ADD COLUMN     "aboutOutro" TEXT,
ADD COLUMN     "aboutPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "goalsIntro" TEXT,
ADD COLUMN     "goalsOutro" TEXT,
ADD COLUMN     "goalsPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "litterIntro" TEXT,
ADD COLUMN     "litterOutro" TEXT,
ADD COLUMN     "litterPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "philosophyIntro" TEXT,
ADD COLUMN     "philosophyOutro" TEXT,
ADD COLUMN     "philosophyPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "screeningIntro" TEXT,
ADD COLUMN     "screeningOutro" TEXT,
ADD COLUMN     "screeningPoints" TEXT[] DEFAULT ARRAY[]::TEXT[];
