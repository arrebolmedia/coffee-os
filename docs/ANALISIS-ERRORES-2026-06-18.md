# Análisis Interno de Errores — CoffeeOS

**Fecha:** 2026-06-18
**Método:** Auditoría multi-agente (Workflow Ultracode). 12 dimensiones en paralelo sobre todo el monorepo → verificación adversarial por hallazgo → síntesis priorizada.
**Cobertura:** 103 agentes, ~3.7M tokens, 679 tool-uses, 12 dimensiones (persistence, contract, validation, tenancy, atomicity, finance, security, deadcode, integrations, errorhandling, frontend, testquality).

## Resumen ejecutivo

| Severidad | Confirmados                              |
| --------- | ---------------------------------------- |
| CRITICAL  | 5                                        |
| HIGH      | 9                                        |
| MEDIUM    | 42                                       |
| LOW       | 16                                       |
| **Total** | **72** (de 145 candidatos; 73 refutados) |

> **Caveat de verificación.** La fase de verificación adversarial sufrió rate-limiting del API (~70 verificaciones fallaron). El default ante verificación faltante es `isReal=false`, por lo que el bucket "refutados" (73) está **contaminado con hallazgos simplemente no verificados**, no necesariamente falsos. Los 72 confirmados son los que sí pasaron verificación o no requerían verificación adversarial. Conclusión: el conteo real de errores es probablemente **mayor**, no menor. Spot-check manual posterior confirmó los 2 críticos más accionables (inventory-automation y P&L) contra el código real.

### Causa raíz dominante (consistente con auditorías previas)

1. **13 módulos backend con `Map` en memoria como única fuente de verdad** — notifications, settings, waste, maintenance, dashboards, reports, roles (permissions/userRoles), hr/onboarding, hr/certifications, hr/evaluations, twilio, mailrelay, cfdi. Todo su estado se pierde al reiniciar y los tests verdes lo enmascaran porque prueban contra el `Map`.
2. **Stubs que mienten "OK"** — endpoints/servicios que reportan éxito (`enabled:true`, `status:'stamped'`, `DELIVERED`, datos `Math.random()`) sin lógica real detrás. El frontend y los tests los consumen como si fueran funcionales → falsa confianza, riesgo fiscal/operativo.
3. **Aislamiento multi-tenant por parámetro del cliente** en módulos in-memory — `organization_id` viene del query/body (opcional en varios), no del JWT → enumeración cross-tenant posible omitiendo el parámetro.
4. **Aritmética de dinero en `Float` + IVA mezclado neto/bruto** — cálculos de P&L, márgenes y break-even mezclan revenue con IVA incluido contra COGS neto; drift de centavos por punto flotante.

---

## CRITICAL (5)

### C1 · CFDI: timbres fiscales falsos marcados como válidos ante el SAT

`apps/api/src/modules/integrations/cfdi/cfdi.service.ts:108,436-457`
El servicio marca `cfdi.status='stamped'` y construye `TimbreFiscalDigital` con UUID, SelloCFD/SelloSAT vía `generateSello()` (`Buffer.from(Math.random()...)`) y `NoCertificadoSAT` literal `'00001000000987654321'`. `getDownloadXml` exige status `'stamped'` → entrega XML "timbrado" que no existe ante el SAT.
**Fix:** Integrar PAC real, o forzar status `'mock'/'error'` visible y **bloquear** descarga/entrega de XML mientras sea mock. (Bonus testquality C5: los tests afirman `success:true`.)

### C2 · InventoryAutomationController: 18 endpoints fantasma reportando datos falsos (✓ verificado manual)

`apps/api/src/modules/inventory/inventory-automation.controller.ts:17-240`
Controller montado en producción (`inventory.module.ts:9`) con `constructor() {}` vacío, sin Prisma. `getAutoDeductConfig` devuelve `enabled:true, deduct_on_order_complete:true, send_low_stock_alerts:true` hardcodeado; `deductStockForOrder` devuelve `{ deductions:[], total_items_deducted:0 }`. El POS cree que el descuento automático de stock funciona; nunca descuenta.
**Fix:** Implementar servicio real sobre Prisma+recipes, o desmontar el controller y devolver `501` explícito; mínimo, `getAutoDeductConfig` debe reportar `enabled:false`.

### C3 · Notifications marca SENT/DELIVERED sin enviar nada

`apps/api/src/modules/notifications/notifications.service.ts:29-33, 251-261, 556-580`
5 Maps en memoria son la única fuente de verdad. `sendViaProvider` tiene Twilio/Mailrelay/Firebase **todos comentados** (solo `setTimeout(100)`), pero `sendNotification` marca `status=DELIVERED`. Cero envíos reales; historial volátil.
**Fix:** Inyectar providers reales, marcar `DELIVERED` solo tras confirmación del provider, persistir en Prisma.

### C4 · Settings con secretos cifrados sólo en `Map` en memoria

`apps/api/src/modules/settings/settings.service.ts:34-36, 68, 88`
3 Maps en memoria sin Prisma. Cifra valores `is_encrypted` con AES-256-CBC pero los guarda en RAM → toda la configuración de la organización (incluidos secretos) se pierde al reiniciar.
**Fix:** Persistir settings/history/templates en Prisma con campos cifrados.

### C5 · Tests de CFDI afirman timbrado exitoso contra un PAC 100% mock

`apps/api/src/modules/integrations/tests/cfdi.service.spec.ts:117,124,131`
Verifican `success===true`, `uuid` definido, status `'stamped'` y hasta cancelación, contra el mock de C1 → suite verde da falsa confianza fiscal.
**Fix:** Renombrar/skip las aserciones de stamp/cancel; añadir test pending que documente que se requiere PAC real.

---

## HIGH (9)

| #   | Dimensión   | Hallazgo                                                                                                            | Archivo                                                     |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| H1  | persistence | **Waste**: registros de merma y `total_cost` (dato financiero/COGS) sólo en memoria                                 | `waste/waste.service.ts:26-54`                              |
| H2  | persistence | **Maintenance**: activos (cafeteras/refris) e historial sólo en memoria                                             | `maintenance/maintenance.service.ts:28-29`                  |
| H3  | persistence | **Dashboards**: 5 Maps (dashboards/alerts/favorites/snapshots/systemKPIs) volátiles                                 | `dashboards/dashboards.service.ts:46-50`                    |
| H4  | deadcode    | `getAutoDeductConfig` miente `enabled=true` sin lógica de descuento detrás                                          | `inventory-automation.controller.ts:97-107`                 |
| H5  | deadcode    | `completeChecklist` descarta respuestas si no hay TaskRun IN_PROGRESS pero devuelve "guardado"                      | `quality/checklists.service.ts:142-203`                     |
| H6  | deadcode    | `ReportsService.generateGenericData`/`exportReport` devuelven `Math.random()` y URLs ficticias como reportes reales | `reports/reports.service.ts:304-332`                        |
| H7  | testquality | Suite CRUD de products entera en `describe.skip` — sólo corre "should be defined"                                   | `products/tests/products.service.spec.ts`                   |
| H8  | testquality | Tests de notifications afirman `DELIVERED` sin envío real                                                           | `notifications/tests/notifications.service.spec.ts:380,449` |
| H9  | testquality | Sin test API del path de dinero `closeTicket`/payment/refund                                                        | `test/integration/sale-integration.e2e-spec.ts`             |

---

## MEDIUM (42) — agrupados por dimensión

**Finanzas (8)** — la mayor concentración de riesgo de dinero:

- **P&L revenue usa `Ticket.total` (IVA incluido) vs COGS neto** → margen bruto distorsionado (`finance/pnl.service.ts:54-93`). _(✓ verificado manual)_
- Break-even divide por `(1 - variableCostRatio)` con revenue IVA-incluido → punto de equilibrio incorrecto (`pnl.service.ts:166-178`).
- `calculateMultipleTaxes` suma impuestos ad-valorem sobre la misma base → riesgo de doble IVA (`taxes/taxes.service.ts:97-120`).
- Discounts: flag `stackable` persistido pero `calculateDiscount` no combina ni topa la suma (`discounts/discounts.service.ts:293-343`).
- Loyalty hardcodeada $50 a 9 puntos, sin config ni validación/decremento server-side (`pos-web/components/pos/PaymentModal.tsx:49-51`).
- Aritmética `Float` en todo el dinero; redondeo sólo al output de P&L → drift de centavos (`pos/pos.service.ts:128-147`, `cart.store.ts:223-242`).
- `getCostBreakdown` con overhead 12% / packaging $2.50 / labor 20% hardcodeados en COGS (`pos-web/services/costing.service.ts:175-184`).
- Expense `totalAmount = amount + tax_amount` sin validar `amount>0` ni banda de IVA (`finance/expenses.service.ts:45,130-137`).

**Atomicidad (5):** `shifts.close` check-then-act fuera de transacción (double-close); `roles.assignRole`/`revokeRole` racy en memoria; `loyalty.redeemPoints` no aplica `maxRedemptionsPerCustomer`; `cash-registers.remove` 3 deletes sin `$transaction`; `products.create` unique check per-org vs constraint global → 500 en vez de 409.

**Deadcode (5):** `settings.service.old.ts`/`.controller.old.ts`/`.spec.old.ts` muertos; módulos comentados en `app.module.ts` (Transactions/Payments/GraphQL); `getPaymentMethods` hardcodeado ignora la org; `DashboardsService.getWidgetData` todo `not_implemented`.

**Integraciones (3):** Notifications nunca inyecta providers; CFDI XML usa formato ISO en vez de SAT y `sello` con `Math.random()` (inválido aun con PAC); webhook Twilio sin validación de firma `X-Twilio-Signature`.

**Error handling (5):** Analytics 3× `catch {}` que devuelven 0/null silencioso (`analytics/dashboard.service.ts`); `recipes.getCategories` devuelve categorías hardcodeadas ante error; inventory page traga errores de guardar/eliminar sin toast; notifications batch `catch {}` pierde causa; costing/inventory-automation devuelven `[]` ocultando fallos.

**Tenancy (2) / Security (1):** filtro `organization_id` opcional desde cliente → enumeración global omitiendo el parámetro; in-memory confía en org del cliente, no del JWT.

**Validation (2):** `@IsUUID()` en `QuerySettingsDto`/`QueryWasteLogsDto` rompe filtrado (400 con cuid); CFDI `tipoFactor` validado `/^\d{6}$/` pero SAT espera `Tasa|Cuota|Exento` → rechaza todo CFDI válido.

**Frontend (3):** `costing` `avgMargin` = reduce/length sin guardia → `NaN`; analytics HR/Inventory pintan datos mock como métricas reales; `attendance` página entera con mock hardcodeado.

**Persistencia/testquality (8 restantes):** IDs con `Date.now()+Math.random()`; aislamiento in-memory sin persistir; controller specs sólo verifican delegación; `discounts.spec` skip del cap; módulos in-memory probados sólo contra Maps; `db.test.ts` (offline POS) skip de Orders/Sync Queue; etc.

---

## LOW (16) — resumen

Principalmente guardas defensivas de UI que producen `NaN`/`Invalid Date` (`locations.tax_rate*100`, `closeCashRegister` `difference`, `customers.createdAt`, `formatDate`, `analytics/inventory` avgRotation), TTL de JWT de 7d sin revocación, `returns` hardcodeado a 0 en P&L (refunds no restan), `tip` en el contrato pero nunca capturado, DTOs muertos (`products/dto/modifier.dto.ts`), `users.service` change-password TODO, y onboarding lanzando `Error` genérico (500 en vez de 404).

---

## Top 10 acciones priorizadas

| #   | Acción                                                                                                                        | Severidad | Esfuerzo                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------- |
| 1   | **CFDI**: bloquear descarga/entrega de XML mientras sea mock (status `'mock'` visible) + integrar PAC real                    | C1/C5     | M (gate inmediato) / L (PAC) |
| 2   | **inventory-automation**: `getAutoDeductConfig → enabled:false` (o implementar descuento real); o desmontar con `501`         | C2/H4     | S (gate) / L (real)          |
| 3   | **Notifications**: no marcar `DELIVERED` sin envío; inyectar Mailrelay/Twilio reales + persistir Prisma                       | C3/H8     | M                            |
| 4   | **Settings**: migrar a Prisma (secretos cifrados no pueden vivir en RAM)                                                      | C4        | M                            |
| 5   | **P&L/Finanzas**: usar `subtotal` (neto) para revenue, margen y break-even; redondear dinero a 2 decimales antes de persistir | MED ×8    | M                            |
| 6   | **Persistencia**: migrar Waste + Maintenance + Dashboards a Prisma (datos financieros/operativos volátiles)                   | H1/H2/H3  | L                            |
| 7   | **Tenancy/Security**: derivar `organizationId` del JWT en módulos in-memory; org obligatoria, no filtro opcional              | MED/SEC   | M (al migrar)                |
| 8   | **Validation**: `@IsUUID()→@IsString()` en query DTOs in-memory; `tipoFactor → @IsIn(['Tasa','Cuota','Exento'])`              | MED ×2    | S                            |
| 9   | **Tests de dinero**: e2e real-DB de closeTicket (cash+MIXED, change, idempotencia) + refund que restaura `currentStock`       | H9        | M                            |
| 10  | **Limpieza**: borrar `*.old.ts`, DTOs muertos, módulos comentados; logear los `catch {}` vacíos                               | MED/LOW   | S                            |

## Nota de método

`tsc` + tests unitarios con Prisma mockeado **no** detectan estos errores (wiring desconectado, contratos, persistencia, stubs que mienten). Confirmado de nuevo: se requiere verificación contra rutas vivas y suites de integración real-DB. Los 13 módulos in-memory y los stubs CFDI/inventory-automation son la deuda estructural pendiente — ninguno es bug nuevo introducido esta sesión, pero varios (CFDI fiscal, auto-deduct) tienen impacto de producción real.
