-- Idempotencia real del descuento automático por receta.
--
-- El servicio comprobaba "¿ya se descontó esta orden?" con un COUNT fuera de
-- la transacción (check-then-act). Bajo concurrencia — doble clic del POS,
-- reintento HTTP, entrega at-least-once — dos peticiones simultáneas pasaban
-- ambas el chequeo y descontaban el stock DOS veces.
--
-- Este índice parcial hace que la segunda escritura falle con P2002 en vez de
-- duplicar el movimiento. Es la garantía que el COUNT no podía dar.
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_movements_recipe_deduction_unique"
  ON "inventory_movements" ("reference", "inventory_item_id")
  WHERE "reason" = 'RECIPE_DEDUCTION';
