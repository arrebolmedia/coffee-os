/*
  Warnings:

  - Added the required column `updated_at` to the `recipe_ingredients` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CostingStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETE');

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "costing_status" "CostingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "current_stock" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "recipe_ingredients" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_costed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "total_cost" DOUBLE PRECISION,
ADD COLUMN     "unit_cost" DOUBLE PRECISION,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "costing_status" "CostingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "last_costed_at" TIMESTAMP(3),
ADD COLUMN     "ready_for_pos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0;
