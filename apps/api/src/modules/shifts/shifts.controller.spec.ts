import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsController } from './shifts.controller';
import { ShiftsService, ShiftStatus } from './shifts.service';

describe('ShiftsController', () => {
  let controller: ShiftsController;
  let service: ShiftsService;

  const mockShiftsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByStatus: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    close: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [
        {
          provide: ShiftsService,
          useValue: mockShiftsService,
        },
      ],
    }).compile();

    controller = module.get<ShiftsController>(ShiftsController);
    service = module.get<ShiftsService>(ShiftsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should open a new shift', async () => {
      const dto = {
        openingCash: 1000,
        userId: 'user-1',
        locationId: 'loc-1',
        organizationId: 'org-1',
      };
      const result = { id: '1', ...dto, status: ShiftStatus.OPEN };

      mockShiftsService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all shifts', async () => {
      const query = { skip: 0, take: 10 };
      const result = [{ id: '1', openingCash: 1000 }];

      mockShiftsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(query)).toEqual(result);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findActive', () => {
    it('should return active shift', async () => {
      const result = { id: '1', status: ShiftStatus.OPEN };

      mockShiftsService.findActive.mockResolvedValue(result);

      expect(await controller.findActive()).toEqual(result);
      expect(service.findActive).toHaveBeenCalled();
    });
  });

  describe('findByStatus', () => {
    it('should return shifts by status', async () => {
      const status = 'OPEN';
      const result = [{ id: '1', status }];

      mockShiftsService.findByStatus.mockResolvedValue(result);

      expect(await controller.findByStatus(status)).toEqual(result);
      expect(service.findByStatus).toHaveBeenCalledWith(status);
    });
  });

  describe('findOne', () => {
    it('should return a shift by id', async () => {
      const id = '1';
      const result = { id, openingCash: 1000 };

      mockShiftsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(id)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a shift', async () => {
      const id = '1';
      const dto = { openingNotes: 'Updated' };
      const result = { id, ...dto };

      mockShiftsService.update.mockResolvedValue(result);

      expect(await controller.update(id, dto)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('close', () => {
    it('should close a shift', async () => {
      const id = '1';
      const dto = {
        closingCash: 1200,
        closingCard: 300,
        closingTransfers: 100,
        closingOther: 50,
      };
      const result = { id, status: ShiftStatus.CLOSED };

      mockShiftsService.close.mockResolvedValue(result);

      expect(await controller.close(id, dto)).toEqual(result);
      expect(service.close).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('remove', () => {
    it('should delete a shift', async () => {
      const id = '1';
      const result = { id };

      mockShiftsService.remove.mockResolvedValue(result);

      expect(await controller.remove(id)).toEqual(result);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
