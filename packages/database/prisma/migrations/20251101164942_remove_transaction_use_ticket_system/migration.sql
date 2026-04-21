/*
  Warnings:

  - You are about to drop the column `transaction_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `transaction_line_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `ticket_id` on table `orders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ticket_id` on table `payments` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction_line_items" DROP CONSTRAINT "transaction_line_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction_line_items" DROP CONSTRAINT "transaction_line_items_transaction_id_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "ticket_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "transaction_id",
ALTER COLUMN "ticket_id" SET NOT NULL;

-- DropTable
DROP TABLE "transaction_line_items";

-- DropTable
DROP TABLE "transactions";

-- DropEnum
DROP TYPE "TransactionStatus";

-- CreateIndex
CREATE INDEX "orders_ticket_id_idx" ON "orders"("ticket_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
