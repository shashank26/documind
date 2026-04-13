

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" TEXT NOT NULL,
    "document_id" TEXT,
    "total_chunks" INTEGER NOT NULL,
    "processed_chunks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "IngestionJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'COMPLETED_WITH_ERRORS');

-- AlterTable
ALTER TABLE "IngestionJob" DROP COLUMN "status",
ADD COLUMN     "status" "IngestionJobStatus" NOT NULL;
