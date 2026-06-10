import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTaxDto, TaxCategory } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { QueryTaxesDto } from './dto/query-taxes.dto';

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}

  async create(createTaxDto: CreateTaxDto) {
    return this.prisma.tax.create({
      data: createTaxDto,
    });
  }

  async findAll(query: QueryTaxesDto) {
    const { skip, take, active, category } = query;

    const where: any = {};
    if (active !== undefined) where.active = active;
    if (category) where.category = category as TaxCategory;

    return this.prisma.tax.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.tax.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByCategory(category: string) {
    const where: any = { category: category as TaxCategory };
    return this.prisma.tax.findMany({
      where,
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

    if (!tax.active) {
      return 0;
    }

    // tax.rate is stored as decimal (0.16 = 16%) per schema documentation.
    return subtotal * tax.rate;
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
        active: true,
      },
    });

    const breakdown = taxes.map((tax) => ({
      taxId: tax.id,
      // tax.rate is stored as decimal (0.16 = 16%) per schema documentation.
      amount: subtotal * tax.rate,
    }));

    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

    return { total, breakdown };
  }
}
