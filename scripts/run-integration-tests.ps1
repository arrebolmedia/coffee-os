# CoffeeOS - Integration Tests Runner
# Ejecuta tests de integración que verifican el sistema relacional completo

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      COFFEEOS - INTEGRATION TESTS RUNNER                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = 'Continue'

# Verificar que los servicios estén corriendo
Write-Host "📋 Pre-check: Verificando servicios..." -ForegroundColor Yellow

$backendRunning = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
$dbRunning = Get-NetTCPConnection -LocalPort 5434 -State Listen -ErrorAction SilentlyContinue

if (-not $backendRunning) {
    Write-Host "❌ Backend no está corriendo en puerto 4000" -ForegroundColor Red
    Write-Host "   Inicia el backend: npm run dev --workspace=apps/api`n" -ForegroundColor Gray
    exit 1
}

if (-not $dbRunning) {
    Write-Host "❌ PostgreSQL no está corriendo en puerto 5434" -ForegroundColor Red
    Write-Host "   Inicia PostgreSQL`n" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Servicios verificados`n" -ForegroundColor Green

# Opciones de test
$testSuite = $args[0]

if ($testSuite) {
    Write-Host "🎯 Ejecutando suite: $testSuite`n" -ForegroundColor Cyan
} else {
    Write-Host "🎯 Ejecutando TODOS los tests de integración`n" -ForegroundColor Cyan
}

# Configurar variables de entorno de test
$env:NODE_ENV = "test"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/coffeeos_test"

Write-Host "⚙️  Preparando base de datos de test..." -ForegroundColor Yellow

# Crear base de datos de test si no existe
cd C:\Projects\CoffeeOS\packages\database

try {
    # Ejecutar migraciones en DB de test
    npx prisma migrate deploy --preview-feature 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de datos de test lista`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Advertencia: Migraciones no aplicadas`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Advertencia: Error preparando DB de test`n" -ForegroundColor Yellow
}

# Ejecutar tests
cd C:\Projects\CoffeeOS\apps\api

Write-Host "🧪 Ejecutando tests de integración...`n" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════`n" -ForegroundColor DarkGray

if ($testSuite) {
    # Ejecutar suite específica
    switch ($testSuite) {
        "sale" {
            Write-Host "📊 Suite: Complete Sale Flow`n" -ForegroundColor Magenta
            npm test -- test/integration/sale-integration.e2e-spec.ts --verbose
        }
        "inventory" {
            Write-Host "📦 Suite: Inventory Management`n" -ForegroundColor Magenta
            npm test -- test/integration/inventory-integration.e2e-spec.ts --verbose
        }
        "finance" {
            Write-Host "💰 Suite: Financial Transactions`n" -ForegroundColor Magenta
            npm test -- test/integration/finance-integration.e2e-spec.ts --verbose
        }
        "auth" {
            Write-Host "🔐 Suite: Authentication & Authorization`n" -ForegroundColor Magenta
            npm test -- test/integration/auth-integration.e2e-spec.ts --verbose
        }
        default {
            Write-Host "❌ Suite desconocida: $testSuite" -ForegroundColor Red
            Write-Host "`nSuites disponibles:" -ForegroundColor Gray
            Write-Host "  - sale" -ForegroundColor White
            Write-Host "  - inventory" -ForegroundColor White
            Write-Host "  - finance" -ForegroundColor White
            Write-Host "  - auth`n" -ForegroundColor White
            exit 1
        }
    }
} else {
    # Ejecutar todos los tests de integración
    npm test -- test/integration/*.e2e-spec.ts --verbose
}

$exitCode = $LASTEXITCODE

Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

if ($exitCode -eq 0) {
    Write-Host "`n✅ TODOS LOS TESTS PASARON" -ForegroundColor Green
    Write-Host "   El sistema relacional está funcionando correctamente`n" -ForegroundColor Gray
} else {
    Write-Host "`n❌ ALGUNOS TESTS FALLARON" -ForegroundColor Red
    Write-Host "   Revisa los errores arriba para más detalles`n" -ForegroundColor Gray
}

# Limpiar base de datos de test
Write-Host "🧹 Limpiando base de datos de test..." -ForegroundColor Yellow

cd C:\Projects\CoffeeOS\packages\database

try {
    # Opción 1: Reset completo (si existe el comando)
    npx prisma migrate reset --force --skip-seed 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de datos de test limpiada`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  DB de test no limpiada (no afecta resultados)`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  DB de test no limpiada (no afecta resultados)`n" -ForegroundColor Yellow
}

exit $exitCode
