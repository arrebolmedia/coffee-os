import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { QueryTaxesDto } from './dto/query-taxes.dto';

export enum TaxCategory {
  IVA = 'IVA', // Impuesto al Valor Agregado
  IEPS = 'IEPS', // Impuesto Especial sobre Producción y Servicios
  ISR = 'ISR', // Impuesto Sobre la Renta
  OTHER = 'OTHER',
}

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}

  async create(createTaxDto: CreateTaxDto) {
    return this.prisma.tax.create({
      data: createTaxDto,
    });
  }

  async findAll(query: QueryTaxesDto) {
    const { skip, take, isActive, category } = query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (category) where.category = category;

    return this.prisma.tax.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.tax.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByCategory(category: string) {
    return this.prisma.tax.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tax = await this.prisma.tax.findUnique({
      where: { id },
    });

    if (!tax) {
      throw new NotFoundException(`Tax with ID "${id}" not found`);
    }

    return tax;
  }

  async update(id: string, updateTaxDto: UpdateTaxDto) {
    await this.findOne(id);

    return this.prisma.tax.update({
      where: { id },
      data: updateTaxDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.tax.delete({
      where: { id },
    });
  }

  async calculateTax(taxId: string, subtotal: number): Promise<number> {
    const tax = await this.findOne(taxId);

    if (!tax.isActive) {
      return 0;
    }

    return (subtotal * tax.rate) / 100;
  }

  async calculateMultipleTaxes(
    taxIds: string[],
    subtotal: number,
  ): Promise<{
    total: number;
    breakdown: { taxId: string; amount: number }[];
  }> {
    const taxes = await this.prisma.tax.findMany({
      where: {
        id: { in: taxIds },
        isActive: true,
      },
    });

    const breakdown = taxes.map((tax) => ({
      taxId: tax.id,
      amount: (subtotal * tax.rate) / 100,
    }));

    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

    return { total, breakdown };
  }
}
