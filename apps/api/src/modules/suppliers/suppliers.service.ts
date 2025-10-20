import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    // Check if code already exists
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { code: createSupplierDto.code },
    });

    if (existingSupplier) {
      throw new ConflictException(
        `Supplier with code ${createSupplierDto.code} already exists`,
      );
    }

    return this.prisma.supplier.create({
      data: createSupplierDto,
      include: {
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    });
  }

  async findAll(query: QuerySuppliersDto) {
    const { skip = 0, take = 50, active, search } = query;

    const where: any = {};

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findAllActive() {
    return this.prisma.supplier.findMany({
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
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          select: {
            id: true,
            code: true,
            name: true,
            active: true,
          },
        },
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async findByCode(code: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with code ${code} not found`);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    // Check if supplier exists
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Check if new code conflicts with existing supplier
    if (updateSupplierDto.code && updateSupplierDto.code !== supplier.code) {
      const existingSupplier = await this.prisma.supplier.findUnique({
        where: { code: updateSupplierDto.code },
      });

      if (existingSupplier) {
        throw new ConflictException(
          `Supplier with code ${updateSupplierDto.code} already exists`,
        );
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
      include: {
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Soft delete if supplier has inventory items
    if (supplier._count.inventoryItems > 0) {
      return this.prisma.supplier.update({
        where: { id },
        data: { active: false },
      });
    }

    // Hard delete if no dependencies
    await this.prisma.supplier.delete({
      where: { id },
    });
  }
}
