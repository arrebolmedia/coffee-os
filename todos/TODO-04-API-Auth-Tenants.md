# 🔐 TODO 04: API Core - Autenticación y Tenants

**Período**: Semana 3-4  
**Owner**: Backend Lead + DevOps Engineer  
**Prioridad**: 🔴 CRÍTICA

## 📋 Objetivos

Implementar la arquitectura de seguridad multi-tenant con autenticación JWT, control de acceso basado en roles (RBAC) y aislamiento de datos por organización que servirá de base para todo el sistema CoffeeOS.

## ✅ Entregables

### 1. Arquitectura Multi-Tenant

#### 🏢 Modelo de Datos Base

```typescript
// prisma/schema.prisma - Entidades Core
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  subdomain   String?  @unique
  settings    Json     @default("{}")
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  users       User[]
  locations   Location[]
  products    Product[]
  // ... todas las entidades tienen organization_id

  @@map("organizations")
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  firstName      String
  lastName       String
  phone          String?
  active         Boolean  @default(true)
  emailVerified  DateTime?
  lastLoginAt    DateTime?

  // Multi-tenant
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // RBAC
  roleId         String
  role           Role @relation(fields: [roleId], references: [id])

  // Locations access
  userLocations  UserLocation[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("users")
}

model Role {
  id          String   @id @default(cuid())
  name        RoleName @unique
  displayName String
  permissions Permission[]
  users       User[]

  @@map("roles")
}

enum RoleName {
  OWNER          // Acceso total + multi-sede
  MANAGER        // POS, inventario, RRHH, reportes
  BARISTA_LEAD   // Recetas, QC, capacitación
  BARISTA        // POS limitado, tareas
  CASHIER        // Cobro, CFDI, arqueos
  AUDITOR        // Solo lectura + firmas
  ACCOUNTANT     // Lectura P&L/CFDI, exports
}

model Permission {
  id       String @id @default(cuid())
  resource String // 'pos', 'inventory', 'reports', etc.
  action   String // 'create', 'read', 'update', 'delete'
  roleId   String
  role     Role   @relation(fields: [roleId], references: [id])

  @@unique([resource, action, roleId])
  @@map("permissions")
}

model Location {
  id             String @id @default(cuid())
  name           String
  address        String
  timezone       String @default("America/Mexico_City")
  active         Boolean @default(true)

  // Multi-tenant
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // User access control
  userLocations  UserLocation[]

  @@map("locations")
}

model UserLocation {
  userId     String
  locationId String
  user       User     @relation(fields: [userId], references: [id])
  location   Location @relation(fields: [locationId], references: [id])

  @@id([userId, locationId])
  @@map("user_locations")
}
```

#### 🛡️ Row Level Security (RLS) Implementation

```sql
-- Habilitar RLS en todas las tablas principales
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ... etc para todas las tablas

-- Política de aislamiento por organización
CREATE POLICY "tenant_isolation_organizations" ON organizations
  FOR ALL TO authenticated
  USING (id = current_setting('app.current_org_id')::uuid);

CREATE POLICY "tenant_isolation_users" ON users
  FOR ALL TO authenticated
  USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Política de acceso por ubicación (para roles con múltiples tiendas)
CREATE POLICY "location_access_products" ON products
  FOR ALL TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );
```

### 2. Sistema de Autenticación JWT

#### 🔑 Auth Service Implementation

```typescript
// src/auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly hashService: HashService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    // 1. Validar credenciales
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Verificar organización activa
    if (!user.organization.active) {
      throw new ForbiddenException('Organización suspendida');
    }

    // 3. Verificar usuario activo
    if (!user.active) {
      throw new ForbiddenException('Usuario inactivo');
    }

    // 4. Generar tokens
    const tokens = await this.generateTokens(user);

    // 5. Actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Audit log
    await this.auditService.log({
      action: 'LOGIN',
      userId: user.id,
      organizationId: user.organizationId,
      metadata: { ip: dto.ip, userAgent: dto.userAgent },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600, // 1 hora
    };
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          organization: true,
          role: { include: { permissions: true } },
        },
      });

      if (!user || !user.active || !user.organization.active) {
        throw new UnauthorizedException('Sesión inválida');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  private async generateTokens(
    user: UserWithRoleAndOrg,
  ): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      roleId: user.roleId,
      roleName: user.role.name,
      locations: user.userLocations.map((ul) => ul.locationId),
      permissions: user.role.permissions.map(
        (p) => `${p.resource}:${p.action}`,
      ),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
```

#### 🛡️ JWT Strategy & Guards

```typescript
// src/auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Verificar que el usuario sigue activo
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || !user.active || !user.organization.active) {
      throw new UnauthorizedException('Usuario o organización inactiva');
    }

    // Setear context de tenant para RLS
    await this.prisma.$executeRaw`
      SELECT set_config('app.current_user_id', ${user.id}, true);
      SELECT set_config('app.current_org_id', ${user.organizationId}, true);
    `;

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      locations: payload.locations,
      permissions: payload.permissions,
    };
  }
}

// src/auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    return requiredRoles.includes(user.roleName);
  }
}

// src/auth/guards/permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    return requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
  }
}
```

### 3. RBAC System Implementation

#### 🎭 Decorators para Control de Acceso

```typescript
// src/auth/decorators/roles.decorator.ts
export const Roles = (...roles: RoleName[]) => SetMetadata('roles', roles);

// src/auth/decorators/permissions.decorator.ts
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// src/auth/decorators/user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser, ctx: ExecutionContext): AuthUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// Usage en controllers:
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ProductsController {
  @Get()
  @RequirePermissions('products:read')
  async findAll(@CurrentUser('organizationId') orgId: string) {
    return this.productsService.findAll(orgId);
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  @RequirePermissions('products:create')
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.productsService.create(dto, user);
  }
}
```

#### ⚙️ Permissions Seeder

```typescript
// src/database/seeders/permissions.seeder.ts
const PERMISSIONS_MAP = {
  [RoleName.OWNER]: [
    'organizations:*',
    'users:*',
    'locations:*',
    'products:*',
    'inventory:*',
    'pos:*',
    'reports:*',
    'settings:*',
  ],
  [RoleName.MANAGER]: [
    'products:read',
    'products:create',
    'products:update',
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'pos:read',
    'pos:create',
    'reports:read',
    'users:read',
    'users:update',
  ],
  [RoleName.BARISTA_LEAD]: [
    'products:read',
    'recipes:*',
    'quality:*',
    'pos:read',
    'pos:create',
    'training:read',
  ],
  [RoleName.BARISTA]: [
    'pos:read',
    'pos:create',
    'recipes:read',
    'quality:read',
    'training:read',
  ],
  [RoleName.CASHIER]: [
    'pos:read',
    'pos:create',
    'pos:payment',
    'invoices:create',
    'cash:*',
  ],
  [RoleName.AUDITOR]: [
    'quality:read',
    'quality:sign',
    'reports:read',
    'inventory:read',
    'pos:read',
  ],
  [RoleName.ACCOUNTANT]: [
    'reports:read',
    'reports:export',
    'invoices:read',
    'financial:read',
  ],
};

export async function seedPermissions(prisma: PrismaService) {
  // Crear roles base
  for (const roleName of Object.values(RoleName)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        displayName: ROLE_DISPLAY_NAMES[roleName],
        permissions: {
          create: PERMISSIONS_MAP[roleName].map((perm) => {
            const [resource, action] = perm.split(':');
            return { resource, action };
          }),
        },
      },
    });
  }
}
```

### 4. API Endpoints Core

#### 🔐 Auth Controller

```typescript
// src/auth/auth.controller.ts
@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, type: AuthResponse })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponse> {
    return this.authService.login({ ...loginDto, ip, userAgent });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar token de acceso' })
  async refresh(@Body() refreshDto: RefreshTokenDto): Promise<TokenResponse> {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  async getProfile(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar perfil' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() updateDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.authService.updateProfile(user.id, updateDto);
  }
}
```

#### 🏢 Organizations Controller

```typescript
// src/organizations/organizations.controller.ts
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Organizations')
export class OrganizationsController {
  @Get()
  @Roles(RoleName.OWNER)
  @ApiOperation({ summary: 'Listar organizaciones (solo owners)' })
  async findAll(@CurrentUser() user: AuthUser) {
    return this.organizationsService.findAll(user);
  }

  @Get('current')
  @ApiOperation({ summary: 'Obtener organización actual' })
  async getCurrent(@CurrentUser('organizationId') orgId: string) {
    return this.organizationsService.findById(orgId);
  }

  @Patch('current/settings')
  @Roles(RoleName.OWNER, RoleName.MANAGER)
  @ApiOperation({ summary: 'Actualizar configuración' })
  async updateSettings(
    @CurrentUser('organizationId') orgId: string,
    @Body() settingsDto: UpdateOrgSettingsDto,
  ) {
    return this.organizationsService.updateSettings(orgId, settingsDto);
  }
}
```

### 5. Middleware y Interceptors

#### 🕒 Audit Interceptor

```typescript
// src/common/interceptors/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Solo auditar operaciones de escritura
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            this.auditService.log({
              action: `${request.method} ${request.route?.path}`,
              userId: user?.id,
              organizationId: user?.organizationId,
              metadata: {
                ip: request.ip,
                userAgent: request.get('user-agent'),
                duration: Date.now() - startTime,
                success: true,
              },
            });
          }
        },
        error: (error) => {
          this.auditService.log({
            action: `${request.method} ${request.route?.path}`,
            userId: user?.id,
            organizationId: user?.organizationId,
            metadata: {
              ip: request.ip,
              error: error.message,
              duration: Date.now() - startTime,
              success: false,
            },
          });
        },
      }),
    );
  }
}
```

## 🎯 Criterios de Aceptación

### Security Requirements

- [ ] ✅ **Multi-tenant isolation**: Tests de penetración confirman aislamiento
- [ ] ✅ **JWT security**: Tokens expiran, refresh rotation implementado
- [ ] ✅ **RBAC enforcement**: Permissions granulares funcionando correctamente
- [ ] ✅ **Audit trail**: Todas las operaciones críticas se registran

### Performance Targets

- [ ] ✅ **Login endpoint**: < 300ms p95
- [ ] ✅ **JWT validation**: < 50ms p95
- [ ] ✅ **RLS queries**: No impacto > 10% vs queries sin RLS
- [ ] ✅ **Concurrent sessions**: 100+ usuarios por organización

### API Documentation

- [ ] ✅ **OpenAPI/Swagger**: Documentación completa y actualizada
- [ ] ✅ **Postman collection**: Flujos de auth listos para testing
- [ ] ✅ **Integration tests**: Coverage > 80% en endpoints críticos

## 🚀 Entregables Finales

### 1. Core Auth APIs

```bash
POST /auth/login           # Autenticación inicial
POST /auth/refresh         # Renovar tokens
POST /auth/logout          # Cerrar sesión
GET  /auth/me             # Perfil del usuario
PATCH /auth/me            # Actualizar perfil

GET  /organizations/current          # Org actual
PATCH /organizations/current/settings # Config org
GET  /users                         # Lista usuarios (by role)
POST /users                         # Crear usuario
PATCH /users/:id                    # Actualizar usuario
```

### 2. Security Infrastructure

- [ ] **JWT middleware**: Validación automática en todas las rutas protegidas
- [ ] **RLS policies**: Aislamiento por tenant a nivel de base de datos
- [ ] **Audit system**: Log de todas las operaciones sensibles
- [ ] **Rate limiting**: Protección contra ataques de fuerza bruta

### 3. Testing Suite

```typescript
// Ejemplo: Integration test de auth flow
describe('Auth Flow Integration', () => {
  it('should complete full auth cycle', async () => {
    // 1. Login successful
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'test@coffeeos.mx', password: 'password123' })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('accessToken');

    // 2. Access protected resource
    const profileResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    // 3. Refresh token
    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(200);

    // 4. Logout
    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
      .expect(200);
  });
});
```

## 🔗 Dependencies & Handoffs

### ⬅️ Inputs Needed

- [ ] ✅ **Database schema** completado de packages/database
- [ ] ✅ **Environment setup**: Docker PostgreSQL + Redis funcionando
- [ ] ✅ **Security requirements**: Nivel de compliance esperado
- [ ] ✅ **Performance targets**: Latencia y throughput esperados

### ➡️ Outputs for Next Phase

- [ ] ✅ **Auth middleware** → Todos los módulos siguientes
- [ ] ✅ **User context** → TODO 05 (Módulo Productos y Catálogo)
- [ ] ✅ **RBAC system** → TODO 06 (POS Engine)
- [ ] ✅ **Audit infrastructure** → TODO 24 (Testing Integral)

---

**⏰ Deadline**: Viernes Semana 4  
**👥 Stakeholders**: Backend Lead, DevOps Engineer, Security Consultant  
**🔐 Security Review**: Mandatory antes de merge a main

_Security first - trust but verify! 🛡️🔐_
