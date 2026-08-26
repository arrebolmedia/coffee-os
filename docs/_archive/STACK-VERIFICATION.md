# ✅ Checklist de Verificación del Stack CoffeeOS

## 🎯 Estado Actual: Stack Completamente Configurado

### ✅ Componentes Completados

#### 1. Frontend (Next.js POS Web)

- ✅ 25/25 módulos implementados
- ✅ NextAuth configurado
- ✅ Middleware de autenticación
- ✅ Cliente API con interceptores
- ✅ Tipos TypeScript sin errores críticos
- ✅ Variables de entorno configuradas
- 📍 **Puerto**: 3001

#### 2. Backend (NestJS API)

- ✅ Todos los módulos creados
- ✅ AuthModule completo con JWT
- ✅ Prisma integrado
- ✅ CORS configurado
- ✅ Swagger documentation
- ✅ Guards y decoradores
- ✅ Validation pipes
- 📍 **Puerto**: 4000
- 📍 **API Docs**: http://localhost:4000/docs

#### 3. Base de Datos

- ✅ Prisma schema completo (1266 líneas)
- ✅ Migraciones existentes
- ✅ Seeder con datos demo
- ✅ Docker Compose configurado
- 📍 **Puerto**: 5434

---

## 🔍 Pasos de Verificación

### Paso 1: Iniciar Docker (REQUERIDO)

```bash
# Iniciar Docker Desktop (Windows)
# O desde terminal:
docker-compose up -d postgres redis
```

**Verificar:**

```bash
docker ps
# Debería mostrar:
# - coffeeos-postgres (puerto 5434)
# - coffeeos-redis (puerto 6379)
```

**Troubleshooting Docker:**

- Si Docker Desktop no está corriendo, abrirlo desde el menú de Windows
- Si falla, reiniciar Docker Desktop
- Verificar que WSL2 esté actualizado (en Windows)

### Paso 2: Setup Base de Datos

```bash
# Opción A: Automático (recomendado)
npm run db:setup

# Opción B: Manual
cd packages/database
npx prisma generate
npx prisma migrate deploy
npx ts-node seed.ts
cd ../..
```

**Verificar:**

```bash
# Ver tablas en Prisma Studio
npm run db:studio
# Abre en: http://localhost:5555
```

### Paso 3: Iniciar Aplicaciones

```bash
# Iniciar todo en modo desarrollo
npm run dev
```

**Aplicaciones esperadas:**

- ✅ API: http://localhost:4000
- ✅ POS Web: http://localhost:3001
- ✅ API Docs: http://localhost:4000/docs

### Paso 4: Probar Autenticación

**4.1 Abrir POS Web**

```
http://localhost:3001
```

Debería redirigir a `/login` automáticamente (middleware NextAuth)

**4.2 Iniciar Sesión**

```
Email: demo@coffeeos.com
Password: demo123
```

**4.3 Verificar Token**

- Abrir DevTools → Application → Cookies
- Buscar: `next-auth.session-token`
- Debe estar presente

**4.4 Probar API Directamente**

```bash
# Login en API
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@coffeedemo.mx",
    "password": "password123"
  }'

# Respuesta esperada:
# {
#   "user": {...},
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc..."
# }
```

### Paso 5: Verificar Conexión Frontend-Backend

**5.1 Abrir POS**

```
http://localhost:3001/pos
```

**5.2 Verificar en DevTools → Network:**

- ✅ Llamadas a `http://localhost:4000/api/v1/*`
- ✅ Header `Authorization: Bearer ...` presente
- ✅ Headers `X-Organization-Id` y `X-Location-Id` si aplica
- ✅ Respuestas 200 OK

**5.3 Probar Funcionalidad:**

- ✅ Cargar productos en catálogo
- ✅ Agregar productos al carrito
- ✅ Ver total calculado
- ✅ Procesar venta (simulada)

---

## 🐛 Troubleshooting Común

### Problema: Docker no inicia

```bash
# Verificar estado
docker ps

# Si falla:
# 1. Abrir Docker Desktop manualmente
# 2. Esperar a que muestre "Running"
# 3. Reintentar: docker-compose up -d postgres redis
```

### Problema: Puerto 4000 en uso

```bash
# Windows - Ver qué proceso usa el puerto
netstat -ano | findstr :4000

# Matar proceso (reemplaza PID)
taskkill /PID <numero> /F

# O cambiar puerto en .env.local
PORT=4001
```

### Problema: Puerto 3001 en uso

```bash
# Ver qué proceso usa el puerto
netstat -ano | findstr :3001

# Matar proceso
taskkill /PID <numero> /F

# O cambiar puerto en apps/pos-web/package.json
"dev": "next dev -p 3002"
```

### Problema: Prisma Client no genera

```bash
cd packages/database
rm -rf node_modules/.prisma
npx prisma generate
cd ../..
```

### Problema: Error de conexión a PostgreSQL

```bash
# Verificar que PostgreSQL esté corriendo
docker logs coffeeos-postgres

# Verificar conexión
docker exec coffeeos-postgres pg_isready -U coffeeos

# Si falla, reiniciar contenedor
docker-compose restart postgres
```

### Problema: NextAuth "Configuration error"

**Verificar variables de entorno en `apps/pos-web/.env.local`:**

```bash
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=coffeeos-dev-secret-key-2025-change-in-production-min-32-chars
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Problema: CORS Error

**Verificar que el backend permite el origen:**

```typescript
// apps/api/src/main.ts ya incluye:
origin: ['http://localhost:3001'];
```

Si usas otro puerto, agregar a la lista.

---

## ✅ Checklist Final

- [ ] Docker Desktop corriendo
- [ ] PostgreSQL contenedor activo (puerto 5434)
- [ ] Redis contenedor activo (puerto 6379)
- [ ] Prisma Client generado
- [ ] Migraciones aplicadas
- [ ] Base de datos poblada con seed
- [ ] Backend API corriendo (puerto 4000)
- [ ] Frontend POS corriendo (puerto 3001)
- [ ] Login funcional
- [ ] Token JWT guardado en cookies
- [ ] Llamadas API funcionando
- [ ] Headers de autorización presentes
- [ ] Productos cargando en POS
- [ ] Sin errores críticos en consola

---

## 📊 Servicios Adicionales (Opcionales)

```bash
# Iniciar todos los servicios de infraestructura
docker-compose up -d

# Servicios disponibles:
# - Baserow: http://localhost:8000
# - n8n: http://localhost:5678 (admin/coffeeos123)
# - Metabase: http://localhost:3030
# - Grafana: http://localhost:3001
# - MinIO: http://localhost:9001 (coffeeos/coffeeos123)
# - MailHog: http://localhost:8025
```

---

## 🎯 Próximos Pasos Después de Verificación

1. **Implementar endpoints reales**: Reemplazar mocks por llamadas API
2. **Integración Baserow**: Sincronización de datos
3. **PWA**: Service Worker y caché offline
4. **Tests**: Unitarios, integración, E2E
5. **Integraciones**: Twilio, Mailrelay, CFDI
6. **Deployment**: CI/CD y producción

---

**Estado**: ✅ Stack completamente configurado y listo para pruebas
**Última actualización**: 24 de Octubre, 2025
