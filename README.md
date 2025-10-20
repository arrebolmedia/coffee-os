# ☕ CoffeeOS - Plataforma Multi-Tenant para Cafeterías

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![Docker](https://img.shields.io/badge/docker-required-blue)
![Status](https://img.shields.io/badge/status-in%20development-orange)
![CI](https://github.com/your-org/CoffeeOS/workflows/Agent%20Verify/badge.svg)
![Coverage](https://img.shields.io/badge/coverage-TBD-yellowgreen)

</div>

## 🚨 Estado Actual

> **✅ DESARROLLO ACTIVO**: Módulos backend en progreso  
> **📊 Progreso**: 30% completado (8 de 27 módulos backend implementados)  
> **🎯 Último módulo**: Finance & Legal (20 endpoints, 36 tests)  
> **🔗 Docs**: [SESION-FINANCE-LEGAL.md](./docs/SESION-FINANCE-LEGAL.md)

**Lee primero**: [QUICKSTART.md](./QUICKSTART.md) | [STATUS.md](./STATUS.md) | [INDICE.md](./INDICE.md)

---

## 🚀 Descripción General

CoffeeOS es una **plataforma integral multi-tenant** que traduce todo el Plan Maestro en software operativo para cafeterías. Incluye:

✅ **POS** con modificadores y offline-first  
✅ **Inventario** con par levels y órdenes de compra  
✅ **Control de Calidad** NOM-251 con checklists digitales  
✅ **Costeo** automático por recetas  
✅ **CRM y Lealtad** con programa 9+1 y segmentación RFM  
✅ **Capacitación** 30/60/90 días  
✅ **Finanzas** con CFDI 4.0 y P&L por ubicación  
✅ **Analytics** en tiempo real con Metabase

## 📁 Estructura del Proyecto

```
CoffeeOS/
├── 📂 apps/
│   ├── 📱 pos-web/           # Next.js PWA - POS Web App
│   ├── 📱 admin-web/         # Next.js - Admin Dashboard
│   ├── 📱 mobile/            # React Native + Expo - Mobile App
│   └── 🖥️ api/               # NestJS - Backend API
├── 📂 packages/
│   ├── 🎨 ui/                # Shared UI Components
│   ├── 🔧 shared/            # Shared utilities & types
│   ├── 📊 database/          # Prisma schema & migrations
│   └── 🔌 integrations/      # External integrations
├── 📂 infrastructure/
│   ├── 🐳 docker/           # Docker configurations
│   ├── ☁️ terraform/        # Infrastructure as Code
│   └── 🔄 n8n/              # Automation workflows
├── 📂 docs/                  # Documentation
└── 📂 tools/                 # Development tools
```

## 🎯 Módulos Principales

### 1. 🏪 **POS & Operaciones**

- POS rápido (modificadores, combos, propinas)
- Recetas/Fichas técnicas con parámetros
- Costeo automático y márgenes por producto
- Inventario por receta y par levels
- Tiempos de servicio p50/p90

### 2. ✅ **Calidad & Cumplimiento**

- Checklists apertura/cierre/NOM-251
- Bitácoras de temperaturas 1-4°C
- Control de PPM, TDS, limpieza
- Seguridad y protección civil

### 3. 👥 **RRHH & Capacitación**

- Onboarding y malla 30/60/90
- Evaluaciones teórico-prácticas
- Certificaciones internas
- Gestión de turnos y desempeño

### 4. 💰 **Finanzas & Legal**

- P&L por tienda
- Gestión de permisos y renovaciones
- Integración CFDI 4.0 vía PAC
- Punto de equilibrio y márgenes

### 5. 🎯 **CRM & Lealtad**

- Programa 9+1 digital
- Campañas de cumpleaños
- Segmentación RFM
- NPS y reseñas Google

### 6. 📊 **Analytics**

- Tableros diario/semanal/mensual
- KPIs operativos y financieros
- Reportes de sostenibilidad
- Métricas de calidad

## 🛠️ Stack Tecnológico

### Backend

- **Framework**: NestJS + TypeScript
- **ORM**: Prisma
- **Base de datos**: PostgreSQL + Redis
- **Autenticación**: JWT + 2FA
- **API**: GraphQL + REST

### Frontend

- **Web**: Next.js 13+ App Router + React + TypeScript
- **Móvil**: React Native + Expo
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **PWA**: Service Workers + IndexedDB

### Integraciones

- **Baserow**: Base de datos no-code principal
- **n8n**: Automatización de workflows
- **Twilio**: WhatsApp Business + SMS + Voice
- **Mailrelay**: Email marketing y transaccional
- **PAC CFDI**: Facturación electrónica México
- **Pagos MX**: Clip, Mercado Pago, BBVA

### Infraestructura

- **Contenedores**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **IaC**: Terraform
- **Monitoreo**: Prometheus + Grafana
- **Logs**: ELK Stack

## 📦 Módulos Backend (8 de 27 Completados)

### ✅ Módulos Completados

| Módulo | Endpoints | Tests | Commit | Docs |
|--------|-----------|-------|--------|------|
| 🔐 **Auth** | 8 | 35 | `1c68dbf` | [Ver](./docs/SESION-AUTH.md) |
| 🏢 **Organizations** | 6 | 28 | `2d52bcb` | [Ver](./docs/SESION-ORGANIZATIONS.md) |
| 👥 **Users** | 7 | 30 | `e5f0aea` | [Ver](./docs/SESION-USERS.md) |
| 📝 **Recipes** | 9 | 42 | - | - |
| 📦 **Inventory** | 10 | 38 | - | - |
| 🛒 **POS** | 12 | 45 | - | - |
| 🎯 **CRM & Loyalty** | 37 | 55 | `e5f0aea` | [Ver](./docs/SESION-CRM-LOYALTY.md) |
| 💰 **Finance & Legal** | 20 | 36 | `ed4bca3` | [Ver](./docs/SESION-FINANCE-LEGAL.md) |

**Total**: **109 endpoints** | **309 tests** | **100% passing**

### 🚧 En Desarrollo

- ✅ **Quality & Compliance** - NOM-251 checklists
- 🔄 **HR & Training** - 30/60/90 onboarding
- 🔄 **Analytics** - Dashboards y KPIs
- 🔄 **Integrations** - Twilio, Mailrelay, CFDI

### 📋 Pendientes (15 módulos)

Ver roadmap completo en [todos/README.md](./todos/README.md)

## 🚦 Roles y Permisos (RBAC)

| Rol                   | Permisos                                   |
| --------------------- | ------------------------------------------ |
| 👑 **Propietario**    | Acceso completo + multi-sede               |
| 👔 **Gerente**        | POS, inventarios, RRHH, reportes, permisos |
| ☕ **Líder de barra** | Recetas, QC, checklists, capacitación      |
| 🎯 **Barista**        | POS limitado, tareas, capacitación         |
| 💳 **Caja**           | Cobro, CFDI, arqueos                       |
| 🔍 **Auditor**        | Solo lectura + firmas digitales            |
| 📊 **Contador**       | P&L, CFDI, exportaciones                   |

## 🌮 Cumplimiento México

- ✅ **CFDI 4.0**: Timbrado automático vía PAC
- ✅ **NOM-251**: Checklists de seguridad alimentaria
- ✅ **LFPDPPP**: Gestión de consentimientos y privacidad
- ✅ **Pagos locales**: Clip, Mercado Pago, BBVA Terminal

## 🚀 Instalación Rápida

### Prerrequisitos

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### Configuración Local

#### Opción 1: Script Automático (Recomendado)

```bash
# Clonar repositorio
git clone https://github.com/tu-org/coffeeos.git
cd coffeeos

# Ejecutar script de configuración
./scripts/setup-dev.sh  # Linux/macOS
# o
./scripts/setup-dev.ps1  # Windows PowerShell
```

#### Opción 2: Manual

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar servicios con Docker
docker-compose up -d

# Esperar a que PostgreSQL esté listo
# Generar cliente Prisma
cd packages/database && npm run generate

# Ejecutar migraciones
npm run migrate

# Sembrar datos iniciales
npm run seed

# Regresar al directorio raíz
cd ../..

# Iniciar aplicaciones
npm run dev
```

### URLs Locales

- 🏪 **POS Web**: http://localhost:3000
- 👔 **Admin Panel**: http://localhost:3001
- 🔌 **API**: http://localhost:4000
- 📊 **Docs API**: http://localhost:4000/docs

## 📱 Aplicaciones

### POS Web (PWA)

```bash
cd apps/pos-web
npm run dev
# http://localhost:3000
```

### Admin Dashboard

```bash
cd apps/admin-web
npm run dev
# http://localhost:3001
```

### API Backend

```bash
cd apps/api
npm run dev
# http://localhost:4000
```

### Mobile App

```bash
cd apps/mobile
npx expo start
# Escanea QR con Expo Go
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:e2e

# Tests de carga
npm run test:load

# Cobertura
npm run test:coverage
```

## 🤖 Auto-Dev Setup

CoffeeOS incluye un sistema completo de desarrollo asistido por AI con:

### 🛠️ Herramientas Disponibles

- **Continue**: Copiloto en VS Code con GPT-4o/Ollama
- **aider**: Auto-commits inteligentes desde CLI
- **OpenHands**: Agente autónomo para PRs automáticos

### 🚀 Quick Start

```powershell
# 1. Configurar API keys
# Crear .env.local y añadir:
OPENAI_API_KEY=sk-your-key-here

# 2. Instalar aider (opcional)
pip install aider-chat

# 3. Instalar Continue extension en VS Code
# Marketplace: "Continue"

# 4. Validar setup
npm run validate
```

### 📋 Workflows

**Desarrollo con Continue:**

- `Ctrl+L` - Chat con AI
- `Ctrl+I` - Edición inline
- `/test` - Generar tests
- `/nestjs` - Ayuda NestJS
- `/nextjs` - Ayuda Next.js

**Auto-commits con aider:**

```powershell
# Editar archivo con auto-commits
aider apps/api/src/modules/pos/pos.service.ts

# Con instrucciones
aider --message "Add validation to DTO" file.ts
```

**Auto-PR con OpenHands:**

1. Crear issue con template "Auto-Fix"
2. Comentar: `/agent propose`
3. El agente crea PR automático

### 🔒 Quality Gates

Todos los PRs deben pasar:

- ✅ Lint & Format Check
- ✅ Type Check (TypeScript strict)
- ✅ Unit Tests (coverage ≥90%)
- ✅ E2E Tests (Playwright)
- ✅ Security Scan (Semgrep + Gitleaks)
- ✅ Build Verification

### 📚 Documentación Completa

- **Setup:** [docs/auto-dev-quickstart.md](./docs/auto-dev-quickstart.md)
- **Plan técnico:** [docs/plan-auto-dev.md](./docs/plan-auto-dev.md)

## 📦 Deployment

### Staging

```bash
npm run deploy:staging
```

### Producción

```bash
npm run deploy:prod
```

## 📊 MVP - 12 Semanas

### ✅ Semanas 1-2: Descubrimiento + UX

- [x] Entrevistas con usuarios finales
- [x] Diseño de flujos críticos
- [x] Wireframes y prototipos

### 🔄 Semanas 3-6: Construcción Núcleo

- [ ] POS (catálogo, modificadores, pagos)
- [ ] Recetas + inventario por receta
- [ ] Checklists y control de calidad
- [ ] Tablero diario básico

### 🔄 Semanas 7-8: CRM + Costeo

- [ ] Programa 9+1 y cumpleaños
- [ ] Costeo por receta y alertas
- [ ] NPS post-visita

### 🔄 Semanas 9: Piloto en Sitio

- [ ] Pruebas de pico: 30 tickets/20min
- [ ] Ajustes UX y estabilidad offline

### 🔄 Semanas 10-11: CFDI + Permisos

- [ ] Timbrado básico PAC
- [ ] Módulo de permisos con RRULE

### 🔄 Semana 12: Go-Live

- [ ] Capacitación final
- [ ] Métricas base establecidas
- [ ] Plan de soporte activo

## 🎯 Métricas de Éxito

### Operación

- ⚡ p90 barra < 3 min
- 📦 Reposiciones ≤ 1%
- ✅ Cumplimiento checklists ≥ 95%

### Finanzas

- 💰 Margen bruto ≥ 65%
- 👥 Labor ≤ 25%
- 📈 PE ≤ 80 tickets/día base

### Crecimiento

- ⭐ Rating Maps ≥ 4.6
- 🔄 Recompra 30/90 días ↑
- 🎁 Canje 9+1 = 12-18%

## 🤝 Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guías de desarrollo.

## 📄 Licencia

Este proyecto está licenciado bajo MIT - ver [LICENSE.md](LICENSE.md) para detalles.

## 📞 Soporte

- 📧 Email: soporte@coffeeos.mx
- 💬 WhatsApp: +52 55 1234 5678
- 📖 Docs: https://docs.coffeeos.mx
- 🐛 Issues: https://github.com/tu-org/coffeeos/issues

---

**Hecho con ☕ para la comunidad cafetera mexicana**
