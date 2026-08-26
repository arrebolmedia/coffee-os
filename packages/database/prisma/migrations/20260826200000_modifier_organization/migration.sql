-- Modifier no tenía organización: el catálogo era global de facto y
-- `GET /modifiers` devolvía los 16 modificadores a cualquier tenant. Era fuga
-- teórica mientras la tabla estuvo vacía; el seed de agosto la volvió
-- observable.
--
-- La pertenencia se deriva de los productos que usan cada modificador, que sí
-- tienen organización. Verificado antes de escribir esto: los 16 pertenecen a
-- exactamente una organización, ninguno está huérfano y ninguno es compartido
-- entre dos.

ALTER TABLE "modifiers" ADD COLUMN "organization_id" TEXT;

UPDATE "modifiers" m
SET "organization_id" = sub.organization_id
FROM (
  SELECT pm."modifier_id", MIN(p."organization_id") AS organization_id
  FROM "product_modifiers" pm
  JOIN "products" p ON p."id" = pm."product_id"
  GROUP BY pm."modifier_id"
) sub
WHERE m."id" = sub."modifier_id";

-- Deliberadamente SIN valor por defecto para los huérfanos: un modificador que
-- no cuelga de ningún producto no tiene organización deducible, y elegir una al
-- azar sería inventarse el dato. En un entorno donde queden filas sin rellenar,
-- este SET NOT NULL falla y obliga a decidir a mano, que es lo correcto.
ALTER TABLE "modifiers" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "modifiers"
  ADD CONSTRAINT "modifiers_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "modifiers_organization_id_idx" ON "modifiers"("organization_id");
