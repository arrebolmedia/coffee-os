import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { ProductsService } from '../products.service';
import { PrismaService } from '../../database/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrismaService = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    productModifier: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  // Snake_case DTO the service accepts (the service maps these to camelCase Prisma fields).
  const mockProductDto = {
    organization_id: '123e4567-e89b-12d3-a456-426614174000',
    category_id: 'cat-001',
    sku: 'CAFE-ESP-001',
    name: 'Espresso Doble',
    description: 'Espresso clásico italiano',
    image_url: 'https://example.com/espresso.jpg',
    base_price: 45,
    cost: 12,
    // La tasa es una FRACCION, no un porcentaje: 0.16 es el 16 %. El fixture
    // decia 16, que la columna habria guardado como 1600 %.
    tax_rate: 0.16,
    allow_modifiers: true,
    track_inventory: true,
    is_available: true,
  };

  /**
   * Build a Prisma-shaped product row (camelCase) as the service would receive
   * it from prisma.product.create/findMany/etc. The service returns these rows
   * verbatim, so tests assert against this exact shape.
   */
  const buildPrismaProduct = (overrides: Partial<any> = {}) => ({
    id: overrides.id ?? 'prod-uuid-1',
    organizationId:
      overrides.organizationId ?? '123e4567-e89b-12d3-a456-426614174000',
    categoryId: overrides.categoryId ?? 'cat-001',
    sku: overrides.sku ?? 'CAFE-ESP-001',
    name: overrides.name ?? 'Espresso Doble',
    description: overrides.description ?? 'Espresso clásico italiano',
    image: overrides.image ?? 'https://example.com/espresso.jpg',
    price: overrides.price ?? 45,
    basePrice: overrides.basePrice ?? 45,
    cost: overrides.cost ?? 12,
    taxRate: overrides.taxRate ?? 0.16,
    allowModifiers: overrides.allowModifiers ?? true,
    trackInventory: overrides.trackInventory ?? true,
    active: overrides.active ?? true,
    category: overrides.category ?? { id: 'cat-001', name: 'Café' },
    productModifiers: overrides.productModifiers ?? [],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product with all fields', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null); // SKU pre-check: no dup
      const created = buildPrismaProduct();
      mockPrismaService.product.create.mockResolvedValue(created);

      const product = await service.create(mockProductDto);

      // Service returns the raw Prisma row verbatim.
      expect(product).toBe(created);
      expect(product.name).toBe('Espresso Doble');
      expect(product.sku).toBe('CAFE-ESP-001');
      expect(product.basePrice).toBe(45);
      expect(product.price).toBe(45);
      expect(product.cost).toBe(12);
      expect(product.active).toBe(true);
      expect(product.trackInventory).toBe(true);

      // Verify the SKU uniqueness pre-check ran scoped to the organization.
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: mockProductDto.organization_id,
          sku: mockProductDto.sku,
        },
      });

      // Verify the snake_case DTO was mapped to camelCase Prisma columns.
      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockProductDto.organization_id,
            categoryId: mockProductDto.category_id,
            sku: 'CAFE-ESP-001',
            name: 'Espresso Doble',
            image: 'https://example.com/espresso.jpg',
            price: 45,
            basePrice: 45,
            cost: 12,
            taxRate: 0.16,
            allowModifiers: true,
            trackInventory: true,
            active: true,
          }),
          include: expect.objectContaining({
            category: true,
            productModifiers: { include: { modifier: true } },
          }),
        }),
      );
    });

    it('should throw ConflictException if SKU already exists (pre-check)', async () => {
      // findFirst returns an existing product → ConflictException before create.
      mockPrismaService.product.findFirst.mockResolvedValue(
        buildPrismaProduct(),
      );

      await expect(service.create(mockProductDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on a P2002 race during create', async () => {
      // Pre-check passes (no dup), but the create races with a concurrent insert.
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      const p2002 = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      });
      mockPrismaService.product.create.mockRejectedValue(p2002);

      await expect(service.create(mockProductDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create product with minimal fields and apply service defaults', async () => {
      const minimalDto = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: 'cat-002',
        sku: 'CAFE-CAP-001',
        name: 'Cappuccino',
        base_price: 55,
      };
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create.mockImplementation(
        async ({ data }: any) => buildPrismaProduct(data),
      );

      const product = await service.create(minimalDto);

      expect(product.name).toBe('Cappuccino');
      // The service supplies defaults for unset fields.
      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cost: 0, // default when cost omitted
            taxRate: 0.16, // default tax rate
            allowModifiers: true, // default true
            trackInventory: false, // default false
            active: true, // is_available default true
          }),
        }),
      );
    });

    it('should set default values correctly (cost=0, taxRate=0.16, trackInventory=false)', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create.mockImplementation(
        async ({ data }: any) => buildPrismaProduct(data),
      );

      const product = await service.create({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: 'cat-003',
        sku: 'TEST-001',
        name: 'Test Product',
        base_price: 10,
      });

      expect(product.taxRate).toBe(0.16);
      expect(product.allowModifiers).toBe(true);
      expect(product.trackInventory).toBe(false);
      expect(product.active).toBe(true);
      expect(product.cost).toBe(0);
    });
  });

  /**
   * El régimen fiscal del producto es lo que decide cuánto IVA se cobra en cada
   * venta, así que darlo de alta mal se paga en cada ticket.
   *
   * Comprobado contra la API antes de arreglarlo: pedir tasa 0 guardaba 0.16, y
   * `tax_included: true` se guardaba como false.
   */
  describe('régimen fiscal del producto', () => {
    beforeEach(() => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create.mockImplementation(
        async ({ data }: any) => buildPrismaProduct(data),
      );
    });

    const base = {
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      category_id: 'cat-pan',
      sku: 'PAN-001',
      name: 'Concha para llevar',
      base_price: 25,
    };

    it('guarda la tasa 0 tal cual, no la reemplaza por el 16 %', async () => {
      // El pan para llevar tributa a tasa 0 (art. 2-A LIVA). Con `||` en vez de
      // `??`, el 0 era falsy y se guardaba 0.16: la panadería entera nacía al
      // 16 % y no había forma de darla de alta bien.
      const producto = await service.create({ ...base, tax_rate: 0 });

      expect(producto.taxRate).toBe(0);
      expect(
        mockPrismaService.product.create.mock.calls[0][0].data.taxRate,
      ).toBe(0);
    });

    it('sigue poniendo el 16 % cuando no se dice nada', async () => {
      const producto = await service.create(base);

      expect(producto.taxRate).toBe(0.16);
    });

    it('guarda que el precio ya lleva el IVA dentro', async () => {
      // El DTO lo aceptaba y el servicio lo tiraba, así que el producto nacía
      // siempre como «más IVA» dijera lo que dijera quien lo creaba.
      const producto = await service.create({ ...base, tax_included: true });

      expect(producto.taxIncluded).toBe(true);
    });

    it('por defecto el IVA va dentro del precio', async () => {
      // Es lo normal en Mexico: el articulo 7 bis de la LFPC obliga a exhibir
      // el precio total, asi que quien da de alta un producto esta tecleando lo
      // que va a pagar el cliente. El default contrario cobraba un 16 % encima
      // del precio de la carta.
      const producto = await service.create(base);

      expect(producto.taxIncluded).toBe(true);
    });

    it('deja marcar explicitamente que el IVA va por fuera', async () => {
      const producto = await service.create({ ...base, tax_included: false });

      expect(producto.taxIncluded).toBe(false);
    });

    it('permite cambiar la tasa a 0 en una actualización', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct({ id: 'p1' }),
      );
      mockPrismaService.product.update.mockImplementation(
        async ({ data }: any) => buildPrismaProduct({ id: 'p1', ...data }),
      );

      const producto = await service.update('p1', { tax_rate: 0 });

      expect(producto.taxRate).toBe(0);
    });

    it('permite cambiar el IVA incluido en una actualización', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct({ id: 'p1' }),
      );
      mockPrismaService.product.update.mockImplementation(
        async ({ data }: any) => buildPrismaProduct({ id: 'p1', ...data }),
      );

      const producto = await service.update('p1', { tax_included: true });

      expect(producto.taxIncluded).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all products from prisma', async () => {
      const rows = [
        buildPrismaProduct({ id: 'p1', name: 'Espresso Doble' }),
        buildPrismaProduct({ id: 'p2', name: 'Latte', sku: 'CAFE-LAT-001' }),
        buildPrismaProduct({ id: 'p3', name: 'Mocha', sku: 'CAFE-MOC-001' }),
      ];
      mockPrismaService.product.findMany.mockResolvedValue(rows);

      const products = await service.findAll();

      expect(products).toBe(rows);
      expect(products).toHaveLength(3);
      // No org / filters → empty where, name asc ordering, includes.
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          category: true,
          productModifiers: { include: { modifier: true } },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should filter by organizationId (2nd argument)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      const orgId = '123e4567-e89b-12d3-a456-426614174000';

      await service.findAll(undefined, orgId);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: orgId } }),
      );
    });

    it('should filter by category_id', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ category_id: 'cat-002' } as any);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoryId: 'cat-002' } }),
      );
    });

    it('should build a case-insensitive OR search on name/sku/description', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'Latte' } as any);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'Latte', mode: 'insensitive' } },
              { sku: { contains: 'Latte', mode: 'insensitive' } },
              { description: { contains: 'Latte', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should map is_available="true" to active:true filter', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ is_available: 'true' } as any);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
    });

    it('should map is_available="false" to active:false filter', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ is_available: 'false' } as any);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: false } }),
      );
    });

    it('should combine organizationId, category and search filters', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      const orgId = '123e4567-e89b-12d3-a456-426614174000';

      await service.findAll(
        { category_id: 'cat-002', search: 'Mocha' } as any,
        orgId,
      );

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: orgId,
            categoryId: 'cat-002',
            OR: [
              { name: { contains: 'Mocha', mode: 'insensitive' } },
              { sku: { contains: 'Mocha', mode: 'insensitive' } },
              { description: { contains: 'Mocha', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      const row = buildPrismaProduct({ id: 'prod-42' });
      mockPrismaService.product.findUnique.mockResolvedValue(row);

      const found = await service.findById('prod-42');

      expect(found).toBe(row);
      expect(found.id).toBe('prod-42');
      expect(found.name).toBe('Espresso Doble');
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-42' },
        include: {
          category: true,
          productModifiers: { include: { modifier: true } },
        },
      });
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when product belongs to another org', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct({ organizationId: 'org-A' }),
      );

      await expect(service.findById('prod-42', 'org-B')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the product when org matches', async () => {
      const row = buildPrismaProduct({ organizationId: 'org-A' });
      mockPrismaService.product.findUnique.mockResolvedValue(row);

      const found = await service.findById('prod-42', 'org-A');
      expect(found).toBe(row);
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      const row = buildPrismaProduct();
      mockPrismaService.product.findFirst.mockResolvedValue(row);

      const found = await service.findBySku('CAFE-ESP-001');

      expect(found).toBe(row);
      expect(found.sku).toBe('CAFE-ESP-001');
      expect(found.name).toBe('Espresso Doble');
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: { sku: 'CAFE-ESP-001' },
        include: {
          category: true,
          productModifiers: { include: { modifier: true } },
        },
      });
    });

    it('should scope by organizationId when provided', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(
        buildPrismaProduct(),
      );

      await service.findBySku('CAFE-ESP-001', 'org-A');

      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sku: 'CAFE-ESP-001', organizationId: 'org-A' },
        }),
      );
    });

    it('should throw NotFoundException for non-existent SKU', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.findBySku('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update product fields and map snake_case to camelCase', async () => {
      // findById (findUnique) inside update returns the existing product.
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct(),
      );
      const updatedRow = buildPrismaProduct({
        name: 'Espresso Triple',
        price: 60,
        basePrice: 60,
      });
      mockPrismaService.product.update.mockResolvedValue(updatedRow);

      const updated = await service.update('prod-uuid-1', {
        name: 'Espresso Triple',
        base_price: 60,
      });

      expect(updated).toBe(updatedRow);
      expect(updated.name).toBe('Espresso Triple');
      expect(updated.basePrice).toBe(60);
      expect(updated.sku).toBe('CAFE-ESP-001'); // unchanged

      // base_price maps to BOTH price and basePrice.
      expect(mockPrismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-uuid-1' },
          data: expect.objectContaining({
            name: 'Espresso Triple',
            price: 60,
            basePrice: 60,
          }),
        }),
      );
    });

    it('should update SKU if unique within org', async () => {
      // findById call
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce(buildPrismaProduct()) // findById
        .mockResolvedValueOnce({ organizationId: 'org-A' }); // org lookup for SKU check
      mockPrismaService.product.findFirst.mockResolvedValue(null); // no other product with that SKU
      const updatedRow = buildPrismaProduct({ sku: 'CAFE-ESP-002' });
      mockPrismaService.product.update.mockResolvedValue(updatedRow);

      const updated = await service.update('prod-uuid-1', {
        sku: 'CAFE-ESP-002',
      });

      expect(updated.sku).toBe('CAFE-ESP-002');
      // SKU dup check excludes the current id.
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          sku: 'CAFE-ESP-002',
          NOT: { id: 'prod-uuid-1' },
        }),
      });
    });

    it('should throw ConflictException when updating to an existing SKU', async () => {
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce(buildPrismaProduct()) // findById
        .mockResolvedValueOnce({ organizationId: 'org-A' }); // org lookup
      // Another product already uses the SKU.
      mockPrismaService.product.findFirst.mockResolvedValue(
        buildPrismaProduct({ id: 'other-prod', sku: 'CAFE-ESP-002' }),
      );

      await expect(
        service.update('prod-uuid-1', { sku: 'CAFE-ESP-002' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null); // findById → not found

      await expect(
        service.update('non-existent-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a product after verifying it exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct(),
      );
      mockPrismaService.product.delete.mockResolvedValue(buildPrismaProduct());

      await expect(service.delete('prod-uuid-1')).resolves.toBeUndefined();

      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-uuid-1' },
      });
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.product.delete).not.toHaveBeenCalled();
    });
  });

  describe('Modifiers', () => {
    it('getModifiers should return the modifier objects mapped from productModifier rows', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct(),
      );
      const modA = { id: 'mod-1', name: 'Extra Shot', price: 10 };
      const modB = { id: 'mod-2', name: 'Leche de Almendras', price: 15 };
      mockPrismaService.productModifier.findMany.mockResolvedValue([
        {
          id: 'pm-1',
          productId: 'prod-uuid-1',
          modifierId: 'mod-1',
          modifier: modA,
        },
        {
          id: 'pm-2',
          productId: 'prod-uuid-1',
          modifierId: 'mod-2',
          modifier: modB,
        },
      ]);

      const modifiers = await service.getModifiers('prod-uuid-1');

      // Service returns productModifiers.map(pm => pm.modifier).
      expect(modifiers).toHaveLength(2);
      expect(modifiers).toEqual([modA, modB]);
      expect(mockPrismaService.productModifier.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-uuid-1' },
        include: { modifier: true },
      });
    });

    it('getModifiers should throw NotFoundException if product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.getModifiers('nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('createModifier should link a modifier to a product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct(),
      );
      const linkRow = {
        id: 'pm-1',
        productId: 'prod-uuid-1',
        modifierId: 'mod-1',
        modifier: { id: 'mod-1', name: 'Extra Shot' },
        product: buildPrismaProduct(),
      };
      mockPrismaService.productModifier.create.mockResolvedValue(linkRow);

      const result = await service.createModifier('prod-uuid-1', 'mod-1');

      expect(result).toBe(linkRow);
      expect(mockPrismaService.productModifier.create).toHaveBeenCalledWith({
        data: { productId: 'prod-uuid-1', modifierId: 'mod-1' },
        include: { modifier: true, product: true },
      });
    });

    it('deleteModifier should remove an existing product-modifier link', async () => {
      mockPrismaService.productModifier.findFirst.mockResolvedValue({
        id: 'pm-1',
        productId: 'prod-uuid-1',
        modifierId: 'mod-1',
      });
      mockPrismaService.productModifier.delete.mockResolvedValue({
        id: 'pm-1',
      });

      await expect(
        service.deleteModifier('prod-uuid-1', 'mod-1'),
      ).resolves.toBeUndefined();

      expect(mockPrismaService.productModifier.delete).toHaveBeenCalledWith({
        where: { id: 'pm-1' },
      });
    });

    it('deleteModifier should throw NotFoundException when link is missing', async () => {
      mockPrismaService.productModifier.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteModifier('prod-uuid-1', 'missing-mod'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.productModifier.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('should throw BadRequestException for non-tracked inventory', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct({ trackInventory: false, name: 'NoTrack' }),
      );

      await expect(
        service.updateStock('prod-uuid-1', 10, 'add'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.updateStock('nope', 10, 'add')).rejects.toThrow(
        NotFoundException,
      );
    });

    // Current behavior (documented, not necessarily desired): even when inventory
    // tracking IS enabled, updateStock always rejects because stock mutations are
    // delegated to the Inventory module. It never actually changes a quantity.
    it('should throw BadRequestException directing to Inventory module even when tracking is enabled', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(
        buildPrismaProduct({ trackInventory: true }),
      );

      await expect(
        service.updateStock('prod-uuid-1', 50, 'add'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStock('prod-uuid-1', 50, 'add'),
      ).rejects.toThrow(/Inventory module/);
    });
  });

  describe('getStats', () => {
    it('should aggregate product statistics from count + findMany', async () => {
      mockPrismaService.product.count.mockResolvedValue(3);
      mockPrismaService.product.findMany.mockResolvedValue([
        { price: 45, cost: 12, active: true, trackInventory: true },
        { price: 80, cost: 20, active: false, trackInventory: false },
        { price: 55, cost: 0, active: true, trackInventory: false },
      ]);

      const stats = await service.getStats();

      expect(stats.total_products).toBe(3);
      expect(stats.active_products).toBe(2);
      expect(stats.inactive_products).toBe(1);
      // average_price = (45 + 80 + 55) / 3 = 60
      expect(stats.average_price).toBe(60);
      // margins only counted for products with cost > 0:
      //   (45-12)/45*100 = 73.333..., (80-20)/80*100 = 75 → avg = 74.17 (rounded)
      expect(stats.average_margin).toBe(74.17);
    });

    it('should return zeros when there are no products', async () => {
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats.total_products).toBe(0);
      expect(stats.active_products).toBe(0);
      expect(stats.inactive_products).toBe(0);
      expect(stats.average_price).toBe(0);
      expect(stats.average_margin).toBe(0);
    });

    it('should scope the aggregation by organizationId', async () => {
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.getStats('org-A');

      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-A' },
      });
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-A' } }),
      );
    });
  });

  describe('analyzeProfitability', () => {
    it('should return profitability analysis sorted by score descending', async () => {
      // findMany already filters cost > 0; provide two rows.
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'p-high',
          name: 'High Margin Product',
          sku: 'HIGH',
          price: 100,
          cost: 20, // 80% margin
        },
        {
          id: 'p-low',
          name: 'Low Margin Product',
          sku: 'LOW-MARGIN',
          price: 50,
          cost: 45, // 10% margin
        },
      ]);

      const profitability = await service.analyzeProfitability();

      expect(profitability).toHaveLength(2);
      expect(profitability[0].profitability_score).toBeGreaterThan(
        profitability[1].profitability_score,
      );
      expect(profitability[0].margin_percentage).toBeGreaterThan(
        profitability[1].margin_percentage,
      );
      // Only the cost>0 filter is asserted on the query.
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cost: { gt: 0 } }),
        }),
      );
    });

    it('should calculate margins correctly', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'P', sku: 'P', price: 100, cost: 40 },
      ]);

      const profitability = await service.analyzeProfitability();

      expect(profitability[0].margin_amount).toBe(60); // 100 - 40
      expect(profitability[0].margin_percentage).toBe(60); // (60/100)*100
      expect(profitability[0].product_id).toBe('p1');
      expect(profitability[0].base_price).toBe(100);
      expect(profitability[0].cost).toBe(40);
    });

    it('should return an empty array when no products have a cost', async () => {
      // The service-level where (cost > 0) excludes costless products, so prisma
      // returns nothing.
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const profitability = await service.analyzeProfitability();

      expect(profitability).toHaveLength(0);
    });

    it('should scope by organizationId when provided', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.analyzeProfitability('org-A');

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cost: { gt: 0 },
            organizationId: 'org-A',
          }),
        }),
      );
    });
  });
});
