import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { OrganizationsService } from '../organizations.service';
import { PrismaService } from '../../database/prisma.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockPrismaService = {
    organization: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockOrg = {
    id: 'org-id-123',
    name: 'Café Insurgentes',
    slug: 'cafe-insurgentes',
    description: 'Sucursal principal',
    timezone: 'America/Mexico_City',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an organization', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockOrg);

      const result = await service.create({
        name: 'Café Insurgentes',
        slug: 'cafe-insurgentes',
      });

      expect(result.slug).toBe('cafe-insurgentes');
      expect(result.name).toBe('Café Insurgentes');
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      await expect(
        service.create({ name: 'Duplicate', slug: 'cafe-insurgentes' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use default timezone when not provided', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockOrg);

      await service.create({ name: 'Café Test', slug: 'cafe-test' });

      expect(mockPrismaService.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timezone: 'America/Mexico_City',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return active organizations ordered by name', async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([mockOrg]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return organization when found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.findOne('org-id-123');
      expect(result.id).toBe('org-id-123');
    });

    it('should throw NotFoundException when org not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.findBySlug('cafe-insurgentes');
      expect(result.slug).toBe('cafe-insurgentes');
    });

    it('should throw NotFoundException when slug not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update organization', async () => {
      const updatedOrg = { ...mockOrg, name: 'Café Nuevo Nombre' };
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);
      mockPrismaService.organization.update.mockResolvedValue(updatedOrg);

      const result = await service.update('org-id-123', {
        name: 'Café Nuevo Nombre',
      });

      expect(result.name).toBe('Café Nuevo Nombre');
    });

    it('should throw NotFoundException when org not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when slug is taken by another org', async () => {
      const otherOrg = { ...mockOrg, id: 'other-org-id' };
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organization.findFirst.mockResolvedValue(otherOrg);

      await expect(
        service.update('org-id-123', { slug: 'cafe-insurgentes' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting active=false', async () => {
      const inactiveOrg = { ...mockOrg, active: false };
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organization.update.mockResolvedValue(inactiveOrg);

      const result = await service.remove('org-id-123');

      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-id-123' },
        data: { active: false },
      });
      expect(result.active).toBe(false);
    });

    it('should throw NotFoundException when org not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
