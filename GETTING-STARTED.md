# 🚀 CoffeeOS - Guía de Inicio Rápido

## ✅ Estado Actual del Proyecto

### Completado

- ✅ **Estructura del proyecto**: Monorepo con Turborepo
- ✅ **Frontend**: 25/25 módulos Next.js completados
- ✅ **Autenticación**: NextAuth + JWT integrado
- ✅ **Backend**: NestJS con módulos completos
- ✅ **Base de datos**: Prisma schema + migraciones
- ✅ **Infraestructura**: Docker Compose configurado

---

## 🏁 Inicio Rápido (5 minutos)

### 1️⃣ Prerequisitos

- Node.js 20+ y npm 9+
- Docker Desktop
- PowerShell (Windows) o Bash (Linux/Mac)

### 2️⃣ Instalación

```bash
# Clonar e instalar dependencias
git clone <repo-url>
cd CoffeeOS
npm install
```

### 3️⃣ Configurar Base de Datos

```bash
# Opción A: Setup automático (recomendado)
npm run db:setup

# Opción B: Manual
docker-compose up -d postgres redis
cd packages/database
npx prisma migrate deploy
npx ts-node seed.ts
cd ../..
```

### 4️⃣ Iniciar Desarrollo

```bash
# Inicia todos los servicios en paralelo
npm run dev
```

**Aplicaciones disponibles:**

- 🖥️ **POS Web**: http://localhost:3001
- 🔧 **API Backend**: http://localhost:4000
- 📊 **API Docs**: http://localhost:4000/api

---

## 🔐 Credenciales Demo

```
Owner:   owner@coffeedemo.mx / password123
Manager: manager@coffeedemo.mx / password123
Barista: barista@coffeedemo.mx / password123

Demo NextAuth: demo@coffeeos.com / demo123
```

---

## 🗄️ Servicios de Infraestructura

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

### Puertos

- **PostgreSQL**: 5434
- **Redis**: 6379
- **Baserow**: 8000
- **n8n**: 5678
- **Metabase**: 3030
- **Grafana**: 3001
- **MinIO**: 9000 (API), 9001 (Console)
- **MailHog**: 8025 (UI)

---

## 📦 Comandos Útiles

### Base de Datos

```bash
npm run db:setup          # Setup completo automatizado
npm run db:generate       # Generar Prisma Client
npm run db:migrate        # Crear nueva migración
npm run db:migrate:deploy # Aplicar migraciones
npm run db:seed           # Poblar con datos demo
npm run db:studio         # Prisma Studio (GUI)
npm run db:reset          # Resetear BD (⚠️ borra datos)
```

### Desarrollo

```bash
npm run dev              # Iniciar todos los apps
npm run build            # Build producción
npm run lint             # Lint código
npm run test             # Tests unitarios
npm run test:e2e         # Tests E2E
npm run type-check       # Verificar tipos TypeScript
```

### Docker

```bash
npm run docker:up        # Iniciar contenedores
npm run docker:down      # Detener contenedores
npm run docker:logs      # Ver logs en tiempo real
```

---

## 📁 Estructura del Proyecto

```
CoffeeOS/
├── apps/
│   ├── api/              # NestJS Backend (puerto 4000)
│   ├── pos-web/          # Next.js POS (puerto 3001)
│   ├── admin-web/        # Next.js Admin (puerto 3000)
│   └── mobile/           # React Native App
├── packages/
│   ├── database/         # Prisma schema + migraciones
│   ├── shared/           # Tipos compartidos
│   └── ui/               # Componentes UI reutilizables
├── infrastructure/       # Docker configs
└── scripts/              # Scripts de setup
```

---

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 🔧 Variables de Entorno

### Backend (apps/api)

Copia `.env.example` → `.env.local`

```bash
DATABASE_URL=postgresql://coffeeos:coffeeos123@localhost:5434/coffeeos_dev
JWT_SECRET=your-secret-key-min-32-chars
```

### Frontend (apps/pos-web)

Copia `.env.example` → `.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-min-32-chars
```

---

## 🐛 Troubleshooting

### Docker no inicia

```bash
# Verificar Docker está corriendo
docker ps

# Reiniciar contenedores
docker-compose restart
```

### Error de conexión PostgreSQL

```bash
# Verificar que PostgreSQL está corriendo
docker exec coffeeos-postgres pg_isready -U coffeeos

# Ver logs
docker logs coffeeos-postgres
```

### Prisma Client no genera

```bash
# Limpiar y regenerar
cd packages/database
rm -rf node_modules/.prisma
npx prisma generate
```

### Puerto en uso

```bash
# Ver qué proceso usa el puerto
netstat -ano | findstr :3001
netstat -ano | findstr :4000

# Cambiar puerto en .env o detener proceso
```

---

## 📚 Documentación Adicional

- [Plan Completo](./PLAN-COMPLETO.md)
- [Guía de Contribución](./CONTRIBUTING.md)
- [Arquitectura](./docs/architecture.md)
- [API Documentation](http://localhost:4000/api)

---

## 🆘 Soporte

¿Problemas? Revisa:

1. [Troubleshooting](#-troubleshooting)
2. Logs de Docker: `docker-compose logs -f`
3. Logs de apps en terminal

---

## 📈 Próximos Pasos

1. ✅ **Completado**: Frontend, Backend, Auth, Base de Datos
2. 🔄 **En progreso**: Probar stack completo
3. ⏳ **Pendiente**:
   - Integración Baserow
   - PWA y soporte offline
   - Tests completos
   - Integraciones externas (Twilio, CFDI, etc.)
   - CI/CD y deployment

---

**¡Listo para empezar! 🎉**

```bash
npm run dev
```

Abre http://localhost:3001 y usa las credenciales demo.
