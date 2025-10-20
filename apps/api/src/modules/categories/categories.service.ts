import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Check if a category with the same name already exists
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: createCategoryDto.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Category with name "${createCategoryDto.name}" already exists`,
      );
    }

    // Get the highest sortOrder to place new category at the end
    const lastCategory = await this.prisma.category.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const sortOrder =
      createCategoryDto.sortOrder ?? (lastCategory?.sortOrder ?? 0) + 1;

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        sortOrder,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryCategoriesDto) {
    const { skip = 0, take = 50, active, search } = query;

    const where: any = {};

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findAllActive() {
    return this.prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findCategoryProducts(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category.products;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // If updating name, check for conflicts
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          name: {
            equals: updateCategoryDto.name,
            mode: 'insensitive',
          },
          NOT: { id },
        },
      });

      if (existingCategory) {
        throw new BadRequestException(
          `Category with name "${updateCategoryDto.name}" already exists`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async updateSortOrder(id: string, sortOrder: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.prisma.category.update({
      where: { id },
      data: { sortOrder },
    });
  }

  async remove(id: string) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Soft delete if category has products
    if (category._count.products > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { active: false },
      });
    }

    // Hard delete if category has no products
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
