-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "default_value" JSONB,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_readonly" BOOLEAN NOT NULL DEFAULT false,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "validation_rules" JSONB,
    "metadata" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting_history" (
    "id" TEXT NOT NULL,
    "setting_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "changed_by" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "setting_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setting_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settings_organization_id_idx" ON "settings"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_organization_id_category_key_key" ON "settings"("organization_id", "category", "key");

-- CreateIndex
CREATE INDEX "setting_history_setting_id_idx" ON "setting_history"("setting_id");

-- AddForeignKey
ALTER TABLE "setting_history" ADD CONSTRAINT "setting_history_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

