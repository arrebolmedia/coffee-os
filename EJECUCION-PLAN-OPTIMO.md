# 🎯 EJECUCIÓN: Plan Óptimo para CoffeeOS

## ⚡ FASE 1: Consolidar Base (AHORA - 5 minutos)

### ✅ Paso 1.1: Verificar y Mergear PR

**Ya abrí las páginas en el navegador:**
- GitHub Actions (workflows)
- Pull Requests

**Instrucciones:**

1. **En la pestaña de Actions:**
   - Buscar el último workflow run
   - Verificar estado (verde ✅ / amarillo 🟡 / rojo ❌)

2. **En la pestaña de Pull Requests:**
   - Click en tu PR (debe ser el único)
   - Scroll abajo para ver los checks

3. **Decidir:**

   **Si TODO está verde ✅:**
   ```
   → Click "Merge pull request"
   → Click "Confirm merge"
   → Opcional: Click "Delete branch"
   ```

   **Si algunos checks están en progreso 🟡:**
   ```
   → Esperar 2-3 minutos
   → Refresh la página
   → Cuando estén verdes, mergear
   ```

   **Si hay checks rojos ❌:**
   ```
   → Click "Details" en el check fallido
   → Revisar logs
   → Avísame qué dice el error
   → Probablemente son warnings, no bloqueantes
   ```

---

### ✅ Paso 1.2: Actualizar Repositorio Local

**Después de mergear en GitHub, ejecutar:**

```powershell
# Ver branch actual
git branch

# Cambiar a main
git checkout main

# Traer cambios del merge
git pull origin main

# Verificar que todo está actualizado
git log --oneline -3
```

**Deberías ver:**
- Commit de merge del PR
- Commit "feat(infra): bootstrap auto-dev system"

---

### ✅ Paso 1.3: Limpiar Branch Local (Opcional)

```powershell
# Eliminar branch local de feature (ya mergeado)
git branch -d feat/auto-dev-bootstrap

# Ver branches restantes
git branch
# Debería mostrar solo: * main
```

---

## 🚀 FASE 2: Primera Feature - Módulo de Productos (1-2 horas)

### 📋 Paso 2.1: Crear Issue en GitHub

**En navegador, ir a:**
```
https://github.com/arrebolmedia/coffee-os/issues/new
```

**Llenar formulario:**

**Title:**
```
feat(pos): implementar módulo de productos con CRUD completo
```

**Description:**
```markdown
## 🎯 Objetivo
Implementar el módulo de productos como base para el sistema POS de CoffeeOS.

## 📝 Funcionalidades

### Backend (NestJS + Prisma)
- [ ] Modelo Product en Prisma schema
- [ ] ProductsModule con estructura completa
- [ ] ProductsController con endpoints RESTful
- [ ] ProductsService con lógica de negocio
- [ ] DTOs con validación (class-validator)
- [ ] Tests unitarios (coverage >90%)
- [ ] Tests E2E
- [ ] Multi-tenancy (organizationId)

## 📊 Modelo de Datos

```prisma
model Product {
  id             String   @id @default(uuid())
  name           String
  description    String?
  price          Decimal  @db.Decimal(10, 2)
  category       String
  stock          Int      @default(0)
  imageUrl       String?
  isActive       Boolean  @default(true)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([organizationId])
  @@index([category])
  @@index([isActive])
}
```

## 🔌 Endpoints

```
GET    /api/products           - Lista paginada con filtros
GET    /api/products/:id       - Detalle de producto
POST   /api/products           - Crear producto (admin)
PUT    /api/products/:id       - Actualizar producto (admin)
DELETE /api/products/:id       - Soft delete (admin)
GET    /api/products/search    - Búsqueda por nombre
GET    /api/products/category/:category - Filtrar por categoría
```

## ✅ Criterios de Aceptación

- [ ] CRUD completo funcionando
- [ ] Validaciones correctas en DTOs
- [ ] Búsqueda y filtros operativos
- [ ] Multi-tenancy implementado
- [ ] Tests con coverage >90%
- [ ] Documentación de endpoints
- [ ] Sin warnings en ESLint
- [ ] CI/CD pasando

## 🏷️ Labels
`feature`, `pos`, `backend`, `priority-high`
```

**Click:** "Submit new issue"

---

### 📋 Paso 2.2: Crear Branch de Feature

```powershell
# Asegurarte de estar en main actualizado
git checkout main
git pull origin main

# Crear nuevo branch
git checkout -b feat/pos-products-module

# Verificar
git branch
# Debería mostrar: * feat/pos-products-module
```

---

### 📋 Paso 2.3: Actualizar Prisma Schema

**Opción A - Con Continue (RECOMENDADO para practicar):**

```
1. Abrir archivo: packages/database/prisma/schema.prisma
2. Ir al final del archivo
3. Presionar Ctrl+L
4. Escribir:

"/prisma Agrega el modelo Product con estos campos:
- id: UUID (auto-generado)
- name: String (nombre del producto)
- description: String opcional
- price: Decimal(10,2) (precio con 2 decimales)
- category: String (categoría: bebida, alimento, etc)
- stock: Int (cantidad en inventario, default 0)
- imageUrl: String opcional (URL de la imagen)
- isActive: Boolean (default true, para soft delete)
- organizationId: String (para multi-tenancy)
- createdAt: DateTime (auto)
- updatedAt: DateTime (auto)

Incluye:
- Relación con Organization
- Índices en organizationId, category, isActive"

5. Continue generará el modelo
6. Revisar y ajustar si necesario
```

**Opción B - Yo te lo genero:**

Avísame y te creo el modelo completo.

---

### 📋 Paso 2.4: Generar Migración de Base de Datos

```powershell
# Ir a carpeta de database
cd packages/database

# Generar migración
npx prisma migrate dev --name add-product-model

# Debería crear la migración y aplicarla
# Verificar en consola que salga: "Migration applied"

# Volver a raíz
cd ../..
```

---

### 📋 Paso 2.5: Generar Módulo de Productos

**Opción A - Con Continue (RECOMENDADO):**

```
1. Crear carpeta:
   mkdir apps/api/src/modules/products

2. Presionar Ctrl+L en VS Code

3. Escribir:

"/nestjs Genera un módulo completo de productos para CoffeeOS con esta estructura:

CARPETA: apps/api/src/modules/products/

ARCHIVOS A CREAR:

1. products.module.ts
   - Importa TypeOrmModule o PrismaModule
   - Exporta ProductsService
   - Registra ProductsController

2. products.controller.ts
   - @Controller('products')
   - Endpoints:
     * GET / - findAll (paginado, con filtros)
     * GET /:id - findOne
     * POST / - create (con @UseGuards para admin)
     * PUT /:id - update (con @UseGuards para admin)
     * DELETE /:id - remove (soft delete)
   - Usa DTOs para body
   - Usa @Query para filtros y paginación
   - Incluye Swagger decorators (@ApiOperation, @ApiResponse)

3. products.service.ts
   - Inyecta PrismaService
   - Métodos:
     * findAll(organizationId, filters, pagination)
     * findOne(id, organizationId)
     * create(createDto, organizationId)
     * update(id, updateDto, organizationId)
     * remove(id, organizationId) - soft delete
     * searchByName(name, organizationId)
     * findByCategory(category, organizationId)
   - Validaciones de negocio
   - Manejo de errores con HttpException

4. dto/create-product.dto.ts
   - Campos: name, description?, price, category, stock?, imageUrl?
   - Validaciones con class-validator:
     * @IsNotEmpty(), @IsString(), @IsNumber(), @IsOptional()
     * @Min(0) para price y stock
   - Swagger decorators (@ApiProperty)

5. dto/update-product.dto.ts
   - Extiende PartialType(CreateProductDto)
   - Todos los campos opcionales

6. entities/product.entity.ts
   - Interfaz/clase que mapea el modelo de Prisma
   - Usado para tipado

Consideraciones:
- Multi-tenancy: filtrar siempre por organizationId
- Soft delete: actualizar isActive a false
- Paginación: usar skip y take
- Validación de stock: no permitir stock negativo
- Errores: NotFoundException, BadRequestException
- Logging: agregar logs informativos

Usa el estilo del proyecto existente en apps/api/src/health/"

4. Continue generará los archivos
5. Copiar código en archivos correspondientes
```

**Opción B - Yo genero todo:**

Avísame y creo todos los archivos del módulo.

---

### 📋 Paso 2.6: Registrar Módulo en App

**Archivo:** `apps/api/src/app.module.ts`

**Agregar:**

```typescript
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    // ... otros módulos
    ProductsModule, // ← Agregar aquí
  ],
})
```

---

### 📋 Paso 2.7: Crear Tests

**Tests Unitarios - Con Continue:**

```
1. Crear: apps/api/src/modules/products/products.service.spec.ts

2. Ctrl+L → "/test

   Genera tests unitarios para ProductsService con:
   - Mocks de PrismaService
   - Tests para cada método (findAll, findOne, create, update, remove)
   - Casos de éxito y error
   - Coverage >90%
   - Usa Jest
   "

3. Ajustar si necesario
```

**Tests E2E - Con Continue:**

```
1. Crear: apps/api/test/e2e/products.e2e-spec.ts

2. Ctrl+L → "Genera tests E2E para el módulo de productos:
   - Setup de testing module
   - Setup de base de datos de prueba
   - Tests para cada endpoint
   - Validación de responses
   - Tests de autenticación/autorización
   "
```

---

### 📋 Paso 2.8: Ejecutar Tests

```powershell
# Tests unitarios del módulo
npm run test -- products.service

# Tests E2E
npm run test:e2e -- products

# Coverage completo
npm run test:cov

# Verificar que coverage >90% en products
```

---

### 📋 Paso 2.9: Commit y Push

**Con Continue:**
```
Ctrl+L → "/commit"

Continue generará mensaje como:
"feat(pos): implement products module with CRUD operations"
```

**O manualmente:**

```powershell
# Ver cambios
git status

# Agregar todos
git add .

# Commit con conventional commits
git commit -m "feat(pos): implement products module with CRUD

- Add Product model to Prisma schema with multi-tenancy
- Create ProductsModule with controller and service
- Implement CRUD operations with validation
- Add DTOs with class-validator decorators
- Add unit tests (coverage: 95%)
- Add E2E tests for all endpoints
- Support for search and filtering
- Soft delete implementation

Closes #[número del issue]"

# Push
git push origin feat/pos-products-module
```

---

### 📋 Paso 2.10: Crear Pull Request

**En GitHub:**

```
1. Ir a: https://github.com/arrebolmedia/coffee-os/pulls
2. Click: "Compare & pull request" (aparecerá banner)
3. Verificar: base = main, compare = feat/pos-products-module
4. Title: feat(pos): implement products module with CRUD
5. Description: (auto-llenada del template)
6. En la descripción, agregar: "Closes #[número del issue]"
7. Click: "Create pull request"
```

---

## 🎉 RESULTADO ESPERADO

Al final de hoy deberías tener:

### ✅ Fase 1 Completa:
- [x] PR de auto-dev mergeado a main
- [x] Repositorio local actualizado
- [x] Branch limpio

### ✅ Fase 2 Completa:
- [ ] Issue de productos creado
- [ ] Modelo Product en Prisma
- [ ] Migración aplicada
- [ ] Módulo completo implementado:
  - [ ] Controller con 5+ endpoints
  - [ ] Service con lógica de negocio
  - [ ] DTOs con validación
  - [ ] Tests unitarios (>90% coverage)
  - [ ] Tests E2E
- [ ] PR creado y workflows ejecutándose

---

## 💡 TIPS

### Usa Continue para:
- Generar código boilerplate
- Crear tests
- Explicar código que no entiendas
- Generar mensajes de commit

### Pídeme ayuda para:
- Decisiones de arquitectura
- Problemas complejos multi-archivo
- Troubleshooting de CI/CD
- Code review antes del PR

### Combina Ambos:
- Continue genera código → Tú revisas → Yo optimizo si necesario
- Yo genero estructura → Continue llena detalles → Tú ajustas

---

## 🆘 TROUBLESHOOTING

### Error en migración de Prisma
```powershell
# Reset database (CUIDADO: borra datos)
npx prisma migrate reset

# Re-generar
npx prisma migrate dev
```

### Tests fallan
```
1. Verificar que servicios estén corriendo (PostgreSQL)
2. Revisar imports y paths
3. Verificar mocks en tests
```

### Continue no responde
```
1. Verificar $env:OPENAI_API_KEY
2. Revisar Output → Continue
3. Reiniciar VS Code
```

---

## 📞 CUANDO TERMINES

Avísame y:
1. Revisamos el código juntos
2. Optimizamos si es necesario
3. Verificamos el PR
4. Planificamos el siguiente módulo

---

**¡Empecemos! 🚀**

**ACCIÓN INMEDIATA:**
1. Ve a GitHub en el navegador
2. Verifica workflows
3. Mergea el PR
4. Avísame cuando esté mergeado
