# CoffeeOS - Mapeo de Errores y Soluciones

## ✅ Cambios Implementados

### 1. Interceptor Global de organization_id

**Archivo**: `apps/pos-web/src/lib/api.ts`

- ✅ Agrega automáticamente `organization_id` a todas las peticiones GET
- ✅ Solo lo agrega si NO está presente en la URL
- ✅ También envía en headers (`X-Organization-Id`)

### 2. Manejo de Errores Mejorado

**Archivo**: `apps/pos-web/src/lib/api.ts`

- ✅ No muestra toasts para errores 404 (recurso no encontrado)
- ✅ No muestra toasts para errores 422 (validación)
- ✅ Solo muestra toasts para errores críticos (401, 403, 500)
- ✅ Reduce cascadas de notificaciones de error

### 3. Endpoints Corregidos

#### Dashboard

- ✅ `/analytics/dashboard` - Ahora envía `organization_id` en query params

#### Auth

- ✅ `/auth/login` - Corregida la URL duplicada `/api/v1/api/v1`

#### Costing

- ✅ Servicio actualizado para usar `/recipes` en lugar de `/costing`
- ✅ Maneja productos sin receta sin fallar

---

## 🔍 Errores Pendientes por Módulo

### Recetas (Recipes)

**Errores vistos**:

- ❌ "Receta categories no encontrada"
- ❌ "Recurso no encontrado"

**Endpoints del backend**:

- ✅ `GET /recipes` - Existe
- ✅ `GET /recipes/:id` - Existe
- ✅ `GET /recipes/product/:productId` - Existe
- ✅ `GET /recipes/organization/:id/stats` - Existe

**Solución**:

- El backend SÍ tiene los endpoints
- Problema: La base de datos está vacía (no hay recetas en el seed)
- **Acción**: Agregar recetas de ejemplo al seed

### Proveedores (Suppliers)

**Errores vistos**:

- ❌ "Cannot GET /api/v1/suppliers/organization/cmh3o0zu..."

**Endpoints del backend**:

- ✅ `GET /suppliers` - Existe
- ✅ `GET /suppliers/stats/:organizationId` - Existe
- ❌ `GET /suppliers/organization/:id` - NO EXISTE

**Solución**:

- El frontend está llamando a `/suppliers/organization/:id`
- El backend tiene `/suppliers` con query params
- **Acción**: Corregir el hook de suppliers en el frontend

### Categorías (Categories)

**Endpoints del backend**:

- ✅ `GET /categories` - Existe
- ✅ `GET /categories/:id` - Existe
- ✅ `GET /categories/organization/:organization_id/tree` - Existe
- ✅ `GET /categories/organization/:organization_id/stats` - Existe

**Estado**: ✅ Endpoints correctos

---

## 📝 Plan de Corrección Sistemática

### Fase 1: Datos de Prueba ✅

1. ✅ Verificar que el seed creó productos
2. ⏳ Agregar recetas al seed
3. ⏳ Agregar proveedores al seed
4. ⏳ Agregar categorías al seed

### Fase 2: Corrección de Hooks

1. ⏳ `use-suppliers.ts` - Corregir URL de endpoints
2. ⏳ `use-recipes.ts` - Verificar que usa organization_id
3. ⏳ `use-categories.ts` - Verificar endpoints

### Fase 3: Verificación por Módulo

1. ✅ Dashboard - Funcionando con datos mock
2. ⏳ Recetas - Necesita datos reales
3. ⏳ Proveedores - Necesita corrección de hooks
4. ⏳ Inventario - Verificar funcionamiento
5. ⏳ POS - Verificar funcionamiento

---

## 🔧 Comandos de Verificación

```bash
# Verificar que el backend está corriendo
curl http://localhost:4000/api/v1/health

# Verificar login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@coffeedemo.mx","password":"password123"}'

# Verificar recetas (con token)
curl http://localhost:4000/api/v1/recipes?organization_id=<ORG_ID> \
  -H "Authorization: Bearer <TOKEN>"

# Verificar proveedores
curl http://localhost:4000/api/v1/suppliers?organization_id=<ORG_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 💡 Próximos Pasos

1. **Inmediato**: Agregar datos de prueba al seed
2. **Corto plazo**: Corregir hooks de frontend para que usen las URLs correctas
3. **Mediano plazo**: Implementar endpoints faltantes en backend
4. **Largo plazo**: Agregar tests E2E para validar todos los flujos
