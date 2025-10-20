# CoffeeOS Auto-Dev Setup Script
# Instala todas las dependencias necesarias para el sistema auto-dev

Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🤖 CoffeeOS Auto-Dev Setup                   ║" -ForegroundColor Cyan
Write-Host "║     Instalación de herramientas AI                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
    
    # Verificar versión mínima (20.0.0)
    $versionNumber = [version]($nodeVersion -replace 'v', '')
    $minVersion = [version]"20.0.0"
    
    if ($versionNumber -lt $minVersion) {
        Write-Host "   ⚠️  Versión antigua. Se requiere Node.js 20+" -ForegroundColor Red
        Write-Host "   Descarga desde: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host "   ❌ Node.js no encontrado" -ForegroundColor Red
    Write-Host "   Instalar desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar npm
Write-Host "📦 Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm instalado: v$npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ npm no encontrado" -ForegroundColor Red
    exit 1
}

# Instalar dependencias del proyecto
Write-Host ""
Write-Host "📦 Instalando dependencias del proyecto..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Error al instalar dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependencias instaladas" -ForegroundColor Green

# Instalar dependencias de auto-dev
Write-Host ""
Write-Host "📦 Instalando dependencias de auto-dev..." -ForegroundColor Yellow
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Error al instalar dependencias de auto-dev" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependencias de auto-dev instaladas" -ForegroundColor Green

# Inicializar Husky
Write-Host ""
Write-Host "🪝 Inicializando Husky..." -ForegroundColor Yellow
npm run prepare

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Error al inicializar Husky" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Husky inicializado" -ForegroundColor Green

# Verificar Python (para aider - opcional)
Write-Host ""
Write-Host "🐍 Verificando Python (opcional para aider)..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✅ Python instalado: $pythonVersion" -ForegroundColor Green
    
    # Preguntar si quiere instalar aider
    $installAider = Read-Host "   ¿Instalar aider-chat? (s/n)"
    if ($installAider -eq 's' -or $installAider -eq 'S') {
        Write-Host "   📦 Instalando aider-chat..." -ForegroundColor Yellow
        pip install aider-chat
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ aider-chat instalado" -ForegroundColor Green
        }
        else {
            Write-Host "   ⚠️  Error al instalar aider-chat" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "   ⚠️  Python no encontrado (opcional)" -ForegroundColor Yellow
    Write-Host "   Para usar aider, instalar desde: https://www.python.org/" -ForegroundColor Yellow
}

# Verificar Docker (para OpenHands - opcional)
Write-Host ""
Write-Host "🐳 Verificando Docker (opcional para OpenHands)..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✅ Docker instalado: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Docker no encontrado (opcional)" -ForegroundColor Yellow
    Write-Host "   Para usar OpenHands, instalar Docker Desktop" -ForegroundColor Yellow
}

# Verificar archivo .env.local
Write-Host ""
Write-Host "🔐 Verificando configuración..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✅ Archivo .env.local encontrado" -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  Archivo .env.local no encontrado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Crear archivo .env.local con:" -ForegroundColor Cyan
    Write-Host "   OPENAI_API_KEY=sk-your-key-here" -ForegroundColor White
    Write-Host "   ANTHROPIC_API_KEY=sk-ant-your-key-here  # opcional" -ForegroundColor White
    Write-Host "   GITHUB_TOKEN=ghp_your-token-here  # opcional" -ForegroundColor White
    Write-Host ""
}

# Instrucciones para Continue
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Instalar Continue extension en VS Code:" -ForegroundColor White
Write-Host "   - Abrir VS Code" -ForegroundColor Gray
Write-Host "   - Ir a Extensions (Ctrl+Shift+X)" -ForegroundColor Gray
Write-Host "   - Buscar 'Continue'" -ForegroundColor Gray
Write-Host "   - Instalar y reiniciar" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Configurar API keys en .env.local:" -ForegroundColor White
Write-Host "   - Crear archivo .env.local" -ForegroundColor Gray
Write-Host "   - Añadir OPENAI_API_KEY" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Validar instalación:" -ForegroundColor White
Write-Host "   npm run validate" -ForegroundColor Cyan
Write-Host ""

Write-Host "4️⃣  Leer documentación:" -ForegroundColor White
Write-Host "   - docs/auto-dev-quickstart.md" -ForegroundColor Gray
Write-Host "   - RESUMEN-AUTO-DEV.md" -ForegroundColor Gray
Write-Host ""

# Resumen
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✅ Setup Completado                           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Sistema auto-dev instalado correctamente! 🎉" -ForegroundColor Green
Write-Host ""
Write-Host "Para comenzar:" -ForegroundColor White
Write-Host "  1. Configurar .env.local con tu OPENAI_API_KEY" -ForegroundColor Cyan
Write-Host "  2. Instalar Continue extension en VS Code" -ForegroundColor Cyan
Write-Host "  3. Ejecutar: npm run validate" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentación completa en:" -ForegroundColor White
Write-Host "  📄 docs/auto-dev-quickstart.md" -ForegroundColor Cyan
Write-Host "  📄 RESUMEN-AUTO-DEV.md" -ForegroundColor Cyan
Write-Host ""
