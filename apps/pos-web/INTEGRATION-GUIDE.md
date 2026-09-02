# 🔗 CoffeeOS - Backend Integration Guide

## 📋 Pre-requisitos

1. ✅ Backend API corriendo en `http://localhost:4000`
2. ✅ Base de datos PostgreSQL activa
3. ✅ Redis activo (opcional para caché)
4. ✅ Variables de entorno configuradas

---

## 🚀 Setup Rápido

### **1. Configurar Variables de Entorno**

```bash
cd apps/pos-web

# Copiar archivo de ejemplo
cp .env.example .env.local

# Editar .env.local con tu configuración
```

**Variables importantes:**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

### **2. Levantar Backend**

```bash
# Terminal 1: Backend
cd apps/api
npm run dev

# Debería mostrar:
# 🚀 CoffeeOS API running on: http://localhost:4000
# 📚 Documentation: http://localhost:4000/docs
```

### **3. Verificar Conexión**

```bash
# Terminal 2: Test de conexión
cd apps/pos-web
npm run test:connection

# Debería mostrar:
# ✅ Health check passed
# ✅ Backend is reachable and responding
```

### **4. Levantar Frontend**

```bash
# Terminal 3: Frontend
cd apps/pos-web
npm run dev

# Abrir http://localhost:3000/pos
```

---

## 🔍 Pruebas de Integración

### **Test 1: Health Check**

```bash
# Verificar que el backend esté vivo
curl http://localhost:4000/health

# Respuesta esperada:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### **Test 2: API Documentation**

Abrir en el navegador:

```
http://localhost:4000/docs
```

Deberías ver Swagger UI con todos los endpoints documentados.

### **Test 3: Productos (requiere autenticación)**

```bash
# Sin token (debería dar 401)
curl http://localhost:4000/api/v1/products

# Con token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/v1/products
```

---

## 🗄️ Preparar Datos de Prueba

### **Opción 1: Usar Prisma Studio**

```bash
cd packages/database
npx prisma studio

# Crear manualmente:
# 1. Organization
# 2. Location
# 3. User (con role ADMIN)
# 4. Categories
# 5. Products
```

### **Opción 2: Seed Script (si existe)**

```bash
cd packages/database
npm run seed

# O
npx prisma db seed
```

### **Opción 3: API Endpoints**

Usar Swagger UI (`http://localhost:4000/docs`) para:

1. **Crear Organization**

   ```
   POST /api/v1/organizations
   {
     "name": "Café Demo",
     "plan": "STARTER"
   }
   ```

2. **Crear Location**

   ```
   POST /api/v1/locations
   {
     "name": "Sucursal Principal",
     "organization_id": "uuid-from-step-1"
   }
   ```

3. **Crear User**

   ```
   POST /api/v1/auth/register
   {
     "email": "admin@cafedemo.com",
     "password": "password123",
     "name": "Admin User",
     "organization_id": "uuid-from-step-1"
   }
   ```

4. **Login**

   ```
   POST /api/v1/auth/login
   {
     "email": "admin@cafedemo.com",
     "password": "password123"
   }
   ```

   Guardar el `access_token` para siguientes requests.

5. **Crear Categories**

   ```
   POST /api/v1/categories
   Authorization: Bearer YOUR_TOKEN
   {
     "name": "Bebidas Calientes",
     "sort_order": 1,
     "is_active": true
   }
   ```

6. **Crear Products**
   ```
   POST /api/v1/products
   Authorization: Bearer YOUR_TOKEN
   {
     "sku": "ESP001",
     "name": "Espresso",
     "price": 45,
     "category_id": "category-uuid",
     "type": "SIMPLE",
     "status": "ACTIVE",
     "track_inventory": true,
     "current_stock": 100
   }
   ```

---

## 🔐 Autenticación en Frontend

### **Flow de Autenticación**

1. Usuario ingresa credenciales en `/login`
2. Frontend envía POST a `/api/v1/auth/login`
3. Backend responde con:
   ```json
   {
     "access_token": "eyJhbGc...",
     "refresh_token": "eyJhbGc...",
     "user": {
       "id": "uuid",
       "email": "admin@cafedemo.com",
       "name": "Admin User"
     }
   }
   ```
4. Frontend guarda tokens en `auth.store.ts`
5. Todas las requests subsecuentes incluyen header:
   ```
   Authorization: Bearer eyJhbGc...
   ```

### **Implementar Login Page** (Pendiente)

```typescript
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/pos');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 🧪 Testing de Integración

### **Manual Testing Checklist**

- [ ] Backend health check pasa
- [ ] Login con credenciales válidas funciona
- [ ] Productos se cargan en catálogo POS
- [ ] Categorías se muestran en filtros
- [ ] Agregar producto al carrito funciona
- [ ] Crear orden y enviar a backend funciona
- [ ] Orden se guarda en base de datos
- [ ] Offline: orden se guarda en IndexedDB
- [ ] Online: orden en cola se sincroniza
- [ ] Refresh token funciona al expirar access token

### **Automated E2E Testing**

```bash
# Asegurar que backend y frontend estén corriendo
# Terminal 1: Backend (port 4000)
cd apps/api && npm run dev

# Terminal 2: Frontend (port 3000)
cd apps/pos-web && npm run dev

# Terminal 3: E2E tests
cd apps/pos-web
npm run test:e2e

# Con UI interactiva
npm run test:e2e:ui
```

---

## 🐛 Troubleshooting

### **Error: "Network Error" o "Failed to fetch"**

**Causa**: Backend no está corriendo o CORS mal configurado.

**Solución**:

```bash
# 1. Verificar que backend esté corriendo
curl http://localhost:4000/health

# 2. Verificar CORS en apps/api/src/main.ts
# Debe incluir: origin: ['http://localhost:3000']

# 3. Reiniciar backend
cd apps/api
npm run dev
```

### **Error: 401 Unauthorized**

**Causa**: Token expirado o no enviado.

**Solución**:

```typescript
// Verificar en DevTools → Application → Local Storage
// Buscar: auth-storage

// Si no hay token o está expirado:
// 1. Hacer login nuevamente
// 2. Verificar que api-client.ts agregue header Authorization
```

### **Error: CORS Policy**

**Causa**: Frontend corre en puerto diferente y no está en whitelist.

**Solución**:

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    'http://localhost:3000', // ← Agregar este
    'http://localhost:3001',
  ],
  credentials: true,
});
```

### **Error: "Cannot read property 'id' of undefined"**

**Causa**: Response del backend no tiene la estructura esperada.

**Solución**:

```typescript
// Verificar en DevTools → Network la respuesta del endpoint
// Ajustar types en src/types/index.ts para coincidir
```

### **Base de datos vacía**

**Causa**: No se han creado datos de prueba.

**Solución**:

```bash
# Opción 1: Prisma Studio
cd packages/database
npx prisma studio

# Opción 2: Seed script
npm run seed

# Opción 3: Swagger UI
# http://localhost:4000/docs
# Crear datos manualmente vía API
```

---

## 📊 Monitoring de Requests

### **En el Frontend**

```typescript
// Ver requests en DevTools
// Chrome → F12 → Network → Filter: XHR

// Habilitar debug en .env.local
NEXT_PUBLIC_DEBUG = true;

// Logs en consola
// src/lib/api-client.ts ya tiene interceptors
```

### **En el Backend**

```bash
# Logs en terminal donde corre NestJS
# Debería mostrar:
# [Nest] LOG [RouterExplorer] Mapped {/api/v1/products, GET}
# [Nest] INFO Request GET /api/v1/products
```

---

## 🚀 Deploy Considerations

### **Environment Variables en Producción**

```env
# Vercel / Netlify
NEXT_PUBLIC_API_URL=https://api.coffeeos.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.coffeeos.com

# Railway / Render / Fly.io (Backend)
DATABASE_URL=postgresql://user:pass@host:5432/coffeeos
REDIS_URL=redis://host:6379
JWT_SECRET=your-super-secret-key
CORS_ORIGINS=https://pos.coffeeos.com,https://admin.coffeeos.com
```

### **HTTPS Required**

- Service Worker solo funciona en HTTPS (o localhost)
- PWA install prompt requiere HTTPS
- WebSockets seguros (wss://)

### **Database Migrations**

```bash
cd packages/database
npx prisma migrate deploy
```

---

## 📚 Recursos Adicionales

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)

---

## ✅ Integration Checklist

### **Backend Setup**

- [ ] PostgreSQL corriendo
- [ ] Redis corriendo (opcional)
- [ ] `apps/api/.env` configurado
- [ ] Migraciones ejecutadas (`prisma migrate dev`)
- [ ] Seed data creado
- [ ] Backend corriendo en port 4000
- [ ] Swagger accessible en `/docs`

### **Frontend Setup**

- [ ] `apps/pos-web/.env.local` creado
- [ ] NEXT_PUBLIC_API_URL apunta a backend
- [ ] Frontend corriendo en port 3000
- [ ] Service Worker registrado (DevTools → Application)
- [ ] IndexedDB creado (DevTools → Application → IndexedDB)

### **Integration Tests**

- [ ] Health check pasa (`npm run test:connection`)
- [ ] Login funciona
- [ ] Productos se cargan
- [ ] Crear orden funciona
- [ ] Offline sync funciona
- [ ] E2E tests pasan (`npm run test:e2e`)

---

**Last Updated**: October 21, 2025  
**Status**: Ready for integration testing
