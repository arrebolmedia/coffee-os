-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "location_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_price" DOUBLE PRECISION,
    "supplier_id" TEXT,
    "warranty_months" INTEGER,
    "warranty_expires_at" TIMESTAMP(3),
    "useful_life_years" INTEGER,
    "depreciation_method" TEXT,
    "residual_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "installation_date" TIMESTAMP(3),
    "last_maintenance_date" TIMESTAMP(3),
    "next_maintenance_date" TIMESTAMP(3),
    "notes" TEXT,
    "image_url" TEXT,
    "qr_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "work_performed" TEXT,
    "parts_replaced" TEXT[],
    "assigned_to" TEXT,
    "performed_by" TEXT,
    "labor_cost" DOUBLE PRECISION,
    "parts_cost" DOUBLE PRECISION,
    "total_cost" DOUBLE PRECISION,
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "external_provider" TEXT,
    "external_invoice" TEXT,
    "next_maintenance_date" TIMESTAMP(3),
    "recurring_interval_days" INTEGER,
    "notes" TEXT,
    "attachments" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_organization_id_idx" ON "assets"("organization_id");

-- CreateIndex
CREATE INDEX "maintenance_records_organization_id_idx" ON "maintenance_records"("organization_id");

-- CreateIndex
CREATE INDEX "maintenance_records_asset_id_idx" ON "maintenance_records"("asset_id");

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

