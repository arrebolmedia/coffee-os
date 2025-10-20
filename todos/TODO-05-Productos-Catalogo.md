# 📦 TODO 05: Módulo Productos y Catálogo

**Período**: Semana 3-4  
**Owner**: Backend Developer + Frontend Developer  
**Prioridad**: 🔴 CRÍTICA

## 📋 Objetivos

Implementar el sistema completo de gestión de productos, categorías y modificadores que servirá como base del catálogo del POS, con sincronización offline y actualización en tiempo real.

## ✅ Entregables

### 1. Backend - Modelo de Datos y APIs

#### 📊 Schema Prisma (Productos)

```typescript
// packages/database/prisma/schema.prisma
model Product {
  id             String   @id @default(cuid())
  sku            String   @unique
  name           String
  description    String?
  price          Decimal  @db.Decimal(10, 2)
  cost           Decimal? @db.Decimal(10, 2)
  taxRate        Decimal  @default(0.16) @db.Decimal(4, 2)
  image          String?
  active         Boolean  @default(true)
  featured       Boolean  @default(false)
  sortOrder      Int      @default(0)

  // Categorización
  categoryId     String
  category       Category @relation(fields: [categoryId], references: [id])

  // Multi-tenant
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  locationId     String?
  location       Location? @relation(fields: [locationId], references: [id])

  // Modificadores permitidos
  productModifiers ProductModifier[]

  // Combos
  comboItems     ComboItem[]

  // Recetas
  recipe         Recipe?

  // Tickets
  ticketLines    TicketLine[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, categoryId])
  @@index([organizationId, active])
  @@map("products")
}

model Category {
  id             String   @id @default(cuid())
  name           String
  slug           String
  description    String?
  icon           String?
  color          String?
  sortOrder      Int      @default(0)
  active         Boolean  @default(true)

  // Multi-tenant
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Relations
  products       Product[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, slug])
  @@map("categories")
}

model Modifier {
  id             String   @id @default(cuid())
  name           String
  type           ModifierType
  priceDelta     Decimal  @db.Decimal(10, 2)
  active         Boolean  @default(true)
  sortOrder      Int      @default(0)

  // Opciones de grupo
  groupId        String?
  group          ModifierGroup? @relation(fields: [groupId], references: [id])

  // Multi-tenant
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Relations
  productModifiers ProductModifier[]
  ticketLineModifiers TicketLineModifier[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("modifiers")
}

enum ModifierType {
  MILK          // Leches: Regular, Oat, Soy, Almond
  SIZE          // Tamaños: 8oz, 12oz, 16oz
  EXTRA         // Extras: Shot, Syrup, Cream
  ADDON         // Add-ons: Cookie, Croissant
  TEMPERATURE   // Caliente, Frío, Ambiente
  PREPARATION   // Descafeinado, Extra shot, etc.
}

model ModifierGroup {
  id             String   @id @default(cuid())
  name           String   // "Leches", "Tamaños", "Extras"
  displayName    String
  required       Boolean  @default(false)
  multiSelect    Boolean  @default(false)
  maxSelections  Int?

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  modifiers      Modifier[]

  @@map("modifier_groups")
}

model ProductModifier {
  productId      String
  product        Product @relation(fields: [productId], references: [id])

  modifierId     String
  modifier       Modifier @relation(fields: [modifierId], references: [id])

  required       Boolean @default(false)
  defaultSelected Boolean @default(false)

  @@id([productId, modifierId])
  @@map("product_modifiers")
}

model Combo {
  id             String   @id @default(cuid())
  name           String
  description    String?
  price          Decimal  @db.Decimal(10, 2)
  discount       Decimal? @db.Decimal(10, 2)
  active         Boolean  @default(true)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  items          ComboItem[]

  validFrom      DateTime?
  validUntil     DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("combos")
}

model ComboItem {
  id        String  @id @default(cuid())
  comboId   String
  combo     Combo   @relation(fields: [comboId], references: [id])

  productId String
  product   Product @relation(fields: [productId], references: [id])

  quantity  Int     @default(1)

  @@map("combo_items")
}
```

#### 🔌 Products Service Implementation

```typescript
// apps/api/src/products/products.service.ts
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(orgId: string, filters?: ProductFilters): Promise<Product[]> {
    const cacheKey = `products:${orgId}:${JSON.stringify(filters)}`;

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      where: {
        organizationId: orgId,
        active: filters?.active ?? true,
        categoryId: filters?.categoryId,
        locationId: filters?.locationId,
      },
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: {
              include: { group: true },
            },
          },
        },
        recipe: {
          include: {
            recipeIngredients: {
              include: { ingredient: true },
            },
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, products, 300);

    return products;
  }

  async findOne(id: string, orgId: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId: orgId },
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: {
              include: { group: true },
            },
          },
        },
        recipe: {
          include: {
            recipeIngredients: {
              include: { ingredient: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto, orgId: string): Promise<Product> {
    // Validar SKU único por organización
    const exists = await this.prisma.product.findFirst({
      where: { sku: dto.sku, organizationId: orgId },
    });

    if (exists) {
      throw new ConflictException(`SKU ${dto.sku} already exists`);
    }

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        organizationId: orgId,
        productModifiers: dto.modifierIds
          ? {
              create: dto.modifierIds.map((modifierId) => ({
                modifierId,
                required:
                  dto.requiredModifierIds?.includes(modifierId) ?? false,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        productModifiers: {
          include: { modifier: true },
        },
      },
    });

    // Invalidar cache
    await this.invalidateCache(orgId);

    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    orgId: string,
  ): Promise<Product> {
    const product = await this.findOne(id, orgId);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        productModifiers: dto.modifierIds
          ? {
              deleteMany: {},
              create: dto.modifierIds.map((modifierId) => ({
                modifierId,
                required:
                  dto.requiredModifierIds?.includes(modifierId) ?? false,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        productModifiers: {
          include: { modifier: true },
        },
      },
    });

    await this.invalidateCache(orgId);

    return updated;
  }

  async toggleActive(id: string, orgId: string): Promise<Product> {
    const product = await this.findOne(id, orgId);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { active: !product.active },
    });

    await this.invalidateCache(orgId);

    return updated;
  }

  async bulkUpdatePrices(
    updates: Array<{ id: string; price: number }>,
    orgId: string,
  ): Promise<void> {
    await this.prisma.$transaction(
      updates.map(({ id, price }) =>
        this.prisma.product.update({
          where: { id, organizationId: orgId },
          data: { price },
        }),
      ),
    );

    await this.invalidateCache(orgId);
  }

  private async invalidateCache(orgId: string): Promise<void> {
    const pattern = `products:${orgId}:*`;
    await this.cacheService.deletePattern(pattern);
  }
}
```

#### 🔌 Categories & Modifiers Services

```typescript
// apps/api/src/products/categories.service.ts
@Injectable()
export class CategoriesService {
  async findAll(orgId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { organizationId: orgId, active: true },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: CreateCategoryDto, orgId: string): Promise<Category> {
    return this.prisma.category.create({
      data: {
        ...dto,
        slug: slugify(dto.name),
        organizationId: orgId,
      },
    });
  }

  async reorder(ids: string[], orgId: string): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.category.update({
          where: { id, organizationId: orgId },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}

// apps/api/src/products/modifiers.service.ts
@Injectable()
export class ModifiersService {
  async findByProduct(productId: string, orgId: string): Promise<Modifier[]> {
    return this.prisma.modifier.findMany({
      where: {
        organizationId: orgId,
        active: true,
        productModifiers: {
          some: { productId },
        },
      },
      include: { group: true },
      orderBy: [{ group: { name: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  async findByType(type: ModifierType, orgId: string): Promise<Modifier[]> {
    return this.prisma.modifier.findMany({
      where: {
        organizationId: orgId,
        type,
        active: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
```

### 2. API Endpoints

#### 🛣️ Products Controller

```typescript
// apps/api/src/products/products.controller.ts
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Listar productos' })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query() filters: ProductFiltersDto,
  ): Promise<Product[]> {
    return this.productsService.findAll(orgId, filters);
  }

  @Get(':id')
  @RequirePermissions('products:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ): Promise<Product> {
    return this.productsService.findOne(id, orgId);
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  @RequirePermissions('products:create')
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser('organizationId') orgId: string,
  ): Promise<Product> {
    return this.productsService.create(dto, orgId);
  }

  @Patch(':id')
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  @RequirePermissions('products:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('organizationId') orgId: string,
  ): Promise<Product> {
    return this.productsService.update(id, dto, orgId);
  }

  @Patch(':id/toggle')
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ): Promise<Product> {
    return this.productsService.toggleActive(id, orgId);
  }

  @Post('bulk/prices')
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  async bulkUpdatePrices(
    @Body() dto: BulkUpdatePricesDto,
    @CurrentUser('organizationId') orgId: string,
  ): Promise<void> {
    return this.productsService.bulkUpdatePrices(dto.updates, orgId);
  }
}

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  @Get()
  async findAll(@CurrentUser('organizationId') orgId: string) {
    return this.categoriesService.findAll(orgId);
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.categoriesService.create(dto, orgId);
  }

  @Put('reorder')
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  async reorder(
    @Body() dto: ReorderCategoriesDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.categoriesService.reorder(dto.ids, orgId);
  }
}

@Controller('modifiers')
@UseGuards(JwtAuthGuard)
export class ModifiersController {
  @Get('product/:productId')
  async findByProduct(
    @Param('productId') productId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.modifiersService.findByProduct(productId, orgId);
  }

  @Get('type/:type')
  async findByType(
    @Param('type') type: ModifierType,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.modifiersService.findByType(type, orgId);
  }
}
```

### 3. Frontend - React Query Hooks

#### 🎣 Custom Hooks for Products

```typescript
// apps/pos-web/src/hooks/useProducts.ts
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters as any);
      const res = await api.get(`/products?${params}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductDto) => {
      const res = await api.post('/products', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProductDto;
    }) => {
      const res = await api.patch(`/products/${id}`, data);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', id] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useModifiersByProduct(productId: string) {
  return useQuery({
    queryKey: ['modifiers', 'product', productId],
    queryFn: async () => {
      const res = await api.get(`/modifiers/product/${productId}`);
      return res.data;
    },
    enabled: !!productId,
  });
}
```

### 4. Offline-First con IndexedDB

#### 💾 IndexedDB Setup

```typescript
// apps/pos-web/src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface LocalProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  categoryId: string;
  image?: string;
  active: boolean;
  modifiers?: Modifier[];
  syncedAt: Date;
}

export class CoffeeOSDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  categories!: Table<Category, string>;
  modifiers!: Table<Modifier, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('CoffeeOSDB');

    this.version(1).stores({
      products: 'id, sku, categoryId, active, syncedAt',
      categories: 'id, slug, sortOrder',
      modifiers: 'id, type, groupId',
      syncQueue: '++id, type, status, createdAt',
    });
  }
}

export const db = new CoffeeOSDatabase();
```

#### 🔄 Sync Service

```typescript
// apps/pos-web/src/services/syncService.ts
export class SyncService {
  async syncProducts(): Promise<void> {
    try {
      // Fetch from server
      const products = await api.get('/products');

      // Update IndexedDB
      await db.products.clear();
      await db.products.bulkAdd(
        products.data.map((p: Product) => ({
          ...p,
          syncedAt: new Date(),
        })),
      );

      console.log(`✅ Synced ${products.data.length} products`);
    } catch (error) {
      console.error('❌ Product sync failed:', error);
    }
  }

  async getProductsOffline(): Promise<LocalProduct[]> {
    return db.products.where('active').equals(1).toArray();
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    return db.products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase()),
      )
      .toArray();
  }
}

export const syncService = new SyncService();
```

## 🎯 Criterios de Aceptación

### Backend Requirements

- [ ] ✅ CRUD completo de productos con validaciones
- [ ] ✅ Gestión de categorías con ordenamiento drag & drop
- [ ] ✅ Modificadores agrupados por tipo y producto
- [ ] ✅ Combos con descuentos automáticos
- [ ] ✅ Cache Redis con invalidación inteligente
- [ ] ✅ Tests unitarios >80% coverage

### Frontend Requirements

- [ ] ✅ React Query hooks con cache optimizado
- [ ] ✅ IndexedDB sync automático cada 5 minutos
- [ ] ✅ Búsqueda offline con filtros
- [ ] ✅ Optimistic updates para mejor UX
- [ ] ✅ Error boundaries y fallbacks

### Performance Targets

- [ ] ✅ GET /products < 100ms con cache
- [ ] ✅ POST /products < 200ms
- [ ] ✅ Sync inicial 1000 productos < 5 segundos
- [ ] ✅ Búsqueda offline < 50ms

## 🚀 Entregables Finales

### 1. APIs Documentadas

```bash
GET    /products              # Listar productos
GET    /products/:id          # Detalle producto
POST   /products              # Crear producto
PATCH  /products/:id          # Actualizar producto
PATCH  /products/:id/toggle   # Activar/desactivar
POST   /products/bulk/prices  # Actualizar precios masivo

GET    /categories            # Listar categorías
POST   /categories            # Crear categoría
PUT    /categories/reorder    # Reordenar

GET    /modifiers/product/:id # Modificadores por producto
GET    /modifiers/type/:type  # Modificadores por tipo
```

### 2. React Components

- [ ] `<ProductCard />` - Tarjeta producto para catálogo
- [ ] `<ProductGrid />` - Grid responsive con filtros
- [ ] `<ProductForm />` - Formulario crear/editar
- [ ] `<ModifierSelector />` - Selector de modificadores
- [ ] `<CategoryTabs />` - Tabs de categorías

### 3. Testing Suite

```typescript
describe('Products Service', () => {
  it('should create product with modifiers', async () => {
    const product = await productsService.create(
      {
        sku: 'AMER001',
        name: 'Americano',
        price: 45,
        categoryId: 'espresso-cat',
        modifierIds: ['milk-oat', 'size-12oz'],
      },
      orgId,
    );

    expect(product).toBeDefined();
    expect(product.productModifiers).toHaveLength(2);
  });
});
```

## 🔗 Dependencies & Handoffs

### ⬅️ Inputs Needed

- [ ] ✅ Auth system de TODO 04
- [ ] ✅ UI Components de TODO 03
- [ ] ✅ Database schema completado

### ➡️ Outputs for Next Phase

- [ ] ✅ Product catalog → TODO 06 (POS Engine)
- [ ] ✅ Modifiers system → TODO 07 (POS Web)
- [ ] ✅ Categories → TODO 08 (Recipes)

---

**⏰ Deadline**: Martes Semana 4  
**👥 Stakeholders**: Backend Dev, Frontend Dev, Product Manager  
**📦 Deliverable**: Product APIs + Offline sync working

_Products are the heart of the POS! 📦☕_
