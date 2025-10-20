# 🚀 Auto-Dev Quick Start Guide

**CoffeeOS Auto-Dev System** - Guía rápida para desarrollo asistido con AI

---

## 📋 Tabla de Contenidos

- [Pre-requisitos](#-pre-requisitos)
- [Instalación](#-instalación)
- [Herramientas Disponibles](#-herramientas-disponibles)
- [Workflows de Desarrollo](#-workflows-de-desarrollo)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Pre-requisitos

### Software Requerido

```powershell
# Node.js 20+
node --version  # v20.11.0+

# npm o pnpm
npm --version   # 9.0.0+

# Python 3.10+ (para aider)
python --version  # 3.10+

# Docker Desktop (para OpenHands)
docker --version

# Git
git --version
```

### API Keys Necesarias

| Servicio | Variable de Entorno | Obligatorio | Propósito |
|----------|---------------------|-------------|-----------|
| OpenAI | `OPENAI_API_KEY` | ✅ Sí | Continue + aider + OpenHands |
| Anthropic | `ANTHROPIC_API_KEY` | ❌ No | Claude (alternativa) |
| GitHub | `GITHUB_TOKEN` | ❌ No | OpenHands PRs automáticos |
| Semgrep | `SEMGREP_APP_TOKEN` | ❌ No | Semgrep Cloud (opcional) |

---

## 🔧 Instalación

### 1. Clonar el Repositorio

```powershell
cd C:\Projects
git clone https://github.com/your-org/CoffeeOS.git
cd CoffeeOS
```

### 2. Instalar Dependencias Node

```powershell
# Usando npm
npm install

# O usando pnpm (recomendado)
corepack enable
pnpm install
```

### 3. Instalar aider (Opcional)

```powershell
pip install aider-chat
```

### 4. Configurar Variables de Entorno

Crear archivo `.env.local`:

```bash
# AI Models
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here  # Opcional

# GitHub
GITHUB_TOKEN=ghp_your-token-here  # Opcional

# Database (desarrollo)
DATABASE_URL=postgresql://postgres:postgres123@localhost:5434/coffeeos
REDIS_URL=redis://localhost:6379
```

### 5. Instalar Playwright (para E2E tests)

```powershell
npx playwright install --with-deps
```

### 6. Configurar Pre-commit Hooks

```powershell
npm run prepare
```

---

## 🛠️ Herramientas Disponibles

### 1. Continue - Copiloto en VS Code

**Instalación:**
1. Abrir VS Code
2. Ir a Extensions (Ctrl+Shift+X)
3. Buscar "Continue"
4. Instalar

**Configuración:**
- El archivo `.continue/config.json` ya está configurado
- Añadir tu `OPENAI_API_KEY` en el archivo

**Uso:**
```
Ctrl+L  - Abrir chat
Ctrl+I  - Inline edit
/edit   - Editar código seleccionado
/test   - Generar tests
```

**Comandos Custom:**
- `/nestjs` - Ayuda con código NestJS
- `/nextjs` - Ayuda con código Next.js
- `/prisma` - Ayuda con Prisma queries

### 2. aider - Auto-commits CLI

**Uso básico:**

```powershell
# Editar un archivo con auto-commits
aider apps/api/src/modules/pos/pos.service.ts

# Editar múltiples archivos
aider apps/api/src/modules/pos/*.ts

# Modo read-only (solo consultas)
aider --read apps/api/src/modules/pos/*.ts

# Con instrucciones directas
aider --message "Add validation to CreateUserDTO" apps/api/src/modules/users/dto/create-user.dto.ts
```

**Configuración:**
El archivo `.aider.conf.yml` ya está configurado con:
- Auto-commits habilitados
- Conventional commits
- Modelo: GPT-4o
- Lint automático

### 3. OpenHands - Agente Autónomo

**Iniciar con Docker Compose:**

```powershell
# Configurar variables de entorno
$env:GIT_CLONE_URL = "https://github.com/your-org/CoffeeOS.git"
$env:OPENAI_API_KEY = "sk-your-key-here"
$env:GITHUB_TOKEN = "ghp-your-token-here"

# Iniciar contenedor
docker compose -f docker-compose.openhands.yml up -d

# Ver logs
docker compose -f docker-compose.openhands.yml logs -f

# Acceder a UI web
Start-Process "http://localhost:3001"

# Detener
docker compose -f docker-compose.openhands.yml down
```

**Uso desde GitHub Issues:**
1. Crear issue con template "Auto-Fix"
2. Comentar: `/agent propose`
3. El agente analizará y creará un PR automático

---

## 🔄 Workflows de Desarrollo

### Workflow Típico

```powershell
# 1. Crear branch
git checkout -b feat/nueva-feature

# 2. Desarrollar con Continue o aider
# (hacer cambios en el código)

# 3. Validar localmente
npm run validate

# 4. Commit (hooks automáticos se ejecutan)
git commit -m "feat(pos): add new payment method"

# 5. Push
git push origin feat/nueva-feature

# 6. Crear PR
# CI se ejecuta automáticamente
```

### Validación Local

```powershell
# Formato
npm run format:check

# Lint
npm run lint

# Type check
npm run type-check

# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# TODO EN UNO
npm run validate
```

### Conventional Commits

Formato: `type(scope): description`

**Types:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato (sin cambios de código)
- `refactor`: Refactorización
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplos:**
```bash
feat(pos): add credit card payment support
fix(auth): resolve JWT expiration issue
docs(api): update swagger documentation
test(inventory): add unit tests for stock service
refactor(crm): extract customer service logic
```

---

## 🚀 CI/CD Pipeline

### Workflows Automáticos

#### 1. agent-verify.yml (Main CI)

**Trigger:** Push a cualquier branch, PRs

**Jobs:**
1. ✅ Lint & Format Check
2. ✅ Type Check
3. ✅ Unit Tests (coverage ≥90%)
4. ✅ E2E Tests (Chrome, Firefox, Safari)
5. ✅ Security Scan (Semgrep + Gitleaks)
6. ✅ Build Verification

**Estado:** Badge en README

#### 2. agent-proposal.yml (Auto PRs)

**Trigger:** Comentario `/agent propose` en issue

**Proceso:**
1. Valida permisos del usuario
2. Extrae descripción del issue
3. Ejecuta OpenHands agent
4. Crea PR automático
5. Solicita review

#### 3. evals.yml (Evaluaciones Semanales)

**Trigger:** Cron (Domingos 00:00 UTC)

**Proceso:**
1. Ejecuta subset SWE-bench
2. Calcula success rate
3. Genera reporte
4. Crea issue con resultados

### Quality Gates

Para que un PR sea aprobado:
- ✅ Todos los tests pasando
- ✅ Coverage ≥90%
- ✅ No errores de lint/format
- ✅ No errores de type check
- ✅ No vulnerabilidades high/critical
- ✅ No secretos detectados
- ✅ Build exitoso

---

## 🔒 Seguridad

### Semgrep - SAST

**Ejecución local:**
```powershell
# Instalar
pip install semgrep

# Escanear
semgrep --config .semgrep.yml apps/ packages/
```

**Reglas incluidas:**
- OWASP Top 10
- SQL Injection (Prisma)
- Hard-coded secrets
- JWT sin expiración
- Prototype pollution
- Sensitive data en logs

### Gitleaks - Secret Scanning

**Ejecución local:**
```powershell
# Instalar
choco install gitleaks

# Escanear
gitleaks detect --config .gitleaks.toml --verbose
```

**Detecta:**
- API keys (OpenAI, GitHub, AWS)
- Database URLs
- JWT tokens
- Private keys
- Tokens de pago (Stripe, MercadoPago)

---

## 📊 Métricas y Dashboards

### Coverage

```powershell
# Generar reporte de coverage
npm run test:coverage

# Ver reporte HTML
Start-Process "coverage/lcov-report/index.html"
```

**Target:** ≥90% en todos los paquetes

### Build Times

| Job | Target | Actual |
|-----|--------|--------|
| Lint & Format | <2 min | TBD |
| Type Check | <2 min | TBD |
| Unit Tests | <5 min | TBD |
| E2E Tests | <10 min | TBD |
| Security Scan | <3 min | TBD |
| Build | <5 min | TBD |
| **Total** | **<15 min** | TBD |

---

## 🐛 Troubleshooting

### Continue no se conecta

**Problema:** Continue no puede acceder a OpenAI

**Solución:**
1. Verificar API key en `.continue/config.json`
2. Revisar conexión a internet
3. Ver logs: `View → Output → Continue`

### aider falla al commitear

**Problema:** `git commit` falla con aider

**Solución:**
```powershell
# Verificar configuración de Git
git config user.name
git config user.email

# Configurar si falta
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### Tests fallan en CI pero pasan localmente

**Problema:** Diferencias entre entorno local y CI

**Solución:**
1. Verificar versión de Node: `.nvmrc`
2. Limpiar caché: `npm run clean && npm install`
3. Verificar variables de entorno
4. Revisar servicios (PostgreSQL, Redis)

### OpenHands no inicia

**Problema:** Docker Compose falla al iniciar

**Solución:**
```powershell
# Verificar Docker
docker ps

# Ver logs
docker compose -f docker-compose.openhands.yml logs

# Verificar variables de entorno
echo $env:OPENAI_API_KEY

# Re-pull imagen
docker compose -f docker-compose.openhands.yml pull
```

### Coverage bajo 90%

**Problema:** Coverage gate falla en CI

**Solución:**
```powershell
# Ver qué falta cubrir
npm run test:coverage
# Abrir: coverage/lcov-report/index.html

# Añadir tests para archivos sin cobertura
# Enfocarse en:
# - Servicios de negocio
# - Controllers
# - DTOs con validación
```

### Semgrep reporta falsos positivos

**Problema:** Semgrep marca código seguro como vulnerable

**Solución:**
1. Revisar el hallazgo
2. Si es falso positivo, añadir a `.semgrep.yml`:
   ```yaml
   rules:
     - id: mi-regla
       paths:
         exclude:
           - "path/to/false/positive.ts"
   ```

---

## 📚 Recursos Adicionales

### Documentación
- [Continue Docs](https://docs.continue.dev/)
- [aider Docs](https://aider.chat/docs/)
- [OpenHands Docs](https://docs.all-hands.dev/)
- [Semgrep Rules](https://semgrep.dev/explore)
- [Playwright Docs](https://playwright.dev/)

### Plan Completo
- Ver `docs/plan-auto-dev.md` para detalles técnicos completos

### Soporte
- Crear issue en GitHub
- Revisar logs de CI
- Consultar con el equipo

---

## 🎓 Mejores Prácticas

1. **Commits pequeños:** ≤200 LOC por commit
2. **Conventional commits:** Siempre usar formato estándar
3. **Tests primero:** Escribir tests junto con código
4. **Documentación:** Actualizar docs en el mismo PR
5. **Security:** Nunca commitear secretos
6. **Review:** Pedir review incluso para PRs del agente
7. **Iteración:** Commits iterativos mejor que un commit gigante

---

**¿Listo para empezar?** 🚀

```powershell
# Validar instalación
npm run validate

# Si todo pasa, estás listo!
```
