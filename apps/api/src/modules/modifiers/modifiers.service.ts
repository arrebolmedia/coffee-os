import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateModifierDto, ModifierType } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { QueryModifiersDto } from './dto/query-modifiers.dto';

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createModifierDto: CreateModifierDto) {
    // Check if a modifier with the same name and type already exists
    const existingModifier = await this.prisma.modifier.findFirst({
      where: {
        name: {
          equals: createModifierDto.name,
          mode: 'insensitive',
        },
        type: createModifierDto.type,
      },
    });

    if (existingModifier) {
      throw new BadRequestException(
        `Modifier "${createModifierDto.name}" of type ${createModifierDto.type} already exists`,
      );
    }

    return this.prisma.modifier.create({
      data: createModifierDto,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryModifiersDto) {
    const { skip = 0, take = 50, active, type, search } = query;

    const where: any = {};

    if (active !== undefined) {
      where.active = active;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.modifier.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          _count: {
            select: {
              products: true,
              ticketLineModifiers: true,
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.modifier.count({ where }),
    ]);

    return {
      items,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async findAllActive() {
    return this.prisma.modifier.findMany({
      where: { active: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findByType(typeString: string) {
    // Validate and convert string to ModifierType enum
    const validTypes = Object.keys(ModifierType);
    const upperType = typeString.toUpperCase();

    if (!validTypes.includes(upperType)) {
      throw new BadRequestException(
        `Invalid modifier type. Valid types are: ${validTypes.join(', ')}`,
      );
    }

    return this.prisma.modifier.findMany({
      where: {
        type: upperType as ModifierType,
        active: true,
      },
      orderBy: { name: 'asc' },
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
    const modifier = await this.prisma.modifier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            ticketLineModifiers: true,
          },
        },
      },
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    return modifier;
  }

  async findModifierProducts(id: string) {
    const modifier = await this.prisma.modifier.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    return modifier.products.map((pm) => pm.product);
  }

  async update(id: string, updateModifierDto: UpdateModifierDto) {
    // Check if modifier exists
    const modifier = await this.prisma.modifier.findUnique({
      where: { id },
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    // If updating name or type, check for conflicts
    if (
      (updateModifierDto.name || updateModifierDto.type) &&
      (updateModifierDto.name !== modifier.name ||
        updateModifierDto.type !== modifier.type)
    ) {
      const existingModifier = await this.prisma.modifier.findFirst({
        where: {
          name: {
            equals: updateModifierDto.name || modifier.name,
            mode: 'insensitive',
          },
          type: updateModifierDto.type || modifier.type,
          NOT: { id },
        },
      });

      if (existingModifier) {
        throw new BadRequestException(
          `Modifier "${updateModifierDto.name || modifier.name}" of type ${updateModifierDto.type || modifier.type} already exists`,
        );
      }
    }

    return this.prisma.modifier.update({
      where: { id },
      data: updateModifierDto,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    // Check if modifier exists
    const modifier = await this.prisma.modifier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            ticketLineModifiers: true,
          },
        },
      },
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    // Soft delete if modifier is being used
    if (
      modifier._count.products > 0 ||
      modifier._count.ticketLineModifiers > 0
    ) {
      return this.prisma.modifier.update({
        where: { id },
        data: { active: false },
      });
    }

    // Hard delete if modifier is not being used
    return this.prisma.modifier.delete({
      where: { id },
    });
  }
}
