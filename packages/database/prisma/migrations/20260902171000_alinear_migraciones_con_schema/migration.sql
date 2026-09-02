-- Poner las migraciones al dia con schema.prisma.
--
-- El historial de migraciones NO reproducia el schema: una base recien creada
-- salia con `inventory_movements.location_id` y `recipes.product_id`
-- obligatorios donde el schema los declara opcionales, y sin el indice de
-- `permits.location_id`. O sea que mi portatil y un despliegue limpio tenian
-- bases distintas, y una insercion que el cliente permite habria reventado en
-- el segundo.
--
-- Salio al arreglar el job de integracion del CI: `prisma migrate dev` detecta
-- la deriva y quiere generar la migracion el solo, cosa que no puede hacer en
-- un runner porque es interactivo. Generado con `prisma migrate diff`.

-- DropForeignKey
ALTER TABLE "inventory_movements" DROP CONSTRAINT IF EXISTS "inventory_movements_location_id_fkey";
-- AlterTable
ALTER TABLE "inventory_movements" ALTER COLUMN "location_id" DROP NOT NULL;
-- AlterTable
ALTER TABLE "recipes" ALTER COLUMN "product_id" DROP NOT NULL;
-- CreateIndex
CREATE INDEX IF NOT EXISTS "permits_location_id_idx" ON "permits"("location_id");
-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
