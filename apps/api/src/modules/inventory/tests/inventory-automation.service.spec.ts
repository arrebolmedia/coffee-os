import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InventoryAutomationService } from '../inventory-automation.service';
import { AutoDeductConfigService } from '../auto-deduct-config.service';
import { RecipeInventoryLinksService } from '../recipe-inventory-links.service';
import { convertQuantity } from '../unit-conversion';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const ORDER_ID = 'order-1';

/** 1 espresso = 18 g of a coffee item stocked in kg. */
const recipeFixture = {
  id: 'recipe-1',
  name: 'Espresso',
  productId: 'product-1',
  organizationId: ORG,
  yield: 1,
  active: true,
  ingredients: [
    {
      id: 'ing-1',
      recipeId: 'recipe-1',
      inventoryItemId: 'item-1',
      quantity: 18,
      unit: 'g',
      inventoryItem: {
        id: 'item-1',
        name: 'Cafe',
        organizationId: ORG,
        unitOfMeasure: 'kg',
        costPerUnit: 350,
        currentStock: 7,
      },
    },
  ],
};

describe('unit conversion', () => {
  it('converts recipe grams into inventory kilograms', () => {
    expect(convertQuantity(36, 'g', 'kg')).toMatchObject({
      ok: true,
      value: 0.036,
    });
  });

  it('refuses to convert across dimensions instead of guessing', () => {
    const result = convertQuantity(5, 'ml', 'kg');
    expect(result.ok).toBe(false);
    expect(result.value).toBe(0);
    expect(result.reason).toContain('Incompatible units');
  });

  it('refuses unknown units', () => {
    expect(convertQuantity(1, 'puñado', 'kg').ok).toBe(false);
  });
});

describe('InventoryAutomationService', () => {
  let service: InventoryAutomationService;
  let links: RecipeInventoryLinksService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      setting: { findUnique: jest.fn(), upsert: jest.fn() },
      order: { findUnique: jest.fn() },
      location: { findUnique: jest.fn(), findMany: jest.fn() },
      recipe: { findMany: jest.fn(), findFirst: jest.fn() },
      recipeIngredient: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      inventoryItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) =>
        typeof cb === 'function' ? cb(prisma) : Promise.all(cb),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAutomationService,
        // El servicio de configuracion va REAL, no mockeado: los tests de
        // getConfig de aqui abajo prueban justamente como se normaliza el JSON
        // almacenado, y con un mock no probarian nada.
        AutoDeductConfigService,
        RecipeInventoryLinksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(InventoryAutomationService);
    links = module.get(RecipeInventoryLinksService);
  });

  afterEach(() => jest.clearAllMocks());

  // ------------------------------------------------------------------ config

  describe('getConfig', () => {
    it('reports auto-deduction as DISABLED when nothing is persisted', async () => {
      prisma.setting.findUnique.mockResolvedValue(null);

      await expect(service.getConfig(ORG)).resolves.toEqual({
        organization_id: ORG,
        enabled: false,
        deduct_on_order_complete: false,
        deduct_on_order_paid: false,
        allow_negative_stock: false,
        send_low_stock_alerts: false,
        reconciliation_frequency: 'weekly',
      });
    });

    it('returns the persisted value and never trusts a stored organization_id', async () => {
      prisma.setting.findUnique.mockResolvedValue({
        value: { enabled: true, organization_id: OTHER_ORG },
      });

      const config = await service.getConfig(ORG);
      expect(config.enabled).toBe(true);
      expect(config.organization_id).toBe(ORG);
    });
  });

  // --------------------------------------------------------------- deduction

  const arrangeOrder = (overrides: Record<string, any> = {}) => {
    prisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      locationId: 'loc-1',
      status: 'SERVED',
      items: [{ productId: 'product-1', quantity: 2 }],
      ...overrides,
    });
    prisma.location.findUnique.mockResolvedValue({ organizationId: ORG });
    prisma.recipe.findMany.mockResolvedValue([recipeFixture]);
    // La automatización tiene que estar ACTIVA para que deductForOrder haga
    // algo: con la config por defecto (enabled:false) ahora lanza 409. Estos
    // casos prueban la mecánica del descuento, no el interruptor.
    prisma.setting.findUnique.mockResolvedValue({ value: { enabled: true } });
    prisma.inventoryMovement.count.mockResolvedValue(0);
  };

  // Regresiones encontradas por verificación adversarial (2026-08-12):
  // el descuento se ejecutaba con la automatización apagada y sobre órdenes
  // canceladas, fabricando descuadres de inventario permanentes.
  it('rechaza descontar cuando la automatización está desactivada', async () => {
    arrangeOrder();
    prisma.setting.findUnique.mockResolvedValue({ value: { enabled: false } });

    await expect(service.deductForOrder(ORDER_ID, ORG)).rejects.toThrow(
      /desactivado/i,
    );
    expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('rechaza descontar de una orden CANCELLED', async () => {
    arrangeOrder({ status: 'CANCELLED' });

    await expect(service.deductForOrder(ORDER_ID, ORG)).rejects.toThrow(
      /CANCELLED/,
    );
    expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('deducts 2 x 18 g as 0.036 kg and writes a movement', async () => {
    arrangeOrder();
    prisma.inventoryMovement.create.mockResolvedValue({
      id: 'mov-1',
      inventoryItemId: 'item-1',
      quantity: 0.036,
      createdAt: new Date('2026-08-12T00:00:00Z'),
    });

    const result = await service.deductForOrder(ORDER_ID, ORG);

    expect(result.total_items_deducted).toBe(1);
    expect(result.failed_deductions).toHaveLength(0);
    expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventoryItemId: 'item-1',
          type: 'OUT',
          quantity: 0.036,
          reason: 'RECIPE_DEDUCTION',
          reference: `ORDER:${ORDER_ID}`,
        }),
      }),
    );
    // Se escribe el resultado ya redondeado en vez de un `decrement` crudo:
    // el decremento en coma flotante dejaba valores como 6.964000000000001
    // que se acumulan y ensucian el cálculo de discrepancias.
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { currentStock: 6.964 },
    });
  });

  it('rejects a second deduction for the same order (idempotency)', async () => {
    arrangeOrder();
    prisma.inventoryMovement.count
      .mockResolvedValueOnce(1) // deducted
      .mockResolvedValueOnce(0); // reversed

    await expect(service.deductForOrder(ORDER_ID, ORG)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('reports a failure instead of deducting below zero', async () => {
    arrangeOrder();
    prisma.recipe.findMany.mockResolvedValue([
      {
        ...recipeFixture,
        ingredients: [
          {
            ...recipeFixture.ingredients[0],
            inventoryItem: {
              ...recipeFixture.ingredients[0].inventoryItem,
              currentStock: 0,
            },
          },
        ],
      },
    ]);

    const result = await service.deductForOrder(ORDER_ID, ORG);

    expect(result.total_items_deducted).toBe(0);
    expect(result.failed_deductions[0].reason).toContain('Insufficient stock');
    expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('reports a failure when recipe and inventory units are incompatible', async () => {
    arrangeOrder();
    prisma.recipe.findMany.mockResolvedValue([
      {
        ...recipeFixture,
        ingredients: [
          { ...recipeFixture.ingredients[0], unit: 'ml' }, // ml -> kg
        ],
      },
    ]);

    const result = await service.deductForOrder(ORDER_ID, ORG);

    expect(result.total_items_deducted).toBe(0);
    expect(result.failed_deductions[0].reason).toContain('Incompatible units');
  });

  it('warns instead of failing when the product has no recipe', async () => {
    arrangeOrder();
    prisma.recipe.findMany.mockResolvedValue([]);

    const result = await service.deductForOrder(ORDER_ID, ORG);

    expect(result.total_items_deducted).toBe(0);
    expect(result.warnings[0]).toContain('no active recipe');
  });

  it('hides orders belonging to another organization', async () => {
    arrangeOrder();
    prisma.location.findUnique.mockResolvedValue({
      organizationId: OTHER_ORG,
    });

    await expect(service.deductForOrder(ORDER_ID, ORG)).rejects.toThrow(
      NotFoundException,
    );
  });

  // --------------------------------------------------------------- reversal

  it('reverses only the movements that were not reversed yet', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      locationId: 'loc-1',
      items: [],
    });
    prisma.location.findUnique.mockResolvedValue({ organizationId: ORG });
    prisma.inventoryMovement.findMany
      .mockResolvedValueOnce([
        {
          id: 'mov-1',
          inventoryItemId: 'item-1',
          quantity: 0.036,
          unitCost: 350,
          locationId: 'loc-1',
        },
        {
          id: 'mov-2',
          inventoryItemId: 'item-2',
          quantity: 1,
          unitCost: 10,
          locationId: 'loc-1',
        },
      ])
      .mockResolvedValueOnce([{ notes: 'reverses=mov-1' }]);
    prisma.inventoryMovement.create.mockResolvedValue({
      id: 'mov-3',
      inventoryItemId: 'item-2',
      quantity: 1,
      createdAt: new Date(),
    });

    const result = await service.reverseDeduction(ORDER_ID, ORG);

    expect(result.reversed).toBe(1);
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'item-2' },
      data: { currentStock: { increment: 1 } },
    });
  });

  // ------------------------------------------------------------------ links

  it('refuses to create a link whose units cannot be converted', async () => {
    prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1' });
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: 'item-1',
      unitOfMeasure: 'kg',
      costPerUnit: 350,
    });

    await expect(
      links.createLink(ORG, {
        recipe_id: 'recipe-1',
        inventory_item_id: 'item-1',
        conversion_factor: 5,
        unit_mapping: { recipe_unit: 'ml' },
      }),
    ).rejects.toThrow(/Incompatible units/);
  });

  it('hides recipes belonging to another organization', async () => {
    prisma.recipe.findFirst.mockResolvedValue(null);

    await expect(links.getRecipeLinks('recipe-1', ORG)).rejects.toThrow(
      NotFoundException,
    );
  });
});
