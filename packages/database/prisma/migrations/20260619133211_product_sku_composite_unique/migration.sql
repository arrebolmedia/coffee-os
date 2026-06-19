-- DropIndex
DROP INDEX "products_sku_key";

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_organization_id_key" ON "products"("sku", "organization_id");
