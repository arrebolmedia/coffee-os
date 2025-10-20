import { Test, TestingModule } from '@nestjs/testing';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryMovementsService } from './inventory-movements.service';

describe('InventoryMovementsController', () => {
  let controller: InventoryMovementsController;
  let service: InventoryMovementsService;

  const mockInventoryMovementsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByType: jest.fn(),
    findByItem: jest.fn(),
    findByDateRange: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryMovementsController],
      providers: [
        {
          provide: InventoryMovementsService,
          useValue: mockInventoryMovementsService,
        },
      ],
    }).compile();

    controller = module.get<InventoryMovementsController>(
      InventoryMovementsController,
    );
    service = module.get<InventoryMovementsService>(InventoryMovementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory movement', async () => {
      const createDto = {
        inventoryItemId: 'item-1',
        type: 'IN' as any,
        reason: 'PURCHASE' as any,
        quantity: 50,
        unitCost: 12.5,
      };
      const expectedResult = { id: '1', ...createDto };

      mockInventoryMovementsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated movements', async () => {
      const query = { skip: 0, take: 50 };
      const expectedResult = {
        items: [{ id: '1', quantity: 50 }],
        total: 1,
        skip: 0,
        take: 50,
      };

      mockInventoryMovementsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByType', () => {
    it('should return movements by type', async () => {
      const type = 'IN';
      const expectedResult = [{ id: '1', type, quantity: 50 }];

      mockInventoryMovementsService.findByType.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findByType(type);

      expect(service.findByType).toHaveBeenCalledWith(type);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByItem', () => {
    it('should return movements by inventory item', async () => {
      const itemId = 'item-1';
      const expectedResult = [{ id: '1', inventoryItemId: itemId }];

      mockInventoryMovementsService.findByItem.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findByItem(itemId);

      expect(service.findByItem).toHaveBeenCalledWith(itemId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByDateRange', () => {
    it('should return movements in date range', async () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      const expectedResult = [{ id: '1', quantity: 50 }];

      mockInventoryMovementsService.findByDateRange.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findByDateRange(query);

      expect(service.findByDateRange).toHaveBeenCalledWith(
        query.startDate,
        query.endDate,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a movement by id', async () => {
      const id = '1';
      const expectedResult = { id, quantity: 50, type: 'IN' };

      mockInventoryMovementsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a movement', async () => {
      const id = '1';
      const updateDto = { notes: 'Updated notes' };
      const expectedResult = { id, ...updateDto };

      mockInventoryMovementsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should delete a movement', async () => {
      const id = '1';

      mockInventoryMovementsService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
