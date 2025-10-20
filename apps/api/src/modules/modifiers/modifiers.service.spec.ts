import { Test, TestingModule } from '@nestjs/testing';
import { ModifiersService } from './modifiers.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateModifierDto, ModifierType } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';

describe('ModifiersService', () => {
  let service: ModifiersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    modifier: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockModifier = {
    id: 'modifier-1',
    name: 'Extra Shot',
    type: ModifierType.EXTRA,
    priceDelta: 10.0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      products: 5,
      ticketLineModifiers: 10,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModifiersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ModifiersService>(ModifiersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateModifierDto = {
      name: 'Extra Shot',
      type: ModifierType.EXTRA,
      priceDelta: 10.0,
    };

    it('should create a modifier successfully', async () => {
      mockPrismaService.modifier.findFirst.mockResolvedValue(null);
      mockPrismaService.modifier.create.mockResolvedValue(mockModifier);

      const result = await service.create(createDto);

      expect(result).toEqual(mockModifier);
      expect(prisma.modifier.create).toHaveBeenCalledWith({
        data: createDto,
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if modifier name+type already exists', async () => {
      mockPrismaService.modifier.findFirst.mockResolvedValue(mockModifier);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated modifiers', async () => {
      const query = { skip: 0, take: 10 };

      mockPrismaService.modifier.findMany.mockResolvedValue([mockModifier]);
      mockPrismaService.modifier.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockModifier],
        total: 1,
        skip: 0,
        take: 10,
      });
    });

    it('should filter by active status', async () => {
      const query = { active: true };

      mockPrismaService.modifier.findMany.mockResolvedValue([mockModifier]);
      mockPrismaService.modifier.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.modifier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('should filter by type', async () => {
      const query = { type: ModifierType.EXTRA };

      mockPrismaService.modifier.findMany.mockResolvedValue([mockModifier]);
      mockPrismaService.modifier.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.modifier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: ModifierType.EXTRA }),
        }),
      );
    });

    it('should search modifiers by name', async () => {
      const query = { search: 'extra' };

      mockPrismaService.modifier.findMany.mockResolvedValue([mockModifier]);
      mockPrismaService.modifier.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.modifier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findAllActive', () => {
    it('should return all active modifiers ordered by type and name', async () => {
      mockPrismaService.modifier.findMany.mockResolvedValue([mockModifier]);

      const result = await service.findAllActive();

      expect(result).toEqual([mockModifier]);
      expect(prisma.modifier.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        include: expect.any(Object),
      });
    });
  });

  describe('findByType', () => {
    it('should return modifiers by type', async () => {
      mockPrismaService.modifier.findMany.mockResolvedValue([mockModifier]);

      const result = await service.findByType('EXTRA');

      expect(result).toEqual([mockModifier]);
      expect(prisma.modifier.findMany).toHaveBeenCalledWith({
        where: { type: 'EXTRA', active: true },
        orderBy: { name: 'asc' },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException for invalid type', async () => {
      await expect(service.findByType('INVALID')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a modifier by id', async () => {
      mockPrismaService.modifier.findUnique.mockResolvedValue(mockModifier);

      const result = await service.findOne('modifier-1');

      expect(result).toEqual(mockModifier);
    });

    it('should throw NotFoundException if modifier not found', async () => {
      mockPrismaService.modifier.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findModifierProducts', () => {
    it('should return products for a modifier', async () => {
      const modifierWithProducts = {
        ...mockModifier,
        products: [
          {
            product: {
              id: 'product-1',
              name: 'Espresso',
              sku: 'ESP-01',
              price: 35.0,
              active: true,
            },
          },
        ],
      };

      mockPrismaService.modifier.findUnique.mockResolvedValue(
        modifierWithProducts,
      );

      const result = await service.findModifierProducts('modifier-1');

      expect(result).toEqual([modifierWithProducts.products[0].product]);
    });

    it('should throw NotFoundException if modifier not found', async () => {
      mockPrismaService.modifier.findUnique.mockResolvedValue(null);

      await expect(service.findModifierProducts('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateModifierDto = {
      priceDelta: 15.0,
    };

    it('should update a modifier successfully', async () => {
      const updatedModifier = { ...mockModifier, priceDelta: 15.0 };

      mockPrismaService.modifier.findUnique.mockResolvedValue(mockModifier);
      mockPrismaService.modifier.update.mockResolvedValue(updatedModifier);

      const result = await service.update('modifier-1', updateDto);

      expect(result).toEqual(updatedModifier);
    });

    it('should throw NotFoundException if modifier not found', async () => {
      mockPrismaService.modifier.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if new name+type already exists', async () => {
      const updateWithName: UpdateModifierDto = {
        name: 'Double Shot',
        type: ModifierType.EXTRA,
      };
      const existingModifier = { ...mockModifier, id: 'other-id' };

      mockPrismaService.modifier.findUnique.mockResolvedValue(mockModifier);
      mockPrismaService.modifier.findFirst.mockResolvedValue(existingModifier);

      await expect(
        service.update('modifier-1', updateWithName),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete modifier if used in products or tickets', async () => {
      const modifierInUse = {
        ...mockModifier,
        _count: { products: 5, ticketLineModifiers: 10 },
      };

      mockPrismaService.modifier.findUnique.mockResolvedValue(modifierInUse);
      mockPrismaService.modifier.update.mockResolvedValue({
        ...modifierInUse,
        active: false,
      });

      await service.remove('modifier-1');

      expect(prisma.modifier.update).toHaveBeenCalledWith({
        where: { id: 'modifier-1' },
        data: { active: false },
      });
      expect(prisma.modifier.delete).not.toHaveBeenCalled();
    });

    it('should hard delete modifier if not used', async () => {
      const modifierNotInUse = {
        ...mockModifier,
        _count: { products: 0, ticketLineModifiers: 0 },
      };

      mockPrismaService.modifier.findUnique.mockResolvedValue(modifierNotInUse);
      mockPrismaService.modifier.delete.mockResolvedValue(mockModifier);

      await service.remove('modifier-1');

      expect(prisma.modifier.delete).toHaveBeenCalledWith({
        where: { id: 'modifier-1' },
      });
      expect(prisma.modifier.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if modifier not found', async () => {
      mockPrismaService.modifier.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
