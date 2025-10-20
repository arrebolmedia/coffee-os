# 🤖 Plan de Implementación: Auto-Dev con Humano-en-el-Loop

**Fecha:** 20 de Octubre, 2025  
**Autor:** GitHub Copilot + Usuario  
**Objetivo:** Preparar CoffeeOS para programación automática con Continue/aider (IDE), bot de PR (OpenHands), CI con gates y plantillas automatizadas.

---

## 📋 Resumen Ejecutivo

### Alcance

Transformar CoffeeOS en un repositorio **auto-dev ready** que permita:

1. **Desarrollo asistido** con Continue + aider en IDE
2. **Pull Requests automáticos** mediante OpenHands (SWE-agent)
3. **CI/CD robusto** con gates de calidad (coverage ≥90%)
4. **Seguridad automatizada** con Semgrep + Gitleaks
5. **Evaluaciones continuas** con SWE-bench

### Principios

- ✅ **Humano-en-el-loop**: Las decisiones críticas requieren aprobación humana
- ✅ **Commits pequeños**: ≤200 LOC por commit
- ✅ **Conventional Commits**: Mensajes estandarizados
- ✅ **No tocar código de negocio**: Solo infraestructura y configuración
- ✅ **Justificar dependencias**: No añadir peso innecesario

---

## 🎯 Objetivos Específicos

### 1. IDE Copilotos

- **Continue**: Copiloto con modelos OpenAI/Ollama, context-aware
- **aider**: Auto-commits con lectura inteligente de rutas

### 2. Seguridad y Calidad

- **Semgrep**: Detectar vulnerabilidades OWASP + secretos
- **Gitleaks**: Prevenir commits con credenciales
- **Coverage gate**: ≥90% en todos los paquetes

### 3. CI/CD Automatizado

- **agent-verify.yml**: Lint, unit tests, e2e, security scans, coverage
- **agent-proposal.yml**: Hook para `/agent propose` en issues/PR
- **evals.yml**: Evaluaciones semanales con SWE-bench

### 4. Plantillas y Workflows

- **Issue templates**: auto-fix, feature-request, bug-report
- **PR template**: Checklist automatizado con conventional commits
- **OpenHands config**: Docker Compose para agente autónomo

---

## 🏗️ Arquitectura de Auto-Dev

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IDE (VS Code)                                              │
│    ├── Continue Extension ──► OpenAI/Ollama                │
│    ├── aider CLI ──────────► Auto-commits                  │
│    └── Copilot Chat ────────► Pair programming             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    Local Pre-commit                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ├── Husky + lint-staged                                  │
│    ├── ESLint + Prettier                                    │
│    ├── Type checking (tsc)                                  │
│    └── Unit tests rápidos                                   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    GitHub Actions CI                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  agent-verify.yml (on: push, pull_request)                  │
│    ├── Lint + Format check                                  │
│    ├── Type check (turbo run type-check)                    │
│    ├── Unit tests (coverage ≥90%)                           │
│    ├── E2E tests (Playwright)                               │
│    ├── Semgrep (OWASP rules)                                │
│    ├── Gitleaks (secret scanning)                           │
│    └── Build verification                                   │
│                                                              │
│  agent-proposal.yml (on: issue_comment)                     │
│    ├── Trigger: "/agent propose"                            │
│    ├── OpenHands genera solución                            │
│    ├── Crea PR automático                                   │
│    └── Solicita review humano                               │
│                                                              │
│  evals.yml (schedule: weekly)                               │
│    ├── Ejecuta subset SWE-bench                             │
│    ├── Mide success rate                                    │
│    └── Reporta métricas                                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    OpenHands (SWE-Agent)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Docker Container                                            │
│    ├── Workspace isolation                                   │
│    ├── Tool whitelist (git, npm, curl)                      │
│    ├── MAX_DIFF_LOC: 300                                    │
│    └── Auto-test before commit                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Estructura de Archivos (Nueva)

```
CoffeeOS/
├── .continue/
│   └── config.json                    # Config Continue con modelos
├── .aider.conf.yml                    # Config aider auto-commits
├── .semgrep.yml                       # Reglas OWASP + no-secrets
├── .gitleaks.toml                     # Detección de secretos
├── .husky/
│   ├── pre-commit                     # Lint-staged + type-check
│   └── commit-msg                     # Conventional commits
├── .github/
│   ├── workflows/
│   │   ├── agent-verify.yml          # CI principal (gates)
│   │   ├── agent-proposal.yml        # PR automáticos
│   │   └── evals.yml                 # Evaluaciones semanales
│   ├── ISSUE_TEMPLATE/
│   │   ├── auto-fix.md               # Template para auto-fix
│   │   ├── feature-request.md        # Template para features
│   │   └── bug-report.md             # Template para bugs
│   └── pull_request_template.md      # PR checklist
├── docker-compose.openhands.yml      # OpenHands setup
├── docs/
│   ├── plan-auto-dev.md              # Este archivo
│   └── auto-dev-quickstart.md        # Guía rápida
└── scripts/
    ├── setup-auto-dev.ps1            # Script de instalación
    └── validate-ci.ps1               # Script de validación local
```

---

## 🔧 Decisiones Técnicas

### Herramientas Seleccionadas

#### IDE Copilotos

| Herramienta        | Uso                    | Justificación                                            |
| ------------------ | ---------------------- | -------------------------------------------------------- |
| **Continue**       | Copiloto en VS Code    | Open-source, multi-modelo (OpenAI/Ollama), context-aware |
| **aider**          | Auto-commits desde CLI | Edición directa de archivos, git-aware, modelo agnóstico |
| **GitHub Copilot** | Pair programming       | Ya integrado, excelente para boilerplate                 |

#### Seguridad

| Herramienta   | Uso                      | Justificación                                         |
| ------------- | ------------------------ | ----------------------------------------------------- |
| **Semgrep**   | SAST (static analysis)   | Reglas OWASP gratuitas, rápido, bajo falsos positivos |
| **Gitleaks**  | Secret scanning          | Ligero, detecta 1000+ tipos de secretos               |
| **npm audit** | Dependencias vulnerables | Built-in, sin costo adicional                         |

#### CI/CD

| Herramienta        | Uso                    | Justificación                                     |
| ------------------ | ---------------------- | ------------------------------------------------- |
| **GitHub Actions** | CI/CD principal        | Nativo, 2000 min/mes gratis, integración perfecta |
| **Turbo**          | Monorepo orchestration | Ya instalado, cache incremental                   |
| **Playwright**     | E2E testing            | Cross-browser, rápido, headless                   |
| **c8**             | Coverage reporting     | Compatible con TypeScript, exacto                 |

#### Agente Autónomo

| Herramienta   | Uso                | Justificación                             |
| ------------- | ------------------ | ----------------------------------------- |
| **OpenHands** | SWE-agent para PRs | Open-source, Docker-based, tool whitelist |

---

## 📝 Plan de Implementación (12 Pasos)

### Fase 1: Configuración Base (Pasos 1-2)

#### Paso 1: Crear plan-auto-dev.md ✅

- **Archivo:** `docs/plan-auto-dev.md`
- **LOC:** ~400
- **Commit:** `docs: add auto-dev implementation plan`
- **Descripción:** Este archivo (plan completo)

#### Paso 2: Configurar estructura de proyecto

- **Archivos:**
  - `package.json` (root) - Añadir scripts
  - `.nvmrc` - Node 20
  - `pnpm-workspace.yaml` - Verificar workspaces
- **LOC:** ~50
- **Commit:** `chore: configure project structure for auto-dev`
- **Scripts a añadir:**
  ```json
  {
    "scripts": {
      "lint": "turbo run lint",
      "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
      "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
      "test": "turbo run test",
      "test:e2e": "turbo run test:e2e",
      "test:coverage": "turbo run test:coverage",
      "type-check": "turbo run type-check",
      "precommit": "lint-staged",
      "prepare": "husky install",
      "validate": "npm run format:check && npm run lint && npm run type-check && npm run test"
    }
  }
  ```

### Fase 2: IDE Copilotos (Pasos 3-4)

#### Paso 3: Configurar Continue

- **Archivo:** `.continue/config.json`
- **LOC:** ~150
- **Commit:** `feat(ide): configure Continue extension for pair programming`
- **Configuración:**
  - Modelos: GPT-4o (OpenAI), deepseek-coder (Ollama)
  - Context providers: codebase, terminal, problems, git
  - System message: Pair programmer especializado en NestJS/Next.js
  - Allowlist: `apps/`, `packages/`, `docs/`

#### Paso 4: Configurar aider

- **Archivo:** `.aider.conf.yml`
- **LOC:** ~40
- **Commit:** `feat(ide): configure aider for auto-commits`
- **Configuración:**
  - Model: gpt-4o
  - Auto-commits: true
  - Edit format: diff
  - Read paths: `apps/`, `packages/`
  - Exclude: `node_modules/`, `.next/`, `dist/`

### Fase 3: Seguridad (Paso 5)

#### Paso 5: Configurar Semgrep + Gitleaks

- **Archivos:**
  - `.semgrep.yml`
  - `.gitleaks.toml`
- **LOC:** ~100
- **Commit:** `security: add Semgrep and Gitleaks scanning`
- **Reglas Semgrep:**
  - `p/owasp-top-ten` (OWASP Top 10)
  - `p/typescript` (TypeScript best practices)
  - `p/secrets` (Hard-coded secrets)
  - Custom rules para Prisma (SQL injection)
- **Gitleaks:**
  - Detectar AWS keys, GitHub tokens, database URLs
  - Allowlist: `*.test.ts`, `*.spec.ts`

### Fase 4: CI/CD (Pasos 6-8)

#### Paso 6: Workflow agent-verify.yml

- **Archivo:** `.github/workflows/agent-verify.yml`
- **LOC:** ~200
- **Commit:** `ci: add agent-verify workflow with quality gates`
- **Jobs:**
  1. **lint-and-format**
     - Prettier check
     - ESLint
  2. **type-check**
     - `turbo run type-check`
  3. **unit-tests**
     - Jest con coverage
     - Gate: coverage ≥90%
     - Upload a Codecov
  4. **e2e-tests**
     - Playwright (Chrome, Firefox, Safari)
     - Matrix: [ubuntu-latest, windows-latest]
  5. **security-scan**
     - Semgrep (fail on high severity)
     - Gitleaks (fail on any secret)
     - npm audit (fail on critical)
  6. **build-verify**
     - `turbo run build`
     - Artifact upload de builds

#### Paso 7: Workflow agent-proposal.yml

- **Archivo:** `.github/workflows/agent-proposal.yml`
- **LOC:** ~150
- **Commit:** `ci: add agent-proposal workflow for automated PRs`
- **Trigger:** Comment `/agent propose` en issue
- **Proceso:**
  1. Validar que comentario viene de maintainer
  2. Extraer descripción del issue
  3. Llamar API de OpenHands
  4. OpenHands genera solución en branch
  5. Crear PR automático con label `bot-generated`
  6. Request review de maintainer

#### Paso 8: Workflow evals.yml

- **Archivo:** `.github/workflows/evals.yml`
- **LOC:** ~80
- **Commit:** `ci: add weekly evals workflow for SWE-bench`
- **Schedule:** Cron semanal (domingo 00:00 UTC)
- **Jobs:**
  1. Checkout subset SWE-bench
  2. Ejecutar con OpenHands
  3. Calcular success rate
  4. Crear issue con reporte
  5. Upload métricas a GitHub Pages

### Fase 5: Plantillas (Paso 9)

#### Paso 9: Issue/PR Templates

- **Archivos:**
  - `.github/ISSUE_TEMPLATE/auto-fix.md`
  - `.github/ISSUE_TEMPLATE/feature-request.md`
  - `.github/ISSUE_TEMPLATE/bug-report.md`
  - `.github/pull_request_template.md`
- **LOC:** ~150
- **Commit:** `chore: add issue and PR templates for auto-dev`
- **auto-fix.md:**
  - Checkbox para `/agent propose`
  - Descripción del problema
  - Contexto y archivos relacionados
  - Criterios de aceptación
- **PR template:**
  - Conventional commit type
  - Checklist: tests, docs, security scan
  - Label auto-aplicados según archivos cambiados

### Fase 6: OpenHands (Paso 10)

#### Paso 10: Docker Compose para OpenHands

- **Archivo:** `docker-compose.openhands.yml`
- **LOC:** ~80
- **Commit:** `feat(agent): add OpenHands Docker Compose setup`
- **Services:**
  - **openhands**: Main agent
    - Image: `ghcr.io/all-hands-ai/openhands:latest`
    - Environment:
      - `GIT_CLONE_URL`: URL del repo
      - `OPENAI_API_KEY`: API key (secret)
      - `TOOL_WHITELIST`: git,npm,curl,cat,echo
      - `MAX_DIFF_LOC`: 300
      - `AUTO_TEST`: true
    - Volumes: workspace aislado
    - Ports: 3001 (UI web)

### Fase 7: Tests y Validación (Paso 11)

#### Paso 11: Tests mínimos de validación

- **Archivos:**
  - `apps/api/src/health/health.controller.spec.ts`
  - `apps/pos-web/app/page.test.tsx`
  - `apps/api/test/e2e/health.e2e-spec.ts`
- **LOC:** ~120
- **Commit:** `test: add minimal tests to validate CI pipeline`
- **Tests:**
  - **Unit:** Health check endpoint (API)
  - **Unit:** Home page rendering (POS Web)
  - **E2E:** GET /health returns 200
  - **Todos PASS** para validar pipeline

### Fase 8: Documentación (Paso 12)

#### Paso 12: Actualizar README y crear Quickstart

- **Archivos:**
  - `README.md` (root)
  - `docs/auto-dev-quickstart.md`
- **LOC:** ~200
- **Commit:** `docs: update README with auto-dev quickstart`
- **Secciones:**
  - Badge de CI status
  - Badge de coverage
  - Sección "Auto-Dev Setup"
  - Comandos para Continue, aider, OpenHands
  - Troubleshooting común

---

## 🚀 Instalación y Ejecución

### Pre-requisitos

```bash
# Node.js 20
node --version  # v20.x.x

# pnpm (vía corepack)
corepack enable

# Python 3.10+ (para aider)
python --version  # 3.10+

# Docker (para OpenHands)
docker --version
```

### Setup Completo

```bash
# 1. Instalar dependencias Node
cd C:\Projects\CoffeeOS
pnpm install

# 2. Instalar Playwright browsers
pnpm dlx playwright install --with-deps

# 3. Configurar Husky (pre-commit hooks)
pnpm run prepare

# 4. Instalar aider (opcional)
pip install aider-chat

# 5. Validar instalación local
pnpm run validate
```

### Uso de Continue (IDE)

1. Instalar extensión: [Continue](https://marketplace.visualstudio.com/items?itemName=Continue.continue)
2. Abrir VS Code en `C:\Projects\CoffeeOS`
3. Continue detectará `.continue/config.json` automáticamente
4. Usar `Ctrl+L` para chat, `Ctrl+I` para inline edit

### Uso de aider (CLI)

```bash
# Auto-commits en un archivo específico
aider apps/api/src/modules/pos/pos.service.ts

# Auto-commits en múltiples archivos
aider apps/api/src/modules/pos/*.ts

# Modo read-only (solo consulta)
aider --read apps/api/src/modules/pos/*.ts
```

### Uso de OpenHands (Agente Autónomo)

```powershell
# 1. Configurar variables de entorno
$env:GIT_CLONE_URL = "https://github.com/tu-org/CoffeeOS.git"
$env:OPENAI_API_KEY = "sk-***"

# 2. Levantar contenedor
docker compose -f docker-compose.openhands.yml up -d

# 3. Acceder a UI web
Start-Process "http://localhost:3001"

# 4. Detener
docker compose -f docker-compose.openhands.yml down
```

---

## 🔐 Secretos Requeridos

### GitHub Actions Secrets

Añadir en: `Settings → Secrets and variables → Actions`

| Secret              | Uso                      | Requerido       |
| ------------------- | ------------------------ | --------------- |
| `OPENAI_API_KEY`    | OpenHands agent          | ✅ Sí           |
| `SEMGREP_APP_TOKEN` | Semgrep Cloud (opcional) | ❌ No           |
| `CODECOV_TOKEN`     | Coverage reporting       | ❌ No (público) |

### Variables de Entorno Locales

```bash
# .env.local (NO COMMITEAR)
OPENAI_API_KEY=sk-***
ANTHROPIC_API_KEY=sk-ant-***  # Para Claude (opcional)
OLLAMA_BASE_URL=http://localhost:11434  # Para Ollama local
```

---

## 📊 Métricas de Éxito

### KPIs para Auto-Dev

| Métrica                      | Target          | Actual | Estado       |
| ---------------------------- | --------------- | ------ | ------------ |
| **Coverage**                 | ≥90%            | TBD    | 🟡 Pendiente |
| **CI Time**                  | <10 min         | TBD    | 🟡 Pendiente |
| **Security Issues**          | 0 high/critical | TBD    | 🟡 Pendiente |
| **Auto-PR Success Rate**     | ≥70%            | TBD    | 🟡 Pendiente |
| **Commits con Conventional** | 100%            | TBD    | 🟡 Pendiente |

### SWE-bench Evals (Semanal)

- **Subset:** 100 problemas de TypeScript/Node.js
- **Success rate target:** ≥60%
- **Reporte:** Issue semanal con métricas

---

## ⚠️ Limitaciones y TODOs

### Limitaciones Conocidas

1. **OpenHands**: Requiere API key de OpenAI ($$$)
2. **E2E Tests**: Playwright puede ser lento en Windows
3. **Coverage gate**: Algunos archivos legacy pueden estar bajo 90%
4. **Semgrep**: Reglas custom para Prisma requieren ajuste manual

### TODOs Críticos

- [ ] **TODO-1**: Obtener OPENAI_API_KEY y añadir a GitHub Secrets
- [ ] **TODO-2**: Configurar branch protection en `main` (require CI pass)
- [ ] **TODO-3**: Activar Codecov para visualización de coverage
- [ ] **TODO-4**: Configurar Semgrep Cloud (opcional, mejora detección)
- [ ] **TODO-5**: Crear subset SWE-bench específico para CoffeeOS

### Riesgos

| Riesgo                       | Impacto | Mitigación                                  |
| ---------------------------- | ------- | ------------------------------------------- |
| OpenHands genera código roto | Alto    | Gate de tests obligatorio antes de merge    |
| API rate limits (OpenAI)     | Medio   | Implementar fallback a Ollama local         |
| CI tarda >20 min             | Medio   | Paralelizar jobs, usar Turbo cache          |
| Falsos positivos Semgrep     | Bajo    | Ajustar reglas custom, allowlist específico |

---

## 🎯 Entregables

### PR Principal: `infra: bootstrap auto-dev`

**Branch:** `feat/auto-dev-setup`  
**Commits:** 12 commits siguiendo Conventional Commits  
**Archivos nuevos:** ~20 archivos  
**LOC total:** ~1,400 líneas

### Checklist de Entregables

- [ ] Todos los archivos de configuración creados
- [ ] Scripts de instalación funcionando
- [ ] Workflows de GitHub Actions verificados
- [ ] Tests mínimos pasando (excepto los que requieren secretos)
- [ ] Documentación completa en README y Quickstart
- [ ] PR abierto con descripción detallada
- [ ] Instrucciones claras para secretos faltantes

---

## 📚 Referencias

### Documentación

- [Continue Docs](https://docs.continue.dev/)
- [aider Docs](https://aider.chat/docs/)
- [OpenHands Docs](https://docs.all-hands.dev/)
- [Semgrep Rules](https://semgrep.dev/explore)
- [Gitleaks Config](https://github.com/gitleaks/gitleaks#configuration)
- [Playwright Docs](https://playwright.dev/)

### SWE-bench

- [SWE-bench GitHub](https://github.com/princeton-nlp/SWE-bench)
- [Leaderboard](https://www.swebench.com/)

---

## 🤝 Contribución

### Workflow para Desarrolladores

1. **Local development:**

   ```bash
   # Crear branch
   git checkout -b feat/nueva-feature

   # Usar Continue/aider para desarrollo
   aider apps/api/src/modules/pos/pos.service.ts

   # Pre-commit hooks se ejecutan automáticamente
   git commit -m "feat(pos): add new feature"

   # Push
   git push origin feat/nueva-feature
   ```

2. **CI se ejecuta automáticamente:**
   - Lint, type-check, tests, security scan
   - Si pasa, aparece ✅ en PR

3. **Request review:**
   - Maintainer revisa código
   - Si aprueba, merge a `main`

### Workflow para Auto-Fix con OpenHands

1. **Crear issue:**
   - Usar template `auto-fix.md`
   - Marcar checkbox "Use agent to propose fix"

2. **Comentar:**

   ```
   /agent propose
   ```

3. **OpenHands genera PR:**
   - Review automático de code
   - Si tests pasan, request review humano

4. **Review y merge:**
   - Maintainer valida solución
   - Merge si todo correcto

---

**Fin del Plan de Implementación**

**Siguiente paso:** Ejecutar Fase 1 (Pasos 1-2) para establecer base.
