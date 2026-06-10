/**
 * UsersService — Prisma-backed user management.
 *
 * Maps to the `User` model. Password creation hashes via bcrypt; password
 * UPDATES are forbidden through `update()` — they must go through a dedicated
 * change-password flow (TODO: implement).
 *
 * `remove()` is a soft delete (active=false) to preserve FK integrity with
 * tickets/quality_logs/task_runs.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitize(user: any) {
    if (!user) return user;
    const { password: _password, ...rest } = user;
    return rest;
  }

  async findAll(query: QueryUsersDto = {}) {
    const where: any = {};
    if (query.organization_id) where.organizationId = query.organization_id;
    if (query.role_id) where.roleId = query.role_id;
    if (query.active !== undefined) where.active = query.active;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { firstName: 'asc' },
    });
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.sanitize(user);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);
    return this.sanitize(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const created = await this.prisma.user.create({
      data: {
        organizationId: dto.organization_id,
        roleId: dto.role_id,
        email: dto.email,
        password: hashedPassword,
        firstName: dto.first_name,
        lastName: dto.last_name,
        phone: dto.phone,
        avatar: dto.avatar,
        isSuperAdmin: dto.is_super_admin ?? false,
        active: dto.active ?? true,
      },
    });
    return this.sanitize(created);
  }

  /**
   * Update a user. Any `password` field is IGNORED — password changes must
   * go through a dedicated change-password flow.
   */
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // throws if not found

    if (dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException(`Email ${dto.email} is already taken`);
      }
    }

    const data: any = {};
    if (dto.role_id !== undefined) data.roleId = dto.role_id;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.first_name !== undefined) data.firstName = dto.first_name;
    if (dto.last_name !== undefined) data.lastName = dto.last_name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.is_super_admin !== undefined)
      data.isSuperAdmin = dto.is_super_admin;
    if (dto.active !== undefined) data.active = dto.active;
    // NOTE: `password` is NOT copied — see JSDoc.

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return this.sanitize(updated);
  }

  /** Soft delete: marca active=false. */
  async remove(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return this.sanitize(updated);
  }
}
