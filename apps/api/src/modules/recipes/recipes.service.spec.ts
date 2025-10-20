import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from './recipes.service';
import { PrismaService } from '../database/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { QueryRecipesDto } from './dto/query-recipes.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RecipesService', () => {
  let service: RecipesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    recipe: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
    },
    recipeIngredient: {
      deleteMany: jest.fn(),
    },
  };

  const mockRecipe = {
    id: 'recipe-1',
    productId: 'product-1',
    name: 'Latte Recipe',
    description: 'Classic latte recipe',
    servings: 1,
    prepTimeMinutes: 5,
    instructions: 'Steam milk, pull espresso, combine',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: 'product-1',
      name: 'Latte',
      sku: 'LAT-001',
    },
    ingredients: [
      {
        id: 'ing-1',
        recipeId: 'recipe-1',
        inventoryItemId: 'inv-1',
        quantity: 240,
        unit: 'ml',
        inventoryItem: {
          id: 'inv-1',
          code: 'MILK-001',
          name: 'Whole Milk',
          costPerUnit: 0.02,
          unitOfMeasure: 'ml',
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateRecipeDto = {
      productId: 'product-1',
      name: 'Latte Recipe',
      servings: 1,
      ingredients: [
        {
          inventoryItemId: 'inv-1',
          quantity: 240,
          unit: 'ml',
        },
      ],
    };

    it('should create a recipe with ingredients', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
      });
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        { id: 'inv-1' },
      ]);
      mockPrismaService.recipe.create.mockResolvedValue(mockRecipe);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRecipe);
      expect(prisma.product.findUnique).toHaveBeenCalled();
      expect(prisma.inventoryItem.findMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if ingredient not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
      });
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([]);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated recipes', async () => {
      const query: QueryRecipesDto = {
        skip: 0,
        take: 10,
      };

      mockPrismaService.recipe.findMany.mockResolvedValue([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockRecipe],
        total: 1,
        skip: 0,
        take: 10,
      });
    });

    it('should filter by active status', async () => {
      const query: QueryRecipesDto = {
        skip: 0,
        take: 10,
        active: true,
      };

      mockPrismaService.recipe.findMany.mockResolvedValue([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it('should filter by productId', async () => {
      const query: QueryRecipesDto = {
        skip: 0,
        take: 10,
        productId: 'product-1',
      };

      mockPrismaService.recipe.findMany.mockResolvedValue([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-1',
          }),
        }),
      );
    });

    it('should search by name or description', async () => {
      const query: QueryRecipesDto = {
        skip: 0,
        take: 10,
        search: 'latte',
      };

      mockPrismaService.recipe.findMany.mockResolvedValue([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'latte', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findAllActive', () => {
    it('should return all active recipes', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue([mockRecipe]);

      const result = await service.findAllActive();

      expect(result).toEqual([mockRecipe]);
      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });
  });

  describe('findByProduct', () => {
    it('should return recipes for a product', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue([mockRecipe]);

      const result = await service.findByProduct('product-1');

      expect(result).toEqual([mockRecipe]);
      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId: 'product-1',
            active: true,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a recipe by id', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await service.findOne('recipe-1');

      expect(result).toEqual(mockRecipe);
    });

    it('should throw NotFoundException if recipe not found', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateCost', () => {
    it('should calculate total recipe cost', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await service.calculateCost('recipe-1');

      expect(result.totalCost).toBe(4.8); // 240 * 0.02
      expect(result.ingredients).toHaveLength(1);
      expect(result.currency).toBe('MXN');
    });

    it('should handle ingredients without cost', async () => {
      const recipeNoCost = {
        ...mockRecipe,
        ingredients: [
          {
            ...mockRecipe.ingredients[0],
            inventoryItem: {
              ...mockRecipe.ingredients[0].inventoryItem,
              costPerUnit: null,
            },
          },
        ],
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(recipeNoCost);

      const result = await service.calculateCost('recipe-1');

      expect(result.totalCost).toBe(0);
    });
  });

  describe('update', () => {
    const updateDto: UpdateRecipeDto = {
      prepTimeMinutes: 4,
    };

    it('should update a recipe', async () => {
      const updatedRecipe = { ...mockRecipe, prepTimeMinutes: 4 };
      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrismaService.recipe.update.mockResolvedValue(updatedRecipe);

      const result = await service.update('recipe-1', updateDto);

      expect(result.prepTimeMinutes).toBe(4);
    });

    it('should throw NotFoundException if recipe not found', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update ingredients if provided', async () => {
      const updateWithIngredients: UpdateRecipeDto = {
        ingredients: [
          {
            inventoryItemId: 'inv-2',
            quantity: 300,
            unit: 'ml',
          },
        ],
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([
        { id: 'inv-2' },
      ]);
      mockPrismaService.recipeIngredient.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.recipe.update.mockResolvedValue(mockRecipe);

      await service.update('recipe-1', updateWithIngredients);

      expect(prisma.recipeIngredient.deleteMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if new product not found', async () => {
      const updateWithProduct: UpdateRecipeDto = {
        productId: 'non-existent-product',
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('recipe-1', updateWithProduct),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a recipe and its ingredients', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrismaService.recipeIngredient.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.recipe.delete.mockResolvedValue(mockRecipe);

      await service.remove('recipe-1');

      expect(prisma.recipeIngredient.deleteMany).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' },
      });
      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });
    });

    it('should throw NotFoundException if recipe not found', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
