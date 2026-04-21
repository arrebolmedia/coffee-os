# Scripts de Verificación - CoffeeOS

Este directorio contiene scripts para verificar el estado del sistema CoffeeOS.

---

## 📋 Scripts Disponibles

### 1. `health-check.ps1` - Verificación Completa

**Tiempo:** ~60 segundos  
**Propósito:** Verificación exhaustiva de todos los componentes del sistema

**Qué verifica:**

- ✅ Infraestructura (Node.js, npm, PostgreSQL)
- ✅ Servicios (Backend, Frontend)
- ✅ Conectividad API y CORS
- ✅ Base de datos (Productos, Categorías, Organizaciones)
- ✅ Integración Productos-Recetas
- ✅ Endpoints principales
- ✅ Frontend (páginas principales)
- ✅ Archivos y configuración
- ✅ Módulos del sistema
- ✅ Dependencias

**Uso:**

```powershell
cd C:\Projects\CoffeeOS
.\scripts\health-check.ps1
```

**Salida:**

```
╔════════════════════════════════════════════════════════════╗
║         COFFEEOS - HEALTH CHECK INTEGRAL                  ║
╚════════════════════════════════════════════════════════════╝

═══ 1. INFRAESTRUCTURA ═══
[Node.js] ✅ PASS
[npm] ✅ PASS
...

📊 Score: 87.5% ⭐⭐
🔍 Estado General: REQUIERE ATENCIÓN ⚠️
```

**Códigos de salida:**

- `0` - Todos los tests pasaron
- `1` - Requiere atención (1-3 fallos)
- `2` - Sistema con problemas (4+ fallos)

---

### 2. `quick-check.ps1` - Verificación Rápida

**Tiempo:** ~5 segundos  
**Propósito:** Verificación rápida de componentes críticos

**Qué verifica:**

- ✅ Backend corriendo en puerto 4000
- ✅ Frontend corriendo en puerto 3001
- ✅ PostgreSQL corriendo en puerto 5434
- ✅ API Health endpoint respondiendo
- ✅ Products API funcional
- ✅ Frontend POS accesible

**Uso:**

```powershell
cd C:\Projects\CoffeeOS
.\scripts\quick-check.ps1
```

**Salida:**

```
⚡ QUICK HEALTH CHECK
══════════════════════════════════════

Backend API:      ✅ Running (port 4000)
Frontend POS:     ✅ Running (port 3001)
PostgreSQL:       ✅ Running (port 5434)
API Health:       ✅ Responding
Products API:     ✅ 17 products
Frontend Access:  ✅ POS accessible

══════════════════════════════════════
✅ ALL SYSTEMS OPERATIONAL (6/6)
Ready for development! 🚀
```

**Códigos de salida:**

- `0` - Todos los sistemas operacionales
- `1` - Al menos un sistema tiene problemas

---

## 🔄 Cuándo usar cada script

### Usa `quick-check.ps1` cuando:

- ✅ Inicias tu día de desarrollo
- ✅ Después de reiniciar servicios
- ✅ Antes de hacer un commit
- ✅ Quieres verificar que todo está corriendo
- ✅ Necesitas una respuesta rápida

### Usa `health-check.ps1` cuando:

- 🔍 Algo no está funcionando correctamente
- 🔍 Después de cambios importantes en la arquitectura
- 🔍 Antes de hacer deploy
- 🔍 Necesitas un diagnóstico completo
- 🔍 Quieres documentar el estado del sistema

---

## 🎯 Integración con CI/CD

Estos scripts pueden integrarse en pipelines de CI/CD:

### GitHub Actions

```yaml
- name: Health Check
  run: |
    pwsh -File scripts/health-check.ps1
  shell: pwsh
```

### Pre-commit Hook

```bash
#!/bin/sh
pwsh -File scripts/quick-check.ps1
if [ $? -ne 0 ]; then
    echo "⚠️  Sistema no está completamente operacional"
    echo "Ejecuta: ./scripts/health-check.ps1 para más detalles"
    exit 1
fi
```

---

## 📊 Interpretación de Resultados

### Health Check Score

| Rango   | Calificación | Estado    | Acción                 |
| ------- | ------------ | --------- | ---------------------- |
| 90-100% | ⭐⭐⭐       | Excelente | Ninguna                |
| 70-89%  | ⭐⭐         | Bueno     | Revisar advertencias   |
| 50-69%  | ⭐           | Regular   | Acción inmediata       |
| < 50%   | ❌           | Crítico   | Sistema no operacional |

### Íconos de Estado

- ✅ **PASS** - Test exitoso, funcionalidad operativa
- ❌ **FAIL** - Test fallido, requiere corrección inmediata
- ⚠️ **WARN** - Advertencia, funcionalidad parcial o no crítica
- ⏭️ **SKIPPED** - Test omitido (dependencia no disponible)

---

## 🛠️ Troubleshooting

### Script no se ejecuta

```powershell
# Verificar política de ejecución
Get-ExecutionPolicy

# Cambiar si es necesario (como administrador)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Errores de permisos

```powershell
# Ejecutar como administrador
Start-Process powershell -Verb RunAs -ArgumentList "-File", "scripts\health-check.ps1"
```

### Timeouts

Si los tests fallan por timeout, puede ser porque los servicios están lentos:

- Incrementa el timeout en el script (línea `TimeoutSec`)
- Verifica que tu máquina no esté sobrecargada
- Reinicia los servicios

---

## 📝 Personalización

### Agregar un nuevo test

Edita `health-check.ps1` y agrega:

```powershell
Test-Check -Name "Mi Test" -Test {
    # Tu lógica de validación aquí
    # Debe retornar $true o $false
    $result = Test-Something
    $result -eq "esperado"
} -SuccessMessage "Test pasó" -FailMessage "Test falló" -Critical $true
```

Parámetros:

- `Name` - Nombre del test (se muestra en output)
- `Test` - ScriptBlock con la lógica de validación
- `SuccessMessage` - Mensaje si el test pasa
- `FailMessage` - Mensaje si el test falla
- `Critical` - `$true` cuenta como FAIL, `$false` cuenta como WARN

---

## 📚 Documentación Relacionada

- [Plan de Verificación Completo](../docs/VERIFICATION-PLAN.md) - Detalles de cada categoría
- [README Principal](../README.md) - Información general del proyecto
- [Guía de Desarrollo](../docs/DEVELOPMENT.md) - Configuración del entorno

---

## 🔄 Actualizaciones

### v1.0.0 - 27 de Octubre, 2025

- ✅ Health check completo con 10 categorías
- ✅ Quick check para verificación rápida
- ✅ Documentación completa
- ✅ Integración con CI/CD

### Próximas mejoras planeadas

- [ ] Test de performance (tiempo de respuesta)
- [ ] Test de memoria y CPU usage
- [ ] Test de integridad de datos
- [ ] Alertas automáticas vía email/Slack
- [ ] Dashboard web con histórico

---

### 4. `run-integration-tests.ps1` - Tests E2E Automatizados ⭐ NUEVO

**Tiempo:** ~2-5 minutos  
**Propósito:** Ejecuta tests automatizados que verifican el sistema relacional completo

**Qué verifica:**

- 🔄 Flujo completo de venta con side effects en todos los módulos
- 📦 Deducción automática de inventario
- 💰 Registro financiero automático (P&L)
- 📊 Actualización de analytics en tiempo real
- 🔐 Autenticación y autorización
- ⚡ Transacciones atómicas (rollback en caso de error)
- 🏃 Concurrencia sin race conditions
- 📥 Flujo de recepción de inventario
- 🗑️ Flujo de mermas con impacto financiero

**Uso:**

```powershell
cd C:\Projects\CoffeeOS

# Todos los tests
.\scripts\run-integration-tests.ps1

# Suite específica
.\scripts\run-integration-tests.ps1 sale       # Flujo de ventas
.\scripts\run-integration-tests.ps1 inventory  # Gestión de inventario
.\scripts\run-integration-tests.ps1 finance    # Transacciones financieras
.\scripts\run-integration-tests.ps1 auth       # Autenticación
```

**Salida:**

```
╔════════════════════════════════════════════════════════════╗
║      COFFEEOS - INTEGRATION TESTS RUNNER                  ║
╚════════════════════════════════════════════════════════════╝

📋 Pre-check: Verificando servicios...
✅ Servicios verificados

🎯 Ejecutando suite: sale

📊 Suite: Complete Sale Flow

 PASS  test/integration/sale-integration.e2e-spec.ts
  Sale Integration Flow (e2e)
    Complete Sale Flow
      ✓ should process a sale and affect all related modules (1234ms)
      ✓ should rollback transaction if inventory is insufficient (456ms)
      ✓ should handle concurrent sales without race conditions (2345ms)
    Inventory Receipt Flow
      ✓ should receive inventory and affect finance (789ms)
    Waste Flow
      ✓ should record waste and impact finance and analytics (567ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total

✅ TODOS LOS TESTS PASARON
   El sistema relacional está funcionando correctamente
```

**Requisitos previos:**

- ✅ Backend corriendo en puerto 4000
- ✅ PostgreSQL corriendo en puerto 5434
- ✅ Base de datos de test configurada

**Códigos de salida:**

- `0` - Todos los tests pasaron
- `1` - Algunos tests fallaron

**Suites disponibles:**

- `sale` - Flujo completo de ventas con impactos en múltiples módulos
- `inventory` - Gestión de inventario (recepción, ajustes, mermas)
- `finance` - Transacciones financieras y P&L
- `auth` - Autenticación y autorización

---

## 🧪 Testing del Sistema Relacional

CoffeeOS es un **sistema completamente integrado** donde cada acción tiene efectos en cascada:

```
VENTA EN POS
    ↓
├─→ AUTH (valida usuario, permisos)
├─→ INVENTORY (deduce stock automáticamente)
├─→ RECIPES (calcula costeo)
├─→ FINANCE (registra ingreso, actualiza P&L)
├─→ ANALYTICS (actualiza métricas)
├─→ CRM (suma puntos de lealtad)
└─→ SUPPLIERS (evalúa punto de reorden)
```

Los integration tests verifican que TODOS estos efectos ocurran correctamente.

### Ejemplo: Test de Venta Completa

```typescript
it('should process a sale and affect all related modules', async () => {
  // 1. Crear orden (venta de 2 Americanos)
  const order = await createOrder({
    items: [{ productId: americano.id, quantity: 2 }],
    payment: { method: 'cash', amount: 80 },
  });

  // 2. Verificar deducción de inventario
  expect(stockCoffee.after).toBe(stockCoffee.before - 36); // 18g x 2
  expect(stockWater.after).toBe(stockWater.before - 360); // 180ml x 2

  // 3. Verificar registro financiero
  expect(financeTransaction.amount).toBe(80);
  expect(financeTransaction.type).toBe('revenue');

  // 4. Verificar cálculo de margen
  expect(costAnalysis.totalCost).toBe(5.76); // $2.88 x 2
  expect(costAnalysis.margin).toBe(74.24); // $80 - $5.76
  expect(costAnalysis.marginPercentage).toBe(92.8);

  // 5. Verificar analytics actualizados
  expect(analytics.dailySales).toBeGreaterThanOrEqual(80);
  expect(analytics.orderCount).toBeGreaterThanOrEqual(1);
});
```

Ver documentación completa en [SYSTEM-ARCHITECTURE.md](../docs/SYSTEM-ARCHITECTURE.md)

---

**Mantenido por:** Development Team  
**Última actualización:** 27 de Octubre, 2025
