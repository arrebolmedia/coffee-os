import { Test, TestingModule } from '@nestjs/testing';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { CreateModifierDto, ModifierType } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { QueryModifiersDto } from './dto/query-modifiers.dto';

describe('ModifiersController', () => {
  let controller: ModifiersController;
  let service: ModifiersService;

  const mockModifiersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findByType: jest.fn(),
    findOne: jest.fn(),
    findModifierProducts: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      controllers: [ModifiersController],
      providers: [
        {
          provide: ModifiersService,
          useValue: mockModifiersService,
        },
      ],
    }).compile();

    controller = module.get<ModifiersController>(ModifiersController);
    service = module.get<ModifiersService>(ModifiersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a modifier', async () => {
      const createDto: CreateModifierDto = {
        name: 'Extra Shot',
        type: ModifierType.EXTRA,
        priceDelta: 10.0,
      };

      mockModifiersService.create.mockResolvedValue(mockModifier);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockModifier);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated modifiers', async () => {
      const query: QueryModifiersDto = {
        skip: 0,
        take: 10,
      };

      const paginatedResult = {
        items: [mockModifier],
        total: 1,
        skip: 0,
        take: 10,
      };

      mockModifiersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findAllActive', () => {
    it('should return all active modifiers', async () => {
      mockModifiersService.findAllActive.mockResolvedValue([mockModifier]);

      const result = await controller.findAllActive();

      expect(result).toEqual([mockModifier]);
      expect(service.findAllActive).toHaveBeenCalled();
    });
  });

  describe('findByType', () => {
    it('should return modifiers by type', async () => {
      mockModifiersService.findByType.mockResolvedValue([mockModifier]);

      const result = await controller.findByType('EXTRA');

      expect(result).toEqual([mockModifier]);
      expect(service.findByType).toHaveBeenCalledWith('EXTRA');
    });
  });

  describe('findOne', () => {
    it('should return a modifier by id', async () => {
      mockModifiersService.findOne.mockResolvedValue(mockModifier);

      const result = await controller.findOne('modifier-1');

      expect(result).toEqual(mockModifier);
      expect(service.findOne).toHaveBeenCalledWith('modifier-1');
    });
  });

  describe('findProducts', () => {
    it('should return products for a modifier', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Espresso',
          sku: 'ESP-01',
          price: 35.0,
        },
      ];

      mockModifiersService.findModifierProducts.mockResolvedValue(mockProducts);

      const result = await controller.findProducts('modifier-1');

      expect(result).toEqual(mockProducts);
      expect(service.findModifierProducts).toHaveBeenCalledWith('modifier-1');
    });
  });

  describe('update', () => {
    it('should update a modifier', async () => {
      const updateDto: UpdateModifierDto = {
        priceDelta: 15.0,
      };

      const updatedModifier = { ...mockModifier, priceDelta: 15.0 };
      mockModifiersService.update.mockResolvedValue(updatedModifier);

      const result = await controller.update('modifier-1', updateDto);

      expect(result).toEqual(updatedModifier);
      expect(service.update).toHaveBeenCalledWith('modifier-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a modifier', async () => {
      mockModifiersService.remove.mockResolvedValue(undefined);

      await controller.remove('modifier-1');

      expect(service.remove).toHaveBeenCalledWith('modifier-1');
    });
  });
});
