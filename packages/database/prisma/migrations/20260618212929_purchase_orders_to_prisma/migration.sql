-- AlterEnum
BEGIN;
CREATE TYPE "PurchaseOrderStatus_new" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
ALTER TABLE "purchase_orders" ALTER COLUMN "status" TYPE "PurchaseOrderStatus_new" USING ("status"::text::"PurchaseOrderStatus_new");
ALTER TYPE "PurchaseOrderStatus" RENAME TO "PurchaseOrderStatus_old";
ALTER TYPE "PurchaseOrderStatus_new" RENAME TO "PurchaseOrderStatus";
DROP TYPE "PurchaseOrderStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "requested_by" TEXT,
ALTER COLUMN "location_id" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "order_date" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "quantity_ordered" DOUBLE PRECISION NOT NULL,
    "quantity_received" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

