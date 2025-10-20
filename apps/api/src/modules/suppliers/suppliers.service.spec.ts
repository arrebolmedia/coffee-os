import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    supplier: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
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
      providers: [
        SuppliersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateSupplierDto = {
      code: 'DAIRY-001',
      name: 'Dairy Products Supplier',
      contactName: 'John Doe',
      email: 'john@dairy.com',
      phone: '+1234567890',
      leadTime: 2,
    };

    it('should create a supplier', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);
      mockPrismaService.supplier.create.mockResolvedValue(mockSupplier);

      const result = await service.create(createDto);

      expect(result).toEqual(mockSupplier);
      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.supplier.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated suppliers', async () => {
      const query: QuerySuppliersDto = {
        skip: 0,
        take: 10,
      };

      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockSupplier],
        total: 1,
        skip: 0,
        take: 10,
      });
    });

    it('should filter by active status', async () => {
      const query: QuerySuppliersDto = {
        skip: 0,
        take: 10,
        active: true,
      };

      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it('should search by name, code, contact, or email', async () => {
      const query: QuerySuppliersDto = {
        skip: 0,
        take: 10,
        search: 'dairy',
      };

      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'dairy', mode: 'insensitive' } },
              { code: { contains: 'dairy', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findAllActive', () => {
    it('should return all active suppliers', async () => {
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);

      const result = await service.findAllActive();

      expect(result).toEqual([mockSupplier]);
      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a supplier by id', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);

      const result = await service.findOne('supplier-1');

      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should return a supplier by code', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);

      const result = await service.findByCode('DAIRY-001');

      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateSupplierDto = {
      leadTime: 3,
    };

    it('should update a supplier', async () => {
      const updatedSupplier = { ...mockSupplier, leadTime: 3 };
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.supplier.update.mockResolvedValue(updatedSupplier);

      const result = await service.update('supplier-1', updateDto);

      expect(result).toEqual(updatedSupplier);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new code already exists', async () => {
      const updateWithCode: UpdateSupplierDto = {
        code: 'EXISTING-CODE',
      };

      mockPrismaService.supplier.findUnique
        .mockResolvedValueOnce(mockSupplier)
        .mockResolvedValueOnce({ id: 'other-supplier' });

      await expect(
        service.update('supplier-1', updateWithCode),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete if supplier has inventory items', async () => {
      const supplierWithItems = {
        ...mockSupplier,
        _count: {
          inventoryItems: 5,
        },
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(
        supplierWithItems,
      );
      mockPrismaService.supplier.update.mockResolvedValue({
        ...supplierWithItems,
        active: false,
      });

      const result = await service.remove('supplier-1');

      expect(result.active).toBe(false);
      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'supplier-1' },
        data: { active: false },
      });
      expect(prisma.supplier.delete).not.toHaveBeenCalled();
    });

    it('should hard delete if supplier has no dependencies', async () => {
      const cleanSupplier = {
        ...mockSupplier,
        _count: {
          inventoryItems: 0,
        },
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(cleanSupplier);
      mockPrismaService.supplier.delete.mockResolvedValue(cleanSupplier);

      await service.remove('supplier-1');

      expect(prisma.supplier.delete).toHaveBeenCalledWith({
        where: { id: 'supplier-1' },
      });
      expect(prisma.supplier.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
