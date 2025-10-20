import { Test, TestingModule } from '@nestjs/testing';
import { TaxesController } from './taxes.controller';
import { TaxesService, TaxCategory } from './taxes.service';

describe('TaxesController', () => {
  let controller: TaxesController;
  let service: TaxesService;

  const mockTaxesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByCategory: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxesController],
      providers: [
        {
          provide: TaxesService,
          useValue: mockTaxesService,
        },
      ],
    }).compile();

    controller = module.get<TaxesController>(TaxesController);
    service = module.get<TaxesService>(TaxesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tax', async () => {
      const dto = {
        name: 'IVA 16%',
        category: TaxCategory.IVA,
        rate: 16,
        organizationId: 'org-1',
      };
      const result = { id: '1', ...dto };

      mockTaxesService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all taxes', async () => {
      const query = { skip: 0, take: 10 };
      const result = [{ id: '1', name: 'IVA 16%' }];

      mockTaxesService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(query)).toEqual(result);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findActive', () => {
    it('should return active taxes', async () => {
      const result = [{ id: '1', name: 'IVA 16%', isActive: true }];

      mockTaxesService.findActive.mockResolvedValue(result);

      expect(await controller.findActive()).toEqual(result);
      expect(service.findActive).toHaveBeenCalled();
    });
  });

  describe('findByCategory', () => {
    it('should return taxes by category', async () => {
      const category = 'IVA';
      const result = [{ id: '1', category: 'IVA' }];

      mockTaxesService.findByCategory.mockResolvedValue(result);

      expect(await controller.findByCategory(category)).toEqual(result);
      expect(service.findByCategory).toHaveBeenCalledWith(category);
    });
  });

  describe('findOne', () => {
    it('should return a tax by id', async () => {
      const id = '1';
      const result = { id, name: 'IVA 16%' };

      mockTaxesService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(id)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a tax', async () => {
      const id = '1';
      const dto = { name: 'Updated Name' };
      const result = { id, ...dto };

      mockTaxesService.update.mockResolvedValue(result);

      expect(await controller.update(id, dto)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('remove', () => {
    it('should delete a tax', async () => {
      const id = '1';
      const result = { id };

      mockTaxesService.remove.mockResolvedValue(result);

      expect(await controller.remove(id)).toEqual(result);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
