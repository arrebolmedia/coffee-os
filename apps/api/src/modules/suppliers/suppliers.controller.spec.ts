import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: SuppliersService;

  const mockSuppliersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockSupplier = {
    id: 'supplier-1',
    code: 'DAIRY-001',
    name: 'Dairy Products Supplier',
    contactName: 'John Doe',
    email: 'john@dairy.com',
    phone: '+1234567890',
    address: '123 Dairy Street',
    city: 'Mexico City',
    state: 'CDMX',
    postalCode: '12345',
    country: 'Mexico',
    leadTime: 2,
    notes: 'Primary dairy supplier',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      inventoryItems: 5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get<SuppliersService>(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a supplier', async () => {
      const createDto: CreateSupplierDto = {
        code: 'DAIRY-001',
        name: 'Dairy Products Supplier',
        contactName: 'John Doe',
        email: 'john@dairy.com',
        phone: '+1234567890',
        leadTime: 2,
      };

      mockSuppliersService.create.mockResolvedValue(mockSupplier);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockSupplier);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated suppliers', async () => {
      const query: QuerySuppliersDto = {
        skip: 0,
        take: 10,
      };

      const paginatedResult = {
        items: [mockSupplier],
        total: 1,
        skip: 0,
        take: 10,
      };

      mockSuppliersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findAllActive', () => {
    it('should return all active suppliers', async () => {
      mockSuppliersService.findAllActive.mockResolvedValue([mockSupplier]);

      const result = await controller.findAllActive();

      expect(result).toEqual([mockSupplier]);
      expect(service.findAllActive).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a supplier by id', async () => {
      mockSuppliersService.findOne.mockResolvedValue(mockSupplier);

      const result = await controller.findOne('supplier-1');

      expect(result).toEqual(mockSupplier);
      expect(service.findOne).toHaveBeenCalledWith('supplier-1');
    });
  });

  describe('findByCode', () => {
    it('should return a supplier by code', async () => {
      mockSuppliersService.findByCode.mockResolvedValue(mockSupplier);

      const result = await controller.findByCode('DAIRY-001');

      expect(result).toEqual(mockSupplier);
      expect(service.findByCode).toHaveBeenCalledWith('DAIRY-001');
    });
  });

  describe('update', () => {
    it('should update a supplier', async () => {
      const updateDto: UpdateSupplierDto = {
        leadTime: 3,
      };

      const updatedSupplier = { ...mockSupplier, leadTime: 3 };
      mockSuppliersService.update.mockResolvedValue(updatedSupplier);

      const result = await controller.update('supplier-1', updateDto);

      expect(result).toEqual(updatedSupplier);
      expect(service.update).toHaveBeenCalledWith('supplier-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a supplier', async () => {
      mockSuppliersService.remove.mockResolvedValue(undefined);

      await controller.remove('supplier-1');

      expect(service.remove).toHaveBeenCalledWith('supplier-1');
    });
  });
});
