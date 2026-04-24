-- CreateTable
CREATE TABLE "breeder_programs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "location" TEXT,
    "website" TEXT,
    "about" TEXT,
    "breedingPhilosophy" TEXT,
    "goals" TEXT,
    "litterPractices" TEXT,
    "screeningProcess" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "breeder_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_litters" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "breederProgramId" TEXT,
    "sireId" TEXT NOT NULL,
    "damId" TEXT NOT NULL,
    "litterSize" INTEGER NOT NULL DEFAULT 0,
    "breedId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_litters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "breeder_programs_userId_key" ON "breeder_programs"("userId");

-- AddForeignKey
ALTER TABLE "breeder_programs" ADD CONSTRAINT "breeder_programs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_litters" ADD CONSTRAINT "blog_litters_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_litters" ADD CONSTRAINT "blog_litters_breederProgramId_fkey" FOREIGN KEY ("breederProgramId") REFERENCES "breeder_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_litters" ADD CONSTRAINT "blog_litters_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "canines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_litters" ADD CONSTRAINT "blog_litters_damId_fkey" FOREIGN KEY ("damId") REFERENCES "canines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_litters" ADD CONSTRAINT "blog_litters_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "breeds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
