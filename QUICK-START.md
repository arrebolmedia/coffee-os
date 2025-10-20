# 🚀 CoffeeOS - Quick Start Guide

## ¡Bienvenido al Desarrollo de CoffeeOS!

Esta guía te llevará de 0 a 100 en menos de 10 minutos.

---

## 📋 Pre-requisitos

✅ **Node.js v22.17.0** - Instalado  
✅ **npm 10.9.2** - Instalado  
✅ **Docker Desktop** - Requerido para servicios  
✅ **Git** - Para control de versiones

---

## 🎯 Inicio Rápido (3 comandos)

```powershell
# 1. Instalar dependencias (ya ejecutándose en background)
npm install

# 2. Iniciar todos los servicios
.\scripts\start-dev.ps1

# 3. Abrir en el navegador
# POS:   http://localhost:3000
# Admin: http://localhost:3001
# API:   http://localhost:4000
```

---

## 📦 ¿Qué incluye el entorno de desarrollo?

### Backend Services (Docker)

- **PostgreSQL** `:5432` - Base de datos principal
- **Redis** `:6379` - Cache y sesiones
- **Baserow** `:8000` - Base de datos no-code
- **n8n** `:5678` - Automatización de workflows
- **MinIO** `:9000/:9001` - Almacenamiento S3-compatible
- **Metabase** `:3333` - Business Intelligence
- **Prometheus** `:9090` - Métricas
- **Grafana** `:3001` - Dashboards

### Frontend Apps (Node)

- **POS Web** `:3000` - Punto de venta (Next.js)
- **Admin Web** `:3001` - Panel administrativo (Next.js)
- **API** `:4000` - Backend REST + GraphQL (NestJS)

---

## 🛠️ Comandos Útiles

### Gestión del Proyecto

```powershell
# Iniciar todo el entorno
.\scripts\start-dev.ps1

# Iniciar solo apps de desarrollo
npm run dev

# Ejecutar tests
npm run test

# Linting
npm run lint

# Build para producción
npm run build
```

### Base de Datos

```powershell
# Generar cliente de Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Abrir Prisma Studio (GUI)
npm run db:studio

# Seed de datos demo
npm run db:seed

# Reset completo de BD
npm run db:reset
```

### Docker

```powershell
# Iniciar servicios
npm run docker:up

# Detener servicios
npm run docker:down

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f postgres
```

---

## 🗂️ Estructura del Proyecto

```
CoffeeOS/
├── apps/
│   ├── api/              # NestJS Backend
│   ├── pos-web/          # POS Next.js
│   ├── admin-web/        # Admin Next.js
│   └── mobile/           # React Native
├── packages/
│   ├── database/         # Prisma Schema
│   ├── integrations/     # Integraciones externas
│   ├── shared/           # Código compartido
│   └── ui/               # Componentes UI
├── infrastructure/
│   ├── docker/           # Docker configs
│   └── n8n/              # Workflows
├── docs/                 # Documentación
├── todos/                # TODOs técnicos
└── scripts/              # Scripts de automatización
```

---

## 👤 Usuarios Demo

Una vez que ejecutes el seed (`npm run db:seed`), tendrás estos usuarios:

| Email                   | Password      | Rol     | Permisos      |
| ----------------------- | ------------- | ------- | ------------- |
| `owner@coffeedemo.mx`   | `password123` | OWNER   | Acceso total  |
| `manager@coffeedemo.mx` | `password123` | MANAGER | Operativo     |
| `barista@coffeedemo.mx` | `password123` | BARISTA | POS + Recetas |

---

## 🎨 Productos Demo

El seed incluye:

### ☕ Espresso

- Espresso ($35)
- Americano ($45)
- Capuccino ($55)
- Latte ($55)

### 🍃 Filter Coffee

- Chemex ($65)
- V60 ($65)

### 🧊 Cold Brew

- Cold Brew ($55)
- Iced Latte ($60)

### 🥐 Pastries

- Croissant ($35)
- Pan de Chocolate ($40)

### 🥪 Sandwiches

- Sandwich de Jamón ($65)

### 🔧 Modificadores

- **Leches**: Regular, Deslactosada (+$5), Almendra (+$10), Avena (+$10), Soya (+$8)
- **Tamaños**: 8oz, 12oz (+$10), 16oz (+$15)
- **Extras**: Shot Extra (+$15), Vainilla (+$10), Caramelo (+$10), Crema (+$8)

---

## 🔍 Verificación del Entorno

### Verificar servicios Docker

```powershell
docker ps
```

Deberías ver ~8 contenedores corriendo.

### Verificar API

```powershell
curl http://localhost:4000/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

### Verificar Base de Datos

```powershell
npm run db:studio
```

Se abrirá Prisma Studio en http://localhost:5555

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

```powershell
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# Ver logs
docker-compose logs postgres

# Reiniciar servicio
docker-compose restart postgres
```

### Error: "Port already in use"

```powershell
# Ver qué proceso está usando el puerto
netstat -ano | findstr :3000

# Matar el proceso (reemplaza <PID>)
taskkill /PID <PID> /F
```

### Error: "Prisma client not generated"

```powershell
npm run db:generate
```

### Docker no inicia

```powershell
# Verificar Docker Desktop está corriendo
docker --version

# Limpiar volúmenes
docker-compose down -v

# Reiniciar desde cero
docker-compose up -d
```

---

## 📚 Próximos Pasos

### 1. Familiarízate con el POS

- Abre http://localhost:3000
- Login con `barista@coffeedemo.mx` / `password123`
- Crea tu primera orden
- Prueba los modificadores

### 2. Explora el Admin Panel

- Abre http://localhost:3001
- Login con `owner@coffeedemo.mx` / `password123`
- Navega por productos, usuarios, reportes

### 3. Prueba la API

- Abre http://localhost:4000/api-docs (Swagger)
- Prueba endpoints con Postman/Insomnia
- Revisa el GraphQL Playground en /graphql

### 4. Revisa el Código

- Comienza con `apps/api/src/main.ts`
- Luego `apps/pos-web/src/app/page.tsx`
- Explora `packages/database/prisma/schema.prisma`

### 5. Ejecuta Tests

```powershell
npm run test
```

---

## 🎯 Objetivos de la Semana 1

Según **TODO-01-Research-User-Journey.md**:

### Lunes 22 Oct

- ✅ Kick-off meeting
- ✅ Asignación de TODOs 1-3
- ✅ Setup entorno de desarrollo

### Martes 23 Oct

- [ ] User interviews (2 cajeros/baristas + 1 gerente)
- [ ] Documentar pain points actuales

### Miércoles 24 Oct

- [ ] Crear journey maps
- [ ] Identificar momentos críticos

### Jueves 25 Oct

- [ ] Compilar insights
- [ ] Crear documento de hallazgos

### Viernes 26 Oct

- [ ] Presentación a stakeholders
- [ ] Feedback y ajustes

---

## 📞 Soporte

### Documentación

- **Plan Completo**: `PLAN-COMPLETO.md`
- **Plan Implementación**: `PLAN-IMPLEMENTACION.md`
- **Status Report**: `STATUS-REPORT.md`
- **TODOs**: Carpeta `todos/`

### Comandos de Ayuda

```powershell
# Ver todos los scripts disponibles
npm run

# Ver estructura de proyecto
tree /F /A

# Ver logs de desarrollo
npm run dev
```

### Recursos Externos

- [NestJS Docs](https://docs.nestjs.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Turborepo Docs](https://turbo.build/repo/docs)

---

## ✨ Tips Pro

1. **Hot Reload**: Los cambios en código se reflejan automáticamente
2. **Prisma Studio**: Usa `npm run db:studio` para editar datos visualmente
3. **Docker Logs**: `docker-compose logs -f` para ver logs en tiempo real
4. **API Docs**: Swagger disponible en http://localhost:4000/api-docs
5. **TypeScript**: Los tipos se generan automáticamente desde Prisma

---

## 🎉 ¡Listo!

Ya tienes todo el entorno configurado. Es hora de comenzar a desarrollar.

**Siguiente paso**: Revisar `todos/TODO-01-Research-User-Journey.md` y comenzar con las entrevistas de usuario.

¡Mucho éxito! ☕🚀
