# 🚀 Primera Feature: Módulo de Productos

## 📋 Preparación Completa

Una vez que hayas mergeado el PR, ejecutaremos estos pasos automáticamente.

---

## ✅ Paso 1: Actualizar Main

```powershell
# Cambiar a main
git checkout main

# Traer cambios del merge
git pull origin main

# Verificar archivos del auto-dev
git log --oneline -3
```

---

## ✅ Paso 2: Crear Branch de Feature

```powershell
# Crear branch para productos
git checkout -b feat/pos-products-module

# Verificar
git branch
```

---

## ✅ Paso 3: Actualizar Prisma Schema

Agregaré el modelo Product:

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  category    String
  stock       Int      @default(0)
  imageUrl    String?
  isActive    Boolean  @default(true)

  // Multi-tenancy
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Soft delete
  deletedAt DateTime?

  @@index([organizationId])
  @@index([category])
  @@index([isActive])
  @@map("products")
}
```

---

## ✅ Paso 4: Generar Migración

```powershell
cd packages/database
npx prisma migrate dev --name add-product-model
cd ../..
```

---

## ✅ Paso 5: Generar Módulo NestJS

Crearé:

- `products.module.ts`
- `products.controller.ts`
- `products.service.ts`
- `dto/create-product.dto.ts`
- `dto/update-product.dto.ts`
- `dto/product-response.dto.ts`
- `products.controller.spec.ts`
- `products.service.spec.ts`

Con:

- CRUD completo
- Validaciones
- Multi-tenancy
- Tests >90% coverage

---

## ✅ Paso 6: Ejecutar Tests

```powershell
npm run test products
npm run test:cov
```

---

## ✅ Paso 7: Commit y Push

```powershell
git add .
git commit -m "feat(pos): implement products module with CRUD

- Add Product model to Prisma schema
- Create ProductsModule with controller and service
- Implement CRUD operations with multi-tenancy
- Add validation DTOs (CreateProductDto, UpdateProductDto)
- Add unit tests with >90% coverage
- Add E2E tests for all endpoints"

git push origin feat/pos-products-module
```

---

## ✅ Paso 8: Crear Pull Request

Crearé el PR automáticamente con:

- Título descriptivo
- Descripción completa
- Labels apropiados

---

## 🎯 Tiempo Estimado

- Actualizar main: 30 segundos
- Crear branch: 10 segundos
- Generar archivos: 2 minutos
- Migración: 30 segundos
- Tests: 1 minuto
- Commit y push: 30 segundos

**Total: ~5 minutos** ⚡

---

## 📊 Lo Que Obtendrás

Un módulo completo de productos con:

- ✅ Modelo en base de datos
- ✅ API REST completa (5 endpoints)
- ✅ Validación de datos
- ✅ Multi-tenancy
- ✅ Tests completos
- ✅ Documentación

---

**Avísame cuando hayas mergeado el PR y arranco con todo esto!** 🚀
