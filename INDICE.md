# 📚 Índice de Documentación - CoffeeOS

## 🚀 Inicio Rápido

### Para Empezar AHORA

1. **[QUICKSTART.md](./QUICKSTART.md)** ⚡  
   Guía rápida de 5 pasos para poner en marcha el proyecto

2. **[PROJECT_STATUS.txt](./PROJECT_STATUS.txt)** 📊  
   Vista visual ASCII del estado actual del proyecto

### Estado del Proyecto

3. **[STATUS.md](./STATUS.md)** 📋  
   Estado completo, bloqueadores, progreso y próximos pasos

4. **[SESION_RESUMEN.md](./SESION_RESUMEN.md)** 📝  
   Resumen detallado del trabajo realizado en esta sesión

---

## 🗄️ Configuración de Baserow

### Documentación Principal

5. **[docs/integrations/baserow.md](./docs/integrations/baserow.md)** 📖  
   Documentación técnica completa (5,800+ líneas)
   - Esquema completo de 12 tablas
   - Fórmulas automáticas
   - Vistas personalizadas
   - Configuración de API y webhooks

6. **[docs/setup/BASEROW_SETUP.md](./docs/setup/BASEROW_SETUP.md)** 🛠️  
   Guía paso a paso para configuración manual (900+ líneas)
   - Instrucciones detalladas
   - Datos iniciales para importar
   - Checklist de verificación

### Scripts de Automatización

7. **[scripts/setup-baserow.ps1](./scripts/setup-baserow.ps1)** 🔧  
   Script PowerShell nativo (NO requiere Node.js)
   - Crea base de datos automáticamente
   - Configura 12 tablas
   - Importa datos iniciales

8. **[scripts/setup-baserow.js](./scripts/setup-baserow.js)** 🔧  
   Script Node.js alternativo
   - 600+ líneas de código
   - Cliente axios para API
   - Esquema completo

### Configuración

9. **[config/baserow.json](./config/baserow.json)** ⚙️  
   Archivo de configuración con IDs de tablas

---

## 🏗️ Arquitectura del Proyecto

### Estructura

10. **[package.json](./package.json)** 📦  
    Configuración del monorepo con Turbo

11. **[docker-compose.yml](./docker-compose.yml)** 🐳  
    Infraestructura Docker con 6 servicios

12. **[turbo.json](./turbo.json)** ⚙️  
    Configuración de Turbo para builds

### Base de Datos

13. **[packages/database/prisma/schema.prisma](./packages/database/prisma/schema.prisma)** 🗄️  
    Schema completo con 40+ tablas
    - Multi-tenant architecture
    - RBAC system
    - Relaciones e índices

---

## 📖 Documentación de Desarrollo

### Guías

14. **[CONTRIBUTING.md](./CONTRIBUTING.md)** 👥  
    Guía de contribución al proyecto

15. **[README.md](./README.md)** 📄  
    Descripción general del proyecto

### Configuración de Desarrollo

16. **[.env.example](./.env.example)** 🔐  
    Plantilla de variables de entorno

17. **[tsconfig.json](./tsconfig.json)** ⚙️  
    Configuración de TypeScript

18. **[.eslintrc.js](./.eslintrc.js)** ⚙️  
    Configuración de ESLint

19. **[.prettierrc.js](./.prettierrc.js)** ⚙️  
    Configuración de Prettier

---

## 📁 Estructura de Directorios

```
CoffeeOS/
├── 📄 Documentación Raíz
│   ├── QUICKSTART.md              → Inicio rápido
│   ├── STATUS.md                   → Estado del proyecto
│   ├── SESION_RESUMEN.md          → Resumen de sesión
│   ├── PROJECT_STATUS.txt          → Vista ASCII
│   └── INDICE.md                   → Este archivo
│
├── 🗂️ apps/                        → Aplicaciones
│   ├── pos-web/                    → PWA Punto de Venta
│   ├── api/                        → Backend NestJS
│   ├── mobile/                     → App React Native
│   └── admin-web/                  → Dashboard Admin
│
├── 📦 packages/                    → Librerías compartidas
│   ├── database/                   → Prisma schema
│   ├── shared/                     → Utilidades
│   └── ui-components/              → Componentes UI
│
├── 📚 docs/                        → Documentación detallada
│   ├── integrations/
│   │   └── baserow.md             → Doc técnica Baserow
│   └── setup/
│       └── BASEROW_SETUP.md       → Guía manual setup
│
├── 🔧 scripts/                     → Scripts de automatización
│   ├── setup-baserow.ps1          → Script PowerShell
│   └── setup-baserow.js           → Script Node.js
│
├── ⚙️ config/                      → Configuración
│   └── baserow.json               → IDs de Baserow
│
├── 🐳 infrastructure/              → Docker y configs
│
└── 🔒 .github/                     → CI/CD workflows
```

---

## 🎯 Flujo de Lectura Recomendado

### Para Desarrolladores Nuevos

1. Leer **QUICKSTART.md** para entender cómo empezar
2. Revisar **PROJECT_STATUS.txt** para ver el estado visual
3. Leer **STATUS.md** para conocer el contexto completo
4. Seguir **docs/setup/BASEROW_SETUP.md** para configurar Baserow

### Para Continuar el Desarrollo

1. Revisar **STATUS.md** sección "Próximos Pasos"
2. Ver TODOs pendientes (2-27)
3. Leer documentación técnica específica del módulo
4. Implementar según la arquitectura definida

### Para Configuración de Baserow

1. Leer **docs/setup/BASEROW_SETUP.md** (manual)
2. O ejecutar **scripts/setup-baserow.ps1** (automático)
3. Consultar **docs/integrations/baserow.md** para referencia técnica

---

## 🔍 Buscar por Tema

### Autenticación y Seguridad

- `packages/database/prisma/schema.prisma` → Modelos User, Role
- `STATUS.md` → TODO 2: Autenticación y RBAC

### Base de Datos

- `packages/database/prisma/schema.prisma` → Schema completo
- `docs/integrations/baserow.md` → Baserow como no-code DB
- `config/baserow.json` → Configuración IDs

### Docker e Infraestructura

- `docker-compose.yml` → Servicios Docker
- `STATUS.md` → Sección "Estado de los Servicios"

### POS y Ventas

- `apps/pos-web/` → Aplicación PWA
- `STATUS.md` → TODO 4: Sistema POS

### Inventario

- `packages/database/prisma/schema.prisma` → Modelos Inventory
- `docs/integrations/baserow.md` → Tablas de inventario
- `STATUS.md` → TODO 5: Gestión de Inventario

### CRM y Lealtad

- `packages/database/prisma/schema.prisma` → Modelos Customer, Campaign
- `docs/integrations/baserow.md` → Tablas de CRM
- `STATUS.md` → TODO 6: CRM y Programa de Lealtad

### Calidad NOM-251

- `packages/database/prisma/schema.prisma` → Modelos Quality, Checklist
- `docs/integrations/baserow.md` → Tablas de calidad
- `STATUS.md` → TODO 7: Calidad NOM-251

### Finanzas y CFDI

- `packages/database/prisma/schema.prisma` → Modelos Invoice, CFDI
- `docs/integrations/baserow.md` → Tablas de facturación
- `STATUS.md` → TODO 8: Finanzas y CFDI

---

## 📞 Información de Contacto

- **Proyecto**: CoffeeOS
- **Versión**: 0.1.0-alpha
- **Fecha**: 16 de Octubre de 2025
- **Estado**: 🚧 En desarrollo - Bloqueado por espacio en disco

---

## ✅ Archivos Importantes por Prioridad

### 🔴 CRÍTICO (Leer Primero)

1. **QUICKSTART.md** - Para empezar rápido
2. **STATUS.md** - Estado y bloqueadores
3. **PROJECT_STATUS.txt** - Vista rápida visual

### 🟡 IMPORTANTE (Configuración)

4. **docs/setup/BASEROW_SETUP.md** - Setup de Baserow
5. **scripts/setup-baserow.ps1** - Automatización
6. **docker-compose.yml** - Infraestructura

### 🟢 REFERENCIA (Consulta)

7. **docs/integrations/baserow.md** - Docs técnicas completas
8. **SESION_RESUMEN.md** - Resumen detallado
9. **packages/database/prisma/schema.prisma** - Schema DB

---

**Última actualización**: 16 de Octubre de 2025  
**Total de archivos documentados**: 19+  
**Líneas de documentación**: ~12,000+
