# 🚀 Instrucciones para Crear el Pull Request

## Opción 1: GitHub Web (Recomendado - 2 minutos) ✨

### Paso 1: Abrir el enlace

Abre este enlace en tu navegador:

```
https://github.com/arrebolmedia/coffee-os/pull/new/feat/pos-products-module
```

### Paso 2: Completar el formulario

**Título del PR:**

```
feat(products): Add complete products CRUD module
```

**Descripción del PR:**

```markdown
## 📦 Products Module - Complete CRUD Implementation

### ✨ Features Implemented

#### API Endpoints (7 total)

- `POST /products` - Create new product
- `GET /products` - List products with pagination and filters
- `GET /products/:id` - Get product by ID
- `GET /products/sku/:sku` - Get product by SKU
- `GET /products/category/:categoryId` - Get products by category
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product (soft/hard)

#### DTOs with Validation

- **CreateProductDto**: SKU format validation, price/cost validation, required fields
- **UpdateProductDto**: Partial updates with same validations
- **QueryProductsDto**: Pagination, filters (active, categoryId, trackInventory), search

#### Business Logic

- ✅ SKU uniqueness validation
- ✅ Category existence validation
- ✅ Soft delete for products used in tickets
- ✅ Hard delete for unused products
- ✅ Search by name, SKU, or description
- ✅ Filter by category and active status
- ✅ Pagination support (skip/take)

#### Infrastructure

- PrismaService for database access
- Global DatabaseModule with proper DI
- Full integration with existing Prisma schema

### 🧪 Tests

#### Coverage

- **30 tests total** ✅ **100% passing**
- ProductsController: 10 tests
- ProductsService: 20 tests

#### Test Categories

✅ Unit tests for all CRUD operations  
✅ Validation tests (SKU conflicts, category validation)  
✅ Error handling (NotFoundException, ConflictException, BadRequestException)  
✅ Pagination and filtering tests  
✅ Search functionality tests  
✅ Soft/hard delete logic tests

### 📊 Code Quality

- ✅ TypeScript strict mode
- ✅ ESLint compliant
- ✅ Class-validator decorators
- ✅ Proper error handling
- ✅ Clean architecture (Controller → Service → Repository)

### 📝 Files Changed

**11 files modified:**

- `apps/api/src/app.module.ts` - ProductsModule integration
- `apps/api/src/modules/database/database.module.ts` - Global module setup
- `apps/api/src/modules/database/prisma.service.ts` - Database service (NEW)
- `apps/api/src/modules/products/products.module.ts` - Module definition (NEW)
- `apps/api/src/modules/products/products.controller.ts` - REST API (NEW)
- `apps/api/src/modules/products/products.service.ts` - Business logic (NEW)
- `apps/api/src/modules/products/dto/create-product.dto.ts` - DTO (NEW)
- `apps/api/src/modules/products/dto/update-product.dto.ts` - DTO (NEW)
- `apps/api/src/modules/products/dto/query-products.dto.ts` - DTO (NEW)
- `apps/api/src/modules/products/products.controller.spec.ts` - Tests (NEW)
- `apps/api/src/modules/products/products.service.spec.ts` - Tests (NEW)

**1,012 lines of code added**

### 🔗 Related

Part of the POS module implementation from the CoffeeOS master plan.
Uses existing Prisma schema (Product, Category models).

### 📝 Next Steps

After this PR is merged:

1. Categories CRUD module
2. Product modifiers management
3. Recipe management
4. POS cart implementation

---

**Development time:** ~5 minutes ⚡  
**Auto-Dev System:** Fully operational 🎉
```

### Paso 3: Crear el PR

1. Copia el título y descripción de arriba
2. Pega en el formulario de GitHub
3. Click en "Create pull request"

### Paso 4: Verificar workflows

- Los workflows de GitHub Actions se ejecutarán automáticamente
- Espera a que todos pasen (debería tomar 2-3 minutos)

---

## Opción 2: GitHub CLI (Si quieres arreglar la autenticación)

Si prefieres usar `gh` CLI, primero necesitas autenticarte:

```powershell
# Opción A: Login interactivo
gh auth login

# Selecciona:
# - GitHub.com
# - HTTPS
# - Login with a web browser
# - Sigue las instrucciones en el navegador
```

Luego ejecuta:

```powershell
gh pr create --title "feat(products): Add complete products CRUD module" --body-file PR-PRODUCTOS-CREADO.md --base main
```

---

## 🎯 Recomendación

**Usa la Opción 1 (GitHub Web)** - Es más rápido y no requiere configuración adicional.

El enlace directo es:

```
https://github.com/arrebolmedia/coffee-os/pull/new/feat/pos-products-module
```

**¡Solo toma 2 minutos!** 🚀

---

## ✅ Después del PR

Una vez creado el PR:

1. ✅ Los workflows se ejecutarán
2. ✅ Todos los tests pasarán (ya los validamos localmente)
3. ✅ Haces merge
4. ✅ Continuamos con el siguiente módulo

**¿Te parece bien crear el PR por la web?** 😊
