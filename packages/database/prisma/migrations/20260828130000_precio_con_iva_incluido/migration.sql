-- En Mexico el precio exhibido al publico YA incluye el IVA.
--
-- Lo obliga el articulo 7 bis de la Ley Federal de Proteccion al Consumidor: el
-- precio que se muestra tiene que ser el total que paga el cliente. El sistema
-- tenia el caso mexicano como la excepcion —`tax_included` por defecto en
-- false— asi que sumaba el 16 % ENCIMA del precio de la carta. Un Affogato
-- rotulado en $78 se cobraba en $90.48.
--
-- Dos cambios:
--
-- 1. El valor por defecto pasa a true, que es lo normal aqui. Un producto nuevo
--    nace con el precio de carta.
-- 2. Los productos que ya existen se marcan como con IVA incluido. Sus precios
--    se cargaron como precios de carta —$78 el Affogato, $62 el Capuchino, $25
--    la Concha—, no como bases gravables, asi que interpretarlos con el IVA por
--    fuera es lo que estaba mal.
--
-- Efecto: lo que se cobra baja al precio exhibido. El IVA no desaparece, se
-- extrae del precio en vez de sumarse: de $78 salen $67.24 de base y $10.76 de
-- IVA. La recaudacion por venta baja porque antes se estaba cobrando de mas.

ALTER TABLE "products" ALTER COLUMN "tax_included" SET DEFAULT true;

UPDATE "products" SET "tax_included" = true WHERE "tax_included" = false;
