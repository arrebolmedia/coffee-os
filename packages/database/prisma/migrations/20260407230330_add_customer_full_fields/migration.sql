/*
  Warnings:

  - You are about to drop the column `birthday` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `last_visit` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `rfm_bucket` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `visit_count` on the `customers` table. All the data in the column will be lost.
  - Added the required column `organization_id` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "birthday",
DROP COLUMN "last_visit",
DROP COLUMN "preferences",
DROP COLUMN "rfm_bucket",
DROP COLUMN "visit_count",
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "blocked_reason" TEXT,
ADD COLUMN     "consent_date" TIMESTAMP(3),
ADD COLUMN     "consent_email" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent_ip_address" TEXT,
ADD COLUMN     "consent_marketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent_sms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent_whatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "dietary_restrictions" TEXT,
ADD COLUMN     "favorite_drink" TEXT,
ADD COLUMN     "frequency_score" INTEGER,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "last_visit_date" TIMESTAMP(3),
ADD COLUMN     "monetary_score" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "preferred_language" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "recency_score" INTEGER,
ADD COLUMN     "rfm_segment" TEXT,
ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "total_visits" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
