import { Test, TestingModule } from '@nestjs/testing';
import { TaxesController } from './taxes.controller';
import { TaxesService } from './taxes.service';
import { TaxCategory } from './dto/create-tax.dto';
import { CurrentUserType } from '../auth/decorators/current-user.decorator';

const mockUser: CurrentUserType = {
  userId: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  organizationId: 'org-1',
};

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
    it('should create a tax scoped to the user organization', async () => {
      const dto = {
        name: 'IVA 16%',
        category: TaxCategory.IVA,
        rate: 0.16,
        organizationId: 'other-org',
      };
      const result = { id: '1', ...dto, organizationId: 'org-1' };

      mockTaxesService.create.mockResolvedValue(result);

      expect(await controller.create(dto, mockUser)).toEqual(result);
      // El organizationId del body se sobrescribe con el del JWT
      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        organizationId: 'org-1',
      });
    });
  });

  describe('findAll', () => {
    it('should return all taxes for the user organization', async () => {
      const query = { skip: 0, take: 10 };
      const result = [{ id: '1', name: 'IVA 16%' }];

      mockTaxesService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(query, mockUser)).toEqual(result);
      expect(service.findAll).toHaveBeenCalledWith(query, 'org-1');
    });
  });

  describe('findActive', () => {
    it('should return active taxes', async () => {
      const result = [{ id: '1', name: 'IVA 16%', isActive: true }];

      mockTaxesService.findActive.mockResolvedValue(result);

      expect(await controller.findActive(mockUser)).toEqual(result);
      expect(service.findActive).toHaveBeenCalledWith('org-1');
    });
  });

  describe('findByCategory', () => {
    it('should return taxes by category', async () => {
      const category = 'IVA';
      const result = [{ id: '1', category: 'IVA' }];

      mockTaxesService.findByCategory.mockResolvedValue(result);

      expect(await controller.findByCategory(category, mockUser)).toEqual(
        result,
      );
      expect(service.findByCategory).toHaveBeenCalledWith(category, 'org-1');
    });
  });

  describe('findOne', () => {
    it('should return a tax by id', async () => {
      const id = '1';
      const result = { id, name: 'IVA 16%' };

      mockTaxesService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(id, mockUser)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(id, 'org-1');
    });
  });

  describe('update', () => {
    it('should update a tax', async () => {
      const id = '1';
      const dto = { name: 'Updated Name' };
      const result = { id, ...dto };

      mockTaxesService.update.mockResolvedValue(result);

      expect(await controller.update(id, dto, mockUser)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(id, dto, 'org-1');
    });
  });

  describe('remove', () => {
    it('should delete a tax', async () => {
      const id = '1';
      const result = { id };

      mockTaxesService.remove.mockResolvedValue(result);

      expect(await controller.remove(id, mockUser)).toEqual(result);
      expect(service.remove).toHaveBeenCalledWith(id, 'org-1');
    });
  });
});
