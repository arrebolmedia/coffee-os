-- Clave de idempotencia para el reenvio de ventas offline.
--
-- La cola de sincronizacion reintenta un item que fallo. Si el servidor creo
-- el ticket pero la respuesta se perdio —la red cae justo despues, o expira el
-- timeout—, el cliente no distingue "no se creo" de "se creo y no me entere",
-- y al reintentar cobraba la venta dos veces. El numero de ticket lo genera el
-- servidor, asi que no habia forma de deduplicar.
--
-- El cliente genera este id una vez, al encolar, y lo reenvia igual en cada
-- reintento. El indice unico es la garantia: dos reintentos concurrentes no
-- pueden crear dos tickets, gane quien gane la carrera.
--
-- NULL para todo lo existente y para cualquier cliente que no lo mande: un
-- indice unico en Postgres admite varios NULL.

ALTER TABLE "tickets" ADD COLUMN "client_request_id" TEXT;

CREATE UNIQUE INDEX "tickets_client_request_id_key"
  ON "tickets"("client_request_id");
