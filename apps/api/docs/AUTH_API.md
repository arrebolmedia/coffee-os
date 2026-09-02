# Auth API - Autenticación y Autorización

Sistema de autenticación basado en JWT (JSON Web Tokens) para CoffeeOS.

## 📋 Tabla de Contenidos

- [Endpoints](#endpoints)
- [Modelos de Datos](#modelos-de-datos)
- [Autenticación](#autenticación)
- [Guards y Decorators](#guards-y-decorators)
- [Ejemplos de Uso](#ejemplos-de-uso)

## Endpoints

### 1. Register - Registrar Usuario

**POST** `/auth/register`

Crea una nueva cuenta de usuario.

**Body:**

```json
{
  "email": "admin@coffeeos.mx",
  "password": "SecurePassword123!",
  "name": "Juan Pérez",
  "organizationId": "org_abc123" // Opcional
}
```

**Response 201:**

```json
{
  "user": {
    "id": "user_xyz789",
    "email": "admin@coffeeos.mx",
    "name": "Juan Pérez",
    "organizationId": "org_abc123",
    "createdAt": "2025-10-22T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

**Validaciones:**

- Email debe ser válido
- Password mínimo 8 caracteres
- Nombre requerido

---

### 2. Login - Iniciar Sesión

**POST** `/auth/login`

Autenticar usuario y obtener tokens.

**Body:**

```json
{
  "email": "admin@coffeeos.mx",
  "password": "SecurePassword123!"
}
```

**Response 200:**

```json
{
  "user": {
    "id": "user_xyz789",
    "email": "admin@coffeeos.mx",
    "name": "Juan Pérez",
    "organizationId": "org_abc123"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

**Error 401:**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

### 3. Refresh Token - Renovar Token

**POST** `/auth/refresh`

Obtener un nuevo access token usando el refresh token.

**Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

---

### 4. Change Password - Cambiar Contraseña

**POST** `/auth/change-password`

🔒 **Requiere autenticación**

Cambiar la contraseña del usuario autenticado.

**Headers:**

```
Authorization: Bearer {access_token}
```

**Body:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error 400:**

```json
{
  "statusCode": 400,
  "message": "Current password is incorrect",
  "error": "Bad Request"
}
```

---

### 5. Logout - Cerrar Sesión

**POST** `/auth/logout`

🔒 **Requiere autenticación**

Cerrar sesión (principalmente client-side).

**Headers:**

```
Authorization: Bearer {access_token}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 6. Me - Usuario Actual

**POST** `/auth/me`

🔒 **Requiere autenticación**

Obtener información del usuario autenticado.

**Headers:**

```
Authorization: Bearer {access_token}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "userId": "user_xyz789",
    "email": "admin@coffeeos.mx",
    "name": "Juan Pérez",
    "organizationId": "org_abc123"
  }
}
```

---

## Modelos de Datos

### User (Simplified)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  password: string; // Hashed con bcrypt
  organizationId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### JWT Payload

```typescript
interface JwtPayload {
  sub: string; // User ID
  email: string; // User email
  organizationId?: string;
  iat?: number; // Issued at
  exp?: number; // Expires at
}
```

---

## Autenticación

### Flujo de Autenticación

1. **Registro/Login**: El usuario se registra o inicia sesión
2. **Tokens generados**: Se generan `accessToken` (7 días) y `refreshToken` (30 días)
3. **Almacenar tokens**: El cliente almacena los tokens (localStorage/cookies)
4. **Requests autenticados**: Incluir `Authorization: Bearer {accessToken}` en headers
5. **Refresh**: Cuando expira el accessToken, usar el refreshToken para obtener uno nuevo

### JWT Secret

Configurado en `.env`:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### Password Hashing

- Algoritmo: **bcrypt**
- Salt rounds: **10**
- Hash automático en registro y cambio de contraseña

---

## Guards y Decorators

### JwtAuthGuard

Protege endpoints que requieren autenticación:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth';

@UseGuards(JwtAuthGuard)
@Get('protected-route')
async protectedRoute() {
  // Solo usuarios autenticados pueden acceder
}
```

### @Public() Decorator

Marca endpoints como públicos (sin autenticación):

```typescript
import { Public } from '@modules/auth';

@Public()
@Post('login')
async login() {
  // Endpoint público, no requiere token
}
```

### @CurrentUser() Decorator

Obtiene el usuario autenticado en el request:

```typescript
import { CurrentUser, CurrentUserType } from '@modules/auth';

@Get('profile')
async getProfile(@CurrentUser() user: CurrentUserType) {
  console.log(user.userId, user.email, user.name);
  return user;
}
```

---

## Ejemplos de Uso

### Cliente TypeScript/JavaScript

```typescript
// 1. Login
const loginResponse = await fetch('http://localhost:4000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@coffeeos.mx',
    password: 'SecurePassword123!',
  }),
});

const { accessToken, refreshToken } = await loginResponse.json();

// 2. Guardar tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 3. Request autenticado
const productsResponse = await fetch('http://localhost:4000/products', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

// 4. Renovar token
const refreshResponse = await fetch('http://localhost:4000/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken }),
});

const { accessToken: newAccessToken } = await refreshResponse.json();
localStorage.setItem('accessToken', newAccessToken);
```

### cURL

```bash
# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@coffeeos.mx",
    "password": "SecurePassword123!"
  }'

# Request autenticado
curl -X GET http://localhost:4000/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Cambiar contraseña
curl -X POST http://localhost:4000/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!"
  }'
```

---

## Proteger Endpoints Existentes

Para proteger todos los endpoints del API:

### Opción 1: Guard Global (Recomendado)

```typescript
// main.ts
import { JwtAuthGuard } from './modules/auth';

const app = await NestFactory.create(AppModule);
app.useGlobalGuards(new JwtAuthGuard());
```

Luego marcar endpoints públicos con `@Public()`:

```typescript
@Public()
@Post('login')
async login() { }
```

### Opción 2: Guard por Controller

```typescript
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  // Todos los endpoints protegidos
}
```

---

## Seguridad

### Mejores Prácticas

1. ✅ **HTTPS en producción**: Siempre usar HTTPS para evitar intercepción de tokens
2. ✅ **Tokens seguros**: Usar secretos fuertes y únicos por entorno
3. ✅ **Refresh tokens**: Implementar rotación de refresh tokens
4. ✅ **Logout**: Implementar blacklist de tokens si es crítico
5. ✅ **Rate limiting**: Limitar intentos de login
6. ✅ **2FA**: Considerar autenticación de dos factores

### Variables de Entorno

```bash
# Desarrollo
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Producción
JWT_SECRET=un-secreto-super-seguro-de-minimo-32-caracteres-aleatorios
JWT_EXPIRES_IN=1h
```

---

## Testing

```bash
# Ejecutar tests
npm run test

# Tests e2e de auth
npm run test:e2e -- auth.e2e-spec.ts
```

---

## Siguientes Pasos

- [ ] Implementar refresh token rotation
- [ ] Agregar rate limiting en login
- [ ] Implementar blacklist de tokens
- [ ] Agregar roles y permisos (RBAC)
- [ ] Implementar 2FA con TOTP
- [ ] Agregar OAuth2 (Google, Facebook)
- [ ] Logs de auditoría de autenticación
