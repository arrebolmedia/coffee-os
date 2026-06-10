-- Add PermitType enum
CREATE TYPE "PermitType" AS ENUM (
  'USO_SUELO',
  'FUNCIONAMIENTO',
  'PROTECCION_CIVIL',
  'ANUNCIO',
  'SALUBRIDAD',
  'BOMBEROS',
  'ECOLOGIA',
  'ALCOHOL',
  'IMSS',
  'SAT',
  'INFONAVIT',
  'STPS',
  'OTHER'
);

-- Extend PermitStatus enum with new values
-- PostgreSQL requires new enum values to be committed before use in the same transaction,
-- so data migration using these new values is done after commit (in later ALTER steps).
ALTER TYPE "PermitStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "PermitStatus" ADD VALUE IF NOT EXISTS 'RENEWAL_DUE';
ALTER TYPE "PermitStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Create ExpenseCategory enum
CREATE TYPE "ExpenseCategory" AS ENUM (
  'RENT',
  'UTILITIES',
  'LABOR',
  'SUPPLIES',
  'MARKETING',
  'EQUIPMENT',
  'INSURANCE',
  'TAXES',
  'PROFESSIONAL_SERVICES',
  'PERMITS_LICENSES',
  'WASTE_MANAGEMENT',
  'SECURITY',
  'OTHER'
);

-- Create ExpenseStatus enum
CREATE TYPE "ExpenseStatus" AS ENUM (
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

-- Create ExpensePaymentMethod enum
CREATE TYPE "ExpensePaymentMethod" AS ENUM (
  'CASH',
  'TRANSFER',
  'CHECK',
  'CARD',
  'CREDIT'
);

-- Create expenses table
CREATE TABLE "expenses" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "category" "ExpenseCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "tax_amount" DOUBLE PRECISION,
  "total_amount" DOUBLE PRECISION NOT NULL,
  "due_date" TIMESTAMP(3),
  "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
  "vendor_name" TEXT,
  "vendor_rfc" TEXT,
  "invoice_number" TEXT,
  "payment_method" "ExpensePaymentMethod",
  "paid_date" TIMESTAMP(3),
  "payment_reference" TEXT,
  "attachment_url" TEXT,
  "notes" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- Create indexes for expenses
CREATE INDEX "expenses_organization_id_idx" ON "expenses"("organization_id");
CREATE INDEX "expenses_location_id_idx" ON "expenses"("location_id");
CREATE INDEX "expenses_status_idx" ON "expenses"("status");
CREATE INDEX "expenses_due_date_idx" ON "expenses"("due_date");

-- Add FK constraints for expenses
ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend permits table with new columns
ALTER TABLE "permits"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT,
  ADD COLUMN IF NOT EXISTS "type" "PermitType",
  ADD COLUMN IF NOT EXISTS "last_renewal_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "renewal_cost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "renewal_frequency" TEXT,
  ADD COLUMN IF NOT EXISTS "responsible_person" TEXT,
  ADD COLUMN IF NOT EXISTS "document_url" TEXT;

-- Set organization_id from location's organization for existing rows
UPDATE "permits" p
SET organization_id = l.organization_id
FROM "locations" l
WHERE p.location_id = l.id AND p.organization_id IS NULL;

-- Make permit_number NOT NULL (was nullable)
UPDATE "permits" SET "permit_number" = 'N/A' WHERE "permit_number" IS NULL;
ALTER TABLE "permits" ALTER COLUMN "permit_number" SET NOT NULL;

-- Set type for existing rows then make NOT NULL
UPDATE "permits" SET "type" = 'OTHER' WHERE "type" IS NULL;
ALTER TABLE "permits" ALTER COLUMN "type" SET NOT NULL;

-- Make organization_id NOT NULL and add FK
ALTER TABLE "permits" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "permits"
  ADD CONSTRAINT "permits_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes for permits
CREATE INDEX IF NOT EXISTS "permits_organization_id_idx" ON "permits"("organization_id");
CREATE INDEX IF NOT EXISTS "permits_expiry_date_idx" ON "permits"("expiry_date");
