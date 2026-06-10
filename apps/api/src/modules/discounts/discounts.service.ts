import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { QueryDiscountsDto } from './dto/query-discounts.dto';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
}

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async create(createDiscountDto: CreateDiscountDto) {
    // Validate that code is unique within the organization
    const existing = await this.prisma.discount.findFirst({
      where: {
        code: createDiscountDto.code,
        ...(createDiscountDto.organizationId
          ? { organizationId: createDiscountDto.organizationId }
          : {}),
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Discount with code "${createDiscountDto.code}" already exists`,
      );
    }

    // Validate percentage is between 0-100
    if (
      createDiscountDto.type === DiscountType.PERCENTAGE &&
      (createDiscountDto.value < 0 || createDiscountDto.value > 100)
    ) {
      throw new BadRequestException('Percentage must be between 0 and 100');
    }

    // Validate fixed amount is positive
    if (
      createDiscountDto.type === DiscountType.FIXED_AMOUNT &&
      createDiscountDto.value <= 0
    ) {
      throw new BadRequestException('Fixed amount must be positive');
    }

    // Validate dates
    if (createDiscountDto.validFrom && createDiscountDto.validUntil) {
      if (
        new Date(createDiscountDto.validFrom) >
        new Date(createDiscountDto.validUntil)
      ) {
        throw new BadRequestException('validFrom must be before validUntil');
      }
    }

    // Map incoming DTO to database fields
    const data: any = {
      code: createDiscountDto.code,
      name: createDiscountDto.name,
      description: createDiscountDto.description,
      type: createDiscountDto.type,
      percentage:
        createDiscountDto.type === DiscountType.PERCENTAGE
          ? createDiscountDto.value
          : undefined,
      fixedAmount:
        createDiscountDto.type === DiscountType.FIXED_AMOUNT
          ? createDiscountDto.value
          : undefined,
      buyQuantity:
        createDiscountDto.type === DiscountType.BUY_X_GET_Y
          ? (createDiscountDto as any).buyQuantity
          : undefined,
      getQuantity:
        createDiscountDto.type === DiscountType.BUY_X_GET_Y
          ? (createDiscountDto as any).getQuantity
          : undefined,
      applicableTo: (createDiscountDto as any).applicableTo || 'total',
      productIds: (createDiscountDto as any).productIds || [],
      categoryIds: (createDiscountDto as any).categoryIds || [],
      minPurchase: createDiscountDto.minPurchaseAmount,
      maxUses: createDiscountDto.usageLimit,
      currentUses: createDiscountDto.usageCount || 0,
      validFrom: createDiscountDto.validFrom,
      validUntil: createDiscountDto.validUntil,
      stackable: (createDiscountDto as any).stackable || false,
      active: createDiscountDto.active ?? true,
      organizationId: createDiscountDto.organizationId,
    };

    return this.prisma.discount.create({ data });
  }

  async findAll(query: QueryDiscountsDto, organizationId?: string) {
    const { skip, take, active, type } = query;

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (active !== undefined) where.active = active;
    if (type) where.type = type as DiscountType;

    return this.prisma.discount.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(organizationId?: string) {
    const now = new Date();

    return this.prisma.discount.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        active: true,
        OR: [
          {
            AND: [{ validFrom: { lte: now } }, { validUntil: { gte: now } }],
          },
          {
            AND: [{ validFrom: null }, { validUntil: null }],
          },
          {
            AND: [{ validFrom: { lte: now } }, { validUntil: null }],
          },
          {
            AND: [{ validFrom: null }, { validUntil: { gte: now } }],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByType(type: string, organizationId?: string) {
    return this.prisma.discount.findMany({
      where: {
        type: type as DiscountType,
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCode(code: string, organizationId?: string) {
    const discount = await this.prisma.discount.findFirst({
      where: {
        code,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (!discount) {
      throw new NotFoundException(`Discount with code "${code}" not found`);
    }

    return discount;
  }

  async findOne(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException(`Discount with ID "${id}" not found`);
    }

    return discount;
  }

  async update(id: string, updateDiscountDto: UpdateDiscountDto) {
    await this.findOne(id);

    // If updating code, check uniqueness within the organization
    if (updateDiscountDto.code) {
      const current = await this.prisma.discount.findUnique({
        where: { id },
        select: { organizationId: true },
      });

      const existing = await this.prisma.discount.findFirst({
        where: {
          code: updateDiscountDto.code,
          ...(current?.organizationId
            ? { organizationId: current.organizationId }
            : {}),
        },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Discount with code "${updateDiscountDto.code}" already exists`,
        );
      }
    }

    // Validate percentage
    if (
      updateDiscountDto.type === DiscountType.PERCENTAGE &&
      updateDiscountDto.value !== undefined &&
      (updateDiscountDto.value < 0 || updateDiscountDto.value > 100)
    ) {
      throw new BadRequestException('Percentage must be between 0 and 100');
    }

    // Validate fixed amount
    if (
      updateDiscountDto.type === DiscountType.FIXED_AMOUNT &&
      updateDiscountDto.value !== undefined &&
      updateDiscountDto.value <= 0
    ) {
      throw new BadRequestException('Fixed amount must be positive');
    }

    // Validate dates
    if (updateDiscountDto.validFrom && updateDiscountDto.validUntil) {
      if (
        new Date(updateDiscountDto.validFrom) >
        new Date(updateDiscountDto.validUntil)
      ) {
        throw new BadRequestException('validFrom must be before validUntil');
      }
    }

    const data: any = {
      ...(updateDiscountDto.name !== undefined && {
        name: updateDiscountDto.name,
      }),
      ...(updateDiscountDto.description !== undefined && {
        description: updateDiscountDto.description,
      }),
      ...(updateDiscountDto.type !== undefined && {
        type: updateDiscountDto.type,
      }),
      ...(updateDiscountDto.type === DiscountType.PERCENTAGE &&
        updateDiscountDto.value !== undefined && {
          percentage: updateDiscountDto.value,
        }),
      ...(updateDiscountDto.type === DiscountType.FIXED_AMOUNT &&
        updateDiscountDto.value !== undefined && {
          fixedAmount: updateDiscountDto.value,
        }),
      minPurchase: (updateDiscountDto as any).minPurchaseAmount ?? undefined,
      maxUses: (updateDiscountDto as any).usageLimit ?? undefined,
      // don't overwrite currentUses unless explicitly provided
      ...((updateDiscountDto as any).usageCount !== undefined && {
        currentUses: (updateDiscountDto as any).usageCount,
      }),
      validFrom: updateDiscountDto.validFrom ?? undefined,
      validUntil: updateDiscountDto.validUntil ?? undefined,
      active: updateDiscountDto.active ?? undefined,
    };

    return this.prisma.discount.update({ where: { id }, data });
  }

  async activate(id: string) {
    await this.findOne(id);

    return this.prisma.discount.update({
      where: { id },
      data: { active: true },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.discount.update({
      where: { id },
      data: { active: false },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.discount.delete({
      where: { id },
    });
  }

  async calculateDiscount(
    discountId: string,
    subtotal: number,
  ): Promise<number> {
    const discount = await this.findOne(discountId);

    if (!discount.active) {
      throw new BadRequestException('Discount is not active');
    }

    // Check validity dates
    const now = new Date();
    if (discount.validFrom && new Date(discount.validFrom) > now) {
      throw new BadRequestException('Discount is not yet valid');
    }
    if (discount.validUntil && new Date(discount.validUntil) < now) {
      throw new BadRequestException('Discount has expired');
    }

    // Check minimum purchase (schema uses minPurchase)
    if (
      discount.minPurchase !== null &&
      discount.minPurchase !== undefined &&
      subtotal < discount.minPurchase
    ) {
      throw new BadRequestException(
        `Minimum purchase amount of ${discount.minPurchase} not met`,
      );
    }

    // Check usage limit (schema uses maxUses and currentUses)
    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      throw new BadRequestException('Discount usage limit reached');
    }

    // Calculate discount amount
    let discountAmount = 0;

    if (discount.type === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * (discount.percentage || 0)) / 100;
    } else if (discount.type === DiscountType.FIXED_AMOUNT) {
      discountAmount = discount.fixedAmount || 0;
    }

    // Don't allow discount to exceed subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return discountAmount;
  }

  async incrementUsage(discountId: string) {
    return this.prisma.discount.update({
      where: { id: discountId },
      data: { currentUses: { increment: 1 } },
    });
  }
}
