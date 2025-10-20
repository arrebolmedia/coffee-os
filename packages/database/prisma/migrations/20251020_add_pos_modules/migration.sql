-- CreateEnum para los nuevos tipos
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKE_OUT', 'DELIVERY');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y');
CREATE TYPE "TaxCategory" AS ENUM ('IVA', 'IEPS', 'ISR', 'OTHER');
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- ========================================
-- ORDERS & KITCHEN MANAGEMENT
-- ========================================

-- CreateTable: orders
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "user_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "order_number" TEXT NOT NULL,
    "type" "OrderType" NOT NULL DEFAULT 'DINE_IN',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "table_number" TEXT,
    "customer_name" TEXT,
    "prep_time_estimate" INTEGER,
    "prep_time_actual" INTEGER,
    "notes" TEXT,
    "special_requests" TEXT,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "served_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_items
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- DISCOUNTS & PROMOTIONS
-- ========================================

-- CreateTable: discounts
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "percentage" DOUBLE PRECISION,
    "fixed_amount" DOUBLE PRECISION,
    "buy_quantity" INTEGER,
    "get_quantity" INTEGER,
    "applicable_to" TEXT NOT NULL DEFAULT 'total',
    "product_ids" TEXT[],
    "category_ids" TEXT[],
    "min_purchase" DOUBLE PRECISION,
    "max_uses" INTEGER,
    "max_uses_per_user" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- TAX CONFIGURATION
-- ========================================

-- CreateTable: taxes
CREATE TABLE "taxes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaxCategory" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "applicable_to" TEXT NOT NULL DEFAULT 'all',
    "product_ids" TEXT[],
    "category_ids" TEXT[],
    "included" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- SHIFT MANAGEMENT
-- ========================================

-- CreateTable: shifts
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shift_number" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "opening_float" DOUBLE PRECISION NOT NULL,
    "expected_cash" DOUBLE PRECISION,
    "counted_cash" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "opening_notes" TEXT,
    "closing_notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- CASH REGISTER & RECONCILIATION
-- ========================================

-- CreateTable: cash_registers
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "expected_cash" DOUBLE PRECISION NOT NULL,
    "counted_cash" DOUBLE PRECISION,
    "total_expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cash_denominations
CREATE TABLE "cash_denominations" (
    "id" TEXT NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "denomination" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_denominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cash_expenses
CREATE TABLE "cash_expenses" (
    "id" TEXT NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "recipient" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_expenses_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- UNIQUE CONSTRAINTS
-- ========================================

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE INDEX "orders_location_id_idx" ON "orders"("location_id");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_ordered_at_idx" ON "orders"("ordered_at");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_code_key" ON "discounts"("code");
CREATE INDEX "discounts_code_idx" ON "discounts"("code");
CREATE INDEX "discounts_active_idx" ON "discounts"("active");
CREATE INDEX "discounts_organization_id_idx" ON "discounts"("organization_id");

-- CreateIndex
CREATE INDEX "taxes_organization_id_idx" ON "taxes"("organization_id");
CREATE INDEX "taxes_category_idx" ON "taxes"("category");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_shift_number_key" ON "shifts"("shift_number");
CREATE INDEX "shifts_location_id_idx" ON "shifts"("location_id");
CREATE INDEX "shifts_user_id_idx" ON "shifts"("user_id");
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "cash_registers_shift_id_idx" ON "cash_registers"("shift_id");
CREATE INDEX "cash_registers_location_id_idx" ON "cash_registers"("location_id");

-- CreateIndex
CREATE INDEX "cash_denominations_cash_register_id_idx" ON "cash_denominations"("cash_register_id");

-- CreateIndex
CREATE INDEX "cash_expenses_cash_register_id_idx" ON "cash_expenses"("cash_register_id");

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

-- AddForeignKey: order_items -> orders
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" 
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cash_registers -> shifts
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_shift_id_fkey" 
    FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cash_denominations -> cash_registers
ALTER TABLE "cash_denominations" ADD CONSTRAINT "cash_denominations_cash_register_id_fkey" 
    FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cash_expenses -> cash_registers
ALTER TABLE "cash_expenses" ADD CONSTRAINT "cash_expenses_cash_register_id_fkey" 
    FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
