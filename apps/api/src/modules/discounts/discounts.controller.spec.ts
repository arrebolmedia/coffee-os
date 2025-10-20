import { Test, TestingModule } from '@nestjs/testing';
import { DiscountsController } from './discounts.controller';
import { DiscountsService, DiscountType } from './discounts.service';

describe('DiscountsController', () => {
  let controller: DiscountsController;
  let service: DiscountsService;

  const mockDiscountsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByType: jest.fn(),
    findByCode: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountsController],
      providers: [
        {
          provide: DiscountsService,
          useValue: mockDiscountsService,
        },
      ],
    }).compile();

    controller = module.get<DiscountsController>(DiscountsController);
    service = module.get<DiscountsService>(DiscountsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a discount', async () => {
      const dto = {
        code: 'SUMMER2024',
        name: 'Summer Sale',
        type: DiscountType.PERCENTAGE,
        value: 20,
        organizationId: 'org-1',
      };
      const result = { id: '1', ...dto };

      mockDiscountsService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all discounts', async () => {
      const query = { skip: 0, take: 10 };
      const result = [{ id: '1', code: 'SUMMER2024', name: 'Summer Sale' }];

      mockDiscountsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(query)).toEqual(result);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findActive', () => {
    it('should return active discounts', async () => {
      const result = [{ id: '1', code: 'SUMMER2024', isActive: true }];

      mockDiscountsService.findActive.mockResolvedValue(result);

      expect(await controller.findActive()).toEqual(result);
      expect(service.findActive).toHaveBeenCalled();
    });
  });

  describe('findByType', () => {
    it('should return discounts by type', async () => {
      const type = 'PERCENTAGE';
      const result = [{ id: '1', type: 'PERCENTAGE' }];

      mockDiscountsService.findByType.mockResolvedValue(result);

      expect(await controller.findByType(type)).toEqual(result);
      expect(service.findByType).toHaveBeenCalledWith(type);
    });
  });

  describe('findByCode', () => {
    it('should return discount by code', async () => {
      const code = 'SUMMER2024';
      const result = { id: '1', code };

      mockDiscountsService.findByCode.mockResolvedValue(result);

      expect(await controller.findByCode(code)).toEqual(result);
      expect(service.findByCode).toHaveBeenCalledWith(code);
    });
  });

  describe('findOne', () => {
    it('should return a discount by id', async () => {
      const id = '1';
      const result = { id, code: 'SUMMER2024' };

      mockDiscountsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(id)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a discount', async () => {
      const id = '1';
      const dto = { name: 'Updated Name' };
      const result = { id, ...dto };

      mockDiscountsService.update.mockResolvedValue(result);

      expect(await controller.update(id, dto)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('activate', () => {
    it('should activate a discount', async () => {
      const id = '1';
      const result = { id, isActive: true };

      mockDiscountsService.activate.mockResolvedValue(result);

      expect(await controller.activate(id)).toEqual(result);
      expect(service.activate).toHaveBeenCalledWith(id);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a discount', async () => {
      const id = '1';
      const result = { id, isActive: false };

      mockDiscountsService.deactivate.mockResolvedValue(result);

      expect(await controller.deactivate(id)).toEqual(result);
      expect(service.deactivate).toHaveBeenCalledWith(id);
    });
  });

  describe('remove', () => {
    it('should delete a discount', async () => {
      const id = '1';
      const result = { id };

      mockDiscountsService.remove.mockResolvedValue(result);

      expect(await controller.remove(id)).toEqual(result);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
