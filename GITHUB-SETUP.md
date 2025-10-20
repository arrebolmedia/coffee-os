# 🔐 Configuración de GitHub para CoffeeOS Auto-Dev

## 📋 Pasos para Configurar GitHub

### 1️⃣ Crear Repositorio en GitHub

1. Ir a https://github.com/new
2. Nombre del repositorio: `CoffeeOS`
3. Descripción: `Multi-tenant coffee shop management platform with AI-powered development`
4. Visibilidad: `Private` (recomendado) o `Public`
5. ❌ NO inicializar con README, .gitignore o licencia (ya los tenemos)
6. Click en "Create repository"

### 2️⃣ Conectar Repositorio Local con GitHub

```powershell
# Agregar remote origin (reemplazar YOUR-USERNAME con tu usuario)
git remote add origin https://github.com/YOUR-USERNAME/CoffeeOS.git

# Verificar remote
git remote -v

# Push del branch feat/auto-dev-bootstrap
git push -u origin feat/auto-dev-bootstrap

# Push del branch main (cuando esté listo)
# git checkout main
# git push -u origin main
```

### 3️⃣ Configurar GitHub Secrets

Los secrets son necesarios para que los workflows de CI/CD funcionen correctamente.

#### Ir a configuración de Secrets:
1. En GitHub, ir al repositorio CoffeeOS
2. Click en **Settings** (arriba a la derecha)
3. En el menú izquierdo, ir a **Secrets and variables** → **Actions**
4. Click en **New repository secret**

#### Secrets requeridos:

| Secret Name | Valor | Requerido | Uso |
|-------------|-------|-----------|-----|
| `OPENAI_API_KEY` | Tu API key de OpenAI | ✅ Sí | CI/CD workflows, Continue, aider, OpenHands |
| `GITHUB_TOKEN` | Auto-generado | ❌ No* | Ya existe automáticamente |
| `CODECOV_TOKEN` | Token de Codecov | ❌ No | Coverage reporting (opcional) |
| `SEMGREP_APP_TOKEN` | Token de Semgrep | ❌ No | Semgrep Cloud (opcional) |

*GITHUB_TOKEN: GitHub lo proporciona automáticamente para workflows.

#### Agregar OPENAI_API_KEY:

1. Click en "New repository secret"
2. Name: `OPENAI_API_KEY`
3. Secret: `<tu-api-key-de-openai>` (guardada en archivo local .env.local)
4. Click "Add secret"

**Nota:** El API key está en tu archivo local `.env.local` por seguridad.

### 4️⃣ Configurar Branch Protection Rules

Proteger el branch `main` para que requiera CI antes de merge:

1. Settings → Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Activar:
   - ☑️ Require a pull request before merging
   - ☑️ Require status checks to pass before merging
   - ☑️ Require branches to be up to date before merging
5. En "Status checks", buscar y seleccionar:
   - `lint-and-format`
   - `type-check`
   - `unit-tests`
   - `e2e-tests`
   - `security-scan`
   - `build-verify`
6. Click "Create"

### 5️⃣ Crear Pull Request

#### Opción A: Desde la interfaz de GitHub

1. Ir a tu repositorio en GitHub
2. Verás un banner amarillo: "feat/auto-dev-bootstrap had recent pushes"
3. Click en "Compare & pull request"
4. Título: `feat(infra): bootstrap auto-dev system`
5. Descripción: Copiar desde abajo
6. Click "Create pull request"

#### Opción B: Usando GitHub CLI (si está instalado)

```powershell
# Instalar GitHub CLI (si no está instalado)
# winget install --id GitHub.cli

# Login
gh auth login

# Crear PR
gh pr create --title "feat(infra): bootstrap auto-dev system" --body-file PR-DESCRIPTION.md
```

#### Descripción sugerida para el PR:

```markdown
## 🎉 Bootstrap Auto-Dev System

Este PR implementa el sistema completo de desarrollo asistido por AI para CoffeeOS.

### 📦 Lo que incluye:

#### 🛠️ IDE Copilotos
- ✅ Continue extension configurada (GPT-4o + Ollama)
- ✅ aider CLI para auto-commits
- ✅ Comandos custom: `/nestjs`, `/nextjs`, `/prisma`, `/test`

#### 🔒 Seguridad Automatizada
- ✅ Semgrep con 8 reglas custom + OWASP Top 10
- ✅ Gitleaks para detectar 11 tipos de secretos
- ✅ npm audit integration

#### 🚀 CI/CD Pipeline
- ✅ `agent-verify.yml` - 6 jobs paralelos con quality gates
- ✅ `agent-proposal.yml` - Auto-PRs con `/agent propose`
- ✅ `evals.yml` - Evaluaciones semanales SWE-bench

#### 📝 Templates & Workflows
- ✅ Issue templates: Auto-Fix, Feature Request, Bug Report
- ✅ PR template con checklist exhaustivo

#### 🪝 Pre-commit Hooks
- ✅ Husky configurado
- ✅ lint-staged para validación automática
- ✅ commitlint para Conventional Commits

#### 🧪 Testing Foundation
- ✅ Health check endpoints con tests
- ✅ Unit tests (100% coverage en módulo health)
- ✅ E2E tests con Playwright

### 📊 Métricas:
- **Archivos creados:** 27 (configuración auto-dev)
- **Total archivos:** 121
- **Líneas de código:** ~2,100 (auto-dev)
- **Total líneas:** 40,286
- **Documentación:** 850+ líneas

### 🎯 Cómo usar después del merge:

1. Instalar Continue extension en VS Code
2. Usar `Ctrl+L` para chat con AI
3. Usar `/test`, `/nestjs`, `/nextjs` para ayuda específica
4. Los pre-commit hooks validarán automáticamente

### 📚 Documentación:
- `RESUMEN-AUTO-DEV.md` - Resumen ejecutivo
- `docs/auto-dev-quickstart.md` - Guía de uso
- `INSTALACION-EXITOSA.txt` - Instrucciones completas

### ✅ Checklist:
- [x] Configuración completa de Continue
- [x] aider CLI configurado
- [x] Semgrep + Gitleaks configurados
- [x] Workflows de CI/CD creados
- [x] Templates de Issues/PRs
- [x] Husky hooks configurados
- [x] Tests foundation implementada
- [x] Documentación completa

### ⚠️ Breaking Changes:
- Requiere Node.js 20+
- Requiere configurar `OPENAI_API_KEY` en GitHub Secrets

---

**Listo para review y merge!** 🚀
```

### 6️⃣ Después del Merge

Una vez que el PR sea aprobado y mergeado:

```powershell
# Cambiar a main
git checkout main

# Pull los cambios
git pull origin main

# Eliminar branch local (opcional)
git branch -d feat/auto-dev-bootstrap
```

### 7️⃣ Verificar CI/CD

Después del merge, verificar que los workflows funcionen:

1. Ir a **Actions** en GitHub
2. Verificar que aparezcan los workflows:
   - ✅ Agent Verify
   - ✅ Agent Proposal
   - ✅ Evals

Si hay errores, revisar:
- ✅ Secrets configurados correctamente
- ✅ OPENAI_API_KEY es válido
- ✅ Workflows tienen permisos correctos

## 🆘 Troubleshooting

### Error: "OPENAI_API_KEY not found"
**Solución:** Verificar que el secret esté configurado en Settings → Secrets

### Error: "Permission denied"
**Solución:** Verificar permisos en Settings → Actions → General → Workflow permissions

### Error: "Branch protection requires status checks"
**Solución:** Esperar a que al menos un workflow se ejecute antes de configurar branch protection

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en Actions
2. Consultar `docs/auto-dev-quickstart.md`
3. Buscar en la sección Troubleshooting de la documentación

---

**¡Repositorio listo para desarrollo colaborativo con AI!** 🎊
