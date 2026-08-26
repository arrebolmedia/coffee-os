# 🚀 CoffeeOS - Quick Start Guide

Esta guía te ayudará a levantar el proyecto CoffeeOS en modo desarrollo.

## 📋 Prerrequisitos

- **Node.js** 18+ y npm
- **Docker Desktop** (para PostgreSQL y Redis)
- **Git**

## 🔧 Instalación

### 1. Instalar Dependencias

```powershell
npm install
```

### 2. Configurar Variables de Entorno

El archivo `.env` ya está creado con valores por defecto. Si necesitas ajustar algo:

```powershell
# Editar .env si es necesario
notepad .env
```

Variables importantes:

- `DATABASE_URL`: Conexión a PostgreSQL (puerto 5434)
- `REDIS_URL`: Conexión a Redis
- `JWT_SECRET`: Llave secreta para JWT (cambiar en producción)
- `PORT`: Puerto del API (4000)

### 3. Iniciar Servicios Docker

**Opción A: Script automatizado** (Recomendado)

```powershell
.\scripts\start-services.ps1
```

**Opción B: Manual**

```powershell
# Iniciar Docker Desktop primero, luego:
docker-compose up -d postgres redis

# Esperar 5 segundos y verificar
docker ps

# Ejecutar migraciones
cd packages\database
npx prisma migrate dev --name init
npx prisma generate
cd ..\..
```

### 4. Iniciar Aplicaciones

**Terminal 1: API Backend**

```powershell
cd apps\api
npm run start:dev
```

El API estará en: http://localhost:4000

- Swagger Docs: http://localhost:4000/api
- Health Check: http://localhost:4000/health

**Terminal 2: Admin Dashboard**

```powershell
cd apps\admin-web
npm run dev
```

Admin Dashboard: http://localhost:3002

**Terminal 3: POS Web** (Opcional)

```powershell
cd apps\pos-web
npm run dev
```

POS Web: http://localhost:3001

## 🧪 Probar el API

Ejecutar el script de prueba:

```powershell
.\scripts\test-api.ps1
```

Este script probará:

- ✅ Health check
- ✅ Crear categoría
- ✅ Crear producto
- ✅ Listar productos
- ✅ Actualizar producto
- ✅ Obtener estadísticas

## 🗄️ Base de Datos

### Prisma Studio (GUI para la BD)

```powershell
cd packages\database
npx prisma studio
```

Se abre en: http://localhost:5555

### Migraciones

```powershell
cd packages\database

# Crear nueva migración
npx prisma migrate dev --name nombre_de_la_migracion

# Aplicar migraciones en producción
npx prisma migrate deploy

# Resetear BD (⚠️ borra todos los datos)
npx prisma migrate reset
```

### Seed de Datos

```powershell
cd packages\database
npx tsx seed.ts
```

## 📊 Servicios Disponibles

| Servicio        | Puerto | URL                   | Credenciales                           |
| --------------- | ------ | --------------------- | -------------------------------------- |
| API Backend     | 4000   | http://localhost:4000 | -                                      |
| Admin Dashboard | 3002   | http://localhost:3002 | -                                      |
| POS Web         | 3001   | http://localhost:3001 | -                                      |
| PostgreSQL      | 5434   | localhost:5434        | user: `coffeeos` / pass: `coffeeos123` |
| Redis           | 6379   | localhost:6379        | -                                      |
| Prisma Studio   | 5555   | http://localhost:5555 | -                                      |

## 🐛 Troubleshooting

### Docker no inicia

```powershell
# Verificar que Docker Desktop esté corriendo
docker ps

# Si no funciona, reiniciar Docker Desktop
```

### PostgreSQL no conecta

```powershell
# Verificar que el contenedor esté corriendo
docker ps | Select-String postgres

# Ver logs
docker logs coffeeos-postgres

# Reiniciar contenedor
docker-compose restart postgres
```

### Error en migraciones

```powershell
# Resetear migraciones (⚠️ borra datos)
cd packages\database
npx prisma migrate reset

# O forzar push del schema
npx prisma db push
```

### Puerto ocupado

```powershell
# Ver qué proceso usa el puerto 4000
netstat -ano | findstr :4000

# Matar proceso (reemplazar PID)
taskkill /PID <PID> /F
```

## 📚 Estructura del Proyecto

```
CoffeeOS/
├── apps/
│   ├── api/              # NestJS Backend
│   ├── admin-web/        # Admin Dashboard (Next.js)
│   └── pos-web/          # POS Web App (Next.js)
├── packages/
│   ├── database/         # Prisma Schema & Migrations
│   └── shared/           # Código compartido
├── scripts/              # Scripts de automatización
└── docker-compose.yml    # Servicios Docker
```

## 🔗 Recursos

- [Documentación de Prisma](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)

## ✅ Checklist de Verificación

- [ ] Node.js 18+ instalado
- [ ] Docker Desktop corriendo
- [ ] Dependencias instaladas (`npm install`)
- [ ] Variables de entorno configuradas (`.env`)
- [ ] PostgreSQL corriendo (`docker ps`)
- [ ] Migraciones ejecutadas (`prisma migrate dev`)
- [ ] API corriendo en puerto 4000
- [ ] Admin Dashboard corriendo en puerto 3002
- [ ] Test de API ejecutado exitosamente

## 🎯 Próximos Pasos

1. **Explorar Swagger**: http://localhost:4000/api
2. **Crear productos** desde el Admin Dashboard
3. **Probar el POS** en http://localhost:3001
4. **Ver datos** en Prisma Studio
5. **Revisar logs** con `docker-compose logs -f`

---

**¿Problemas?** Revisa los logs en `docker-compose logs -f postgres redis`
