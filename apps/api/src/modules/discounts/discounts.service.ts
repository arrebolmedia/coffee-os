import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
    // Validate that code is unique
    const existing = await this.prisma.discount.findUnique({
      where: { code: createDiscountDto.code },
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

    return this.prisma.discount.create({
      data: createDiscountDto,
    });
  }

  async findAll(query: QueryDiscountsDto) {
    const { skip, take, isActive, type } = query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (type) where.type = type;

    return this.prisma.discount.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    const now = new Date();

    return this.prisma.discount.findMany({
      where: {
        isActive: true,
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

  async findByType(type: string) {
    return this.prisma.discount.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCode(code: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { code },
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

    // If updating code, check uniqueness
    if (updateDiscountDto.code) {
      const existing = await this.prisma.discount.findUnique({
        where: { code: updateDiscountDto.code },
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

    return this.prisma.discount.update({
      where: { id },
      data: updateDiscountDto,
    });
  }

  async activate(id: string) {
    await this.findOne(id);

    return this.prisma.discount.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.discount.update({
      where: { id },
      data: { isActive: false },
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

    if (!discount.isActive) {
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

    // Check minimum purchase
    if (discount.minPurchaseAmount && subtotal < discount.minPurchaseAmount) {
      throw new BadRequestException(
        `Minimum purchase amount of ${discount.minPurchaseAmount} not met`,
      );
    }

    // Check usage limit
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      throw new BadRequestException('Discount usage limit reached');
    }

    // Calculate discount amount
    let discountAmount = 0;

    if (discount.type === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * discount.value) / 100;
    } else if (discount.type === DiscountType.FIXED_AMOUNT) {
      discountAmount = discount.value;
    }

    // Apply max discount amount
    if (
      discount.maxDiscountAmount &&
      discountAmount > discount.maxDiscountAmount
    ) {
      discountAmount = discount.maxDiscountAmount;
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
      data: { usageCount: { increment: 1 } },
    });
  }
}
