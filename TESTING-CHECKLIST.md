# 🧪 Checklist de Pruebas - CoffeeOS

**Fecha**: 28 de Octubre, 2025  
**Objetivo**: Verificar que la solución sistemática de errores funcionó correctamente

## 📋 Preparación

- [x] Backend corriendo en puerto 4000 (modo watch)
- [x] Frontend corriendo en puerto 3001
- [x] Base de datos con seed completo:
  - [x] 3 Usuarios (owner, manager, barista)
  - [x] 1 Organización + 1 Location
  - [x] 5 Categorías de productos
  - [x] 11 Productos
  - [x] 3 Proveedores
  - [x] 5 Items de inventario
  - [x] 4 Recetas con ingredientes

## 🔐 1. Autenticación

### Login

- [ ] Abrir http://localhost:3001
- [ ] Ingresar credenciales: `owner@coffeedemo.mx` / `password123`
- [ ] Verificar login exitoso
- [ ] ✅ **Esperado**: Redirección a dashboard sin errores

## 📊 2. Dashboard

### Vista Principal

- [ ] Verificar que carga el dashboard
- [ ] Revisar consola del navegador (F12)
- [ ] ✅ **Esperado**: NO errores de "organization_id must be a UUID"
- [ ] ✅ **Esperado**: NO errores de "Unauthorized" o "Session expired"
- [ ] ✅ **Esperado**: KPIs cargan con datos reales

### Widgets Verificados

- [ ] Ventas del día
- [ ] Clientes nuevos hoy
- [ ] Inventario bajo stock
- [ ] Gráficos de tendencias

## 📝 3. Módulo Recetas

### Navegación

- [ ] Click en menú lateral → "Recetas"
- [ ] Verificar carga de página

### Lista de Recetas

- [ ] ✅ **Esperado**: Ver 4 recetas
  - Espresso Clásico
  - Americano Tradicional
  - Latte Cremoso
  - Cappuccino Italiano
- [ ] Verificar que NO aparece "categories no encontrada"
- [ ] Click en una receta para ver detalles

### Detalle de Receta

- [ ] Ver ingredientes listados
- [ ] Ver costo calculado
- [ ] Ver instrucciones de preparación
- [ ] ✅ **Esperado**: NO errores 404 en consola

## 📦 4. Módulo Proveedores

### Navegación

- [ ] Click en menú lateral → "Proveedores"
- [ ] Verificar carga de página

### Lista de Proveedores

- [ ] ✅ **Esperado**: Ver 3 proveedores
  - Café Tostadores Premium
  - Lácteos del Valle
  - Panadería Artesanal
- [ ] Verificar datos visibles:
  - Nombre del proveedor
  - Contacto
  - Email y teléfono
  - Términos de pago
  - Lead time
- [ ] ✅ **Esperado**: NO error "Cannot GET /suppliers/organization/..."

### Acciones

- [ ] Click en "Ver detalles" de un proveedor
- [ ] Intentar editar un proveedor
- [ ] Verificar botones de filtrado

## 🏪 5. Módulo Inventario

### Navegación

- [ ] Click en menú lateral → "Inventario"
- [ ] Verificar carga de página

### Lista de Items

- [ ] ✅ **Esperado**: Ver 5 items de inventario
  - Café en Grano Premium
  - Leche Entera
  - Azúcar Blanca
  - Jarabe Vainilla
  - Crema Batida
- [ ] Verificar columnas:
  - Código (INV-001, etc.)
  - Nombre
  - Unidad de medida
  - Costo por unidad
  - Par level
  - Punto de reorden

### Funcionalidad

- [ ] Verificar filtros funcionan
- [ ] Verificar búsqueda funciona
- [ ] Click en item para ver detalles

## 💰 6. Módulo Costeo

### Navegación

- [ ] Ir a cualquier producto desde POS o Productos
- [ ] Ver información de costeo

### Cálculo de Costos

- [ ] ✅ **Esperado**: Productos con receta muestran:
  - Costo de ingredientes
  - Costo total
  - Margen de ganancia
- [ ] ✅ **Esperado**: Productos SIN receta muestran valores por defecto
- [ ] ✅ **Esperado**: NO errores 404 llamando `/costing/*`

## 🔍 7. Consola del Navegador (F12)

### Verificación de Errores

- [ ] Abrir DevTools (F12)
- [ ] Tab "Console"
- [ ] Navegar por todos los módulos

### Errores que NO deben aparecer

- [ ] ❌ "organization_id must be a UUID"
- [ ] ❌ "Unauthorized" (excepto en logout intencional)
- [ ] ❌ "Session expired" (excepto después de timeout)
- [ ] ❌ "Cannot GET /api/v1/costing/..."
- [ ] ❌ "Cannot GET /suppliers/organization/..."
- [ ] ❌ Cascadas de toast notifications rojos

### Errores Aceptables (NO críticos)

- [ ] ℹ️ Warnings de desarrollo (modo dev)
- [ ] ℹ️ Console.log de debugging
- [ ] ℹ️ 404 silenciosos (sin toast) para recursos opcionales

## 🎯 8. Pruebas de Integración

### Global Interceptor

- [ ] Verificar en Network tab que requests incluyen `organization_id` en query params
- [ ] Verificar headers incluyen `X-Organization-Id`

### Error Handling Mejorado

- [ ] Errores 404/422 NO muestran toasts rojos
- [ ] Errores 401/403/500 SÍ muestran toasts
- [ ] Logs en consola son descriptivos

### Seed Data

- [ ] Todos los módulos tienen datos de prueba
- [ ] Relaciones funcionan (recetas → ingredientes)
- [ ] IDs son válidos (UUIDs/CUIDs)

## ✅ Criterios de Éxito

### Mínimo Aceptable

- [x] Login funciona
- [ ] Dashboard carga sin errores críticos
- [ ] 3+ módulos cargan datos correctamente
- [ ] NO cascadas de error toasts

### Óptimo

- [ ] TODOS los módulos cargan sin errores
- [ ] Consola limpia (solo warnings de dev)
- [ ] Navegación fluida entre módulos
- [ ] Datos seed visibles en todos los módulos

## 📝 Notas de Prueba

### Errores Encontrados

```
[Registrar aquí cualquier error que encuentres durante las pruebas]
```

### Mejoras Pendientes

```
[Lista de mejoras identificadas durante las pruebas]
```

## 🎉 Resultado Final

- [ ] ✅ TODAS las pruebas pasaron
- [ ] ⚠️ Pruebas pasaron con observaciones menores
- [ ] ❌ Fallos críticos encontrados (especificar arriba)

---

**Ejecutado por**: [Tu nombre]  
**Fecha**: ****\_\_\_****  
**Duración de pruebas**: ****\_\_\_****  
**Status**: [ ] PASS / [ ] FAIL
