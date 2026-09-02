-- Alinear el enum `PermitStatus` con schema.prisma.
--
-- La migración original creó el tipo con `PENDING_RENEWAL` y `CANCELED` (una
-- ele). Después se añadieron `RENEWAL_DUE` y `CANCELLED` (dos eles) sin quitar
-- las viejas, así que una base recién creada acaba con OCHO valores mientras el
-- schema declara seis. Prisma lo detecta como deriva: `migrate dev` quería
-- generar esta migración él solo, y en el runner de CI eso reventaba porque es
-- un comando interactivo.
--
-- Postgres no permite quitar valores de un enum, así que se recrea el tipo. Las
-- filas que usen las grafías viejas se convierten a la nueva antes de cambiar
-- la columna; hoy no hay ninguna, pero una base de más tiempo sí podría.
ALTER TABLE "permits" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "PermitStatus" RENAME TO "PermitStatus_old";

CREATE TYPE "PermitStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'RENEWAL_DUE',
  'SUSPENDED',
  'CANCELLED'
);

ALTER TABLE "permits"
  ALTER COLUMN "status" TYPE "PermitStatus"
  USING (
    CASE "status"::text
      WHEN 'PENDING_RENEWAL' THEN 'RENEWAL_DUE'
      WHEN 'CANCELED' THEN 'CANCELLED'
      ELSE "status"::text
    END
  )::"PermitStatus";

ALTER TABLE "permits"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"PermitStatus";

DROP TYPE "PermitStatus_old";
