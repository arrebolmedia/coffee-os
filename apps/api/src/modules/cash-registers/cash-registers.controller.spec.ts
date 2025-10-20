import { Test, TestingModule } from '@nestjs/testing';
import { CashRegistersController } from './cash-registers.controller';
import { CashRegistersService } from './cash-registers.service';

describe('CashRegistersController', () => {
  let controller: CashRegistersController;
  let service: CashRegistersService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByShift: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    recordDenominations: jest.fn(),
    recordExpense: jest.fn(),
    getSummary: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashRegistersController],
      providers: [
        {
          provide: CashRegistersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CashRegistersController>(CashRegistersController);
    service = module.get<CashRegistersService>(CashRegistersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a cash register', async () => {
      const dto = {
        shiftId: 'shift-1',
        expectedCash: 5000,
        locationId: 'loc-1',
        organizationId: 'org-1',
      };
      const result = { id: '1', ...dto };

      mockService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all cash registers', async () => {
      const query = { skip: 0, take: 10 };
      const result = [{ id: '1', expectedCash: 5000 }];

      mockService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(query)).toEqual(result);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findByShift', () => {
    it('should return cash register by shift', async () => {
      const shiftId = 'shift-1';
      const result = { id: '1', shiftId };

      mockService.findByShift.mockResolvedValue(result);

      expect(await controller.findByShift(shiftId)).toEqual(result);
      expect(service.findByShift).toHaveBeenCalledWith(shiftId);
    });
  });

  describe('findOne', () => {
    it('should return a cash register by id', async () => {
      const id = '1';
      const result = { id, expectedCash: 5000 };

      mockService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(id)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a cash register', async () => {
      const id = '1';
      const dto = { notes: 'Updated' };
      const result = { id, ...dto };

      mockService.update.mockResolvedValue(result);

      expect(await controller.update(id, dto)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('recordDenominations', () => {
    it('should record denominations', async () => {
      const id = '1';
      const dto = {
        1000: 5,
        500: 10,
        200: 20,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        2: 0,
        1: 0,
        0.5: 0,
      };
      const result = { id, countedCash: 12000 };

      mockService.recordDenominations.mockResolvedValue(result);

      expect(await controller.recordDenominations(id, dto)).toEqual(result);
      expect(service.recordDenominations).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('recordExpense', () => {
    it('should record an expense', async () => {
      const id = '1';
      const dto = { amount: 500, description: 'Cambio' };
      const result = { id, totalExpenses: 500 };

      mockService.recordExpense.mockResolvedValue(result);

      expect(await controller.recordExpense(id, dto)).toEqual(result);
      expect(service.recordExpense).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('getSummary', () => {
    it('should return cash register summary', async () => {
      const id = '1';
      const result = {
        id,
        expectedCash: 5000,
        countedCash: 5200,
        variance: 200,
      };

      mockService.getSummary.mockResolvedValue(result);

      expect(await controller.getSummary(id)).toEqual(result);
      expect(service.getSummary).toHaveBeenCalledWith(id);
    });
  });

  describe('remove', () => {
    it('should delete a cash register', async () => {
      const id = '1';
      const result = { id };

      mockService.remove.mockResolvedValue(result);

      expect(await controller.remove(id)).toEqual(result);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
