-- CreateTable
CREATE TABLE "waste_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "location_id" TEXT,
    "inventory_item_id" TEXT,
    "product_id" TEXT,
    "item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "cost_per_unit" DOUBLE PRECISION,
    "total_cost" DOUBLE PRECISION,
    "disposal_method" TEXT NOT NULL,
    "disposal_date" TIMESTAMP(3),
    "recorded_by" TEXT NOT NULL,
    "notes" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sustainability_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "location_id" TEXT,
    "metric_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sustainability_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sustainability_targets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "location_id" TEXT,
    "metric_type" TEXT NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "achieved_at" TIMESTAMP(3),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sustainability_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waste_logs_organization_id_idx" ON "waste_logs"("organization_id");

-- CreateIndex
CREATE INDEX "sustainability_metrics_organization_id_idx" ON "sustainability_metrics"("organization_id");

-- CreateIndex
CREATE INDEX "sustainability_targets_organization_id_idx" ON "sustainability_targets"("organization_id");

