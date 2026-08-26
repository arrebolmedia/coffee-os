import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: createDto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Organization with slug "${createDto.slug}" already exists`,
      );
    }
    return this.prisma.organization.create({
      data: {
        name: createDto.name,
        slug: createDto.slug,
        description: createDto.description,
        timezone: createDto.timezone ?? 'America/Mexico_City',
      },
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * `callerOrganizationId` viene del JWT. Un usuario sólo puede leer SU propia
   * organización; pedir otra devuelve 404 (no 403, para no confirmar que
   * existe). Los super admin pasan sin restricción — el controller les pasa
   * `undefined`.
   */
  async findOne(id: string, callerOrganizationId?: string) {
    if (callerOrganizationId && id !== callerOrganizationId) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org)
      throw new NotFoundException(`Organization with slug "${slug}" not found`);
    return org;
  }

  async update(id: string, updateDto: UpdateOrganizationDto) {
    await this.findOne(id); // throws NotFoundException if not found

    if (updateDto.slug) {
      const conflict = await this.prisma.organization.findFirst({
        where: { slug: updateDto.slug, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Slug "${updateDto.slug}" is already taken`,
        );
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: updateDto.name,
        slug: updateDto.slug,
        description: updateDto.description,
        timezone: updateDto.timezone,
        active: updateDto.active,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // throws NotFoundException if not found
    // Soft delete — set active=false to preserve referential integrity
    return this.prisma.organization.update({
      where: { id },
      data: { active: false },
    });
  }
}
