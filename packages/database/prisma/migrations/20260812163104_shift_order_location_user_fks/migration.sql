-- Declare the foreign keys that `shifts` and `orders` were missing.
--
-- Until now `shifts` had NO foreign keys at all and `orders` had only
-- `orders_ticket_id_fkey`, so `location_id` / `user_id` were unenforced text
-- columns. Multi-tenant isolation for both tables is derived from
-- Location.organizationId, which means a dangling location_id silently makes a
-- row unreadable by every organization.
--
-- ---------------------------------------------------------------------------
-- Data fix: one orphan shift, removed before the constraint is created.
-- ---------------------------------------------------------------------------
-- Row as it existed on 2026-08-12 (full contents preserved here on purpose,
-- since the DELETE below is irreversible):
--
--   id             = cmoxfvgxv0000lqgvl3l2oihv
--   location_id    = loc-1778276356035-d63ovahg8   <-- never existed in locations
--   user_id        = cml9tug53000a12cbsvfuguer     (owner@coffeedemo.mx, demo seed)
--   shift_number   = SHIFT-1778276432514
--   status         = OPEN
--   opening_float  = 500
--   opening_cash   = 500
--   closing_cash / expected_cash / counted_cash / variance = NULL
--   total_expected / total_closing = NULL
--   opening_notes / closing_notes  = NULL
--   opened_at      = 2026-05-08T21:40:32.516Z
--   closed_at      = NULL
--
-- Deleted rather than reassigned because:
--   1. It holds no financial history — an opening float and nothing else. No
--      cash_registers row references it, and it was never closed, counted or
--      reconciled.
--   2. Its location_id is not a cuid and no row in any other table references
--      it, so that location was never persisted. There is no correct branch to
--      reassign it to; any target would be invented.
--   3. Reassigning would do active harm. The shift is still OPEN, and
--      ShiftsService.create() refuses to open a shift where an OPEN one already
--      exists at that location — so attaching this ghost to a real branch would
--      block the POS from opening a shift there. Closing it instead is worse:
--      ShiftsService.close() sums CASH payments from opened_at to now, so a
--      shift opened in May would absorb every cash sale since then into one
--      bogus variance.
--
-- Deliberately scoped to this one id instead of a blanket
-- `DELETE ... WHERE location_id NOT IN (SELECT id FROM locations)`: on any
-- other environment the ADD CONSTRAINT below should fail loudly and force a
-- human to inspect the offending rows, not silently discard shift records.
DELETE FROM "shifts" WHERE "id" = 'cmoxfvgxv0000lqgvl3l2oihv';

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
