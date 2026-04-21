/*
  Warnings:

  - A unique constraint covering the columns `[code,organization_id]` on the table `inventory_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organization_id` to the `inventory_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `suppliers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETED';

-- DropIndex
DROP INDEX "inventory_items_code_key";

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "organization_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "organization_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_code_organization_id_key" ON "inventory_items"("code", "organization_id");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
