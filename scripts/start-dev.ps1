#!/usr/bin/env pwsh
# 🚀 CoffeeOS - Quick Start Script
# Este script configura y arranca el entorno de desarrollo completo

Write-Host "☕ CoffeeOS - Starting Development Environment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que Docker está corriendo
Write-Host "🐳 Verificando Docker..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está instalado o no está corriendo." -ForegroundColor Red
    exit 1
}

# 2. Crear .env.local si no existe
Write-Host ""
Write-Host "📝 Configurando variables de entorno..." -ForegroundColor Yellow
if (-Not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host "✅ Archivo .env.local creado desde .env.example" -ForegroundColor Green
    Write-Host "⚠️  Por favor configura tus variables de entorno en .env.local" -ForegroundColor Yellow
} else {
    Write-Host "✅ Archivo .env.local ya existe" -ForegroundColor Green
}

# 3. Iniciar servicios de infraestructura
Write-Host ""
Write-Host "🏗️  Iniciando servicios de infraestructura..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Servicios iniciados correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error iniciando servicios" -ForegroundColor Red
    exit 1
}

# 4. Esperar a que PostgreSQL esté listo
Write-Host ""
Write-Host "⏳ Esperando a que PostgreSQL esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxAttempts = 30
$attempt = 0
$pgReady = $false

while ($attempt -lt $maxAttempts -and -not $pgReady) {
    try {
        $result = docker exec coffeeos-postgres pg_isready -U coffeeos 2>&1
        if ($result -match "accepting connections") {
            $pgReady = $true
            Write-Host "✅ PostgreSQL está listo" -ForegroundColor Green
        } else {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
            $attempt++
        }
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
        $attempt++
    }
}

if (-not $pgReady) {
    Write-Host ""
    Write-Host "❌ PostgreSQL no respondió a tiempo" -ForegroundColor Red
    exit 1
}

# 5. Generar Prisma Client
Write-Host ""
Write-Host "🔨 Generando Prisma Client..." -ForegroundColor Yellow
Set-Location packages/database
npx prisma generate
Set-Location ../..

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generado" -ForegroundColor Green
} else {
    Write-Host "❌ Error generando Prisma Client" -ForegroundColor Red
    exit 1
}

# 6. Ejecutar migraciones
Write-Host ""
Write-Host "📊 Ejecutando migraciones de base de datos..." -ForegroundColor Yellow
Set-Location packages/database
npx prisma migrate dev --name init
Set-Location ../..

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migraciones ejecutadas correctamente" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migraciones ya aplicadas o error" -ForegroundColor Yellow
}

# 7. Información de servicios
Write-Host ""
Write-Host "🎉 ¡Entorno de desarrollo listo!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Servicios disponibles:" -ForegroundColor Cyan
Write-Host "   🗄️  PostgreSQL:  localhost:5432" -ForegroundColor White
Write-Host "   🔴 Redis:        localhost:6379" -ForegroundColor White
Write-Host "   📊 Baserow:      http://localhost:8000" -ForegroundColor White
Write-Host "   🔄 n8n:          http://localhost:5678" -ForegroundColor White
Write-Host "   📊 Metabase:     http://localhost:3030" -ForegroundColor White
Write-Host "   📈 Prometheus:   http://localhost:9090" -ForegroundColor White
Write-Host "   📊 Grafana:      http://localhost:3030" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para iniciar las aplicaciones:" -ForegroundColor Cyan
Write-Host "   npm run dev          # Todas las apps en modo desarrollo" -ForegroundColor White
Write-Host "   npm run dev --filter=api       # Solo backend API" -ForegroundColor White
Write-Host "   npm run dev --filter=pos-web   # Solo POS Web" -ForegroundColor White
Write-Host ""
Write-Host "📝 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   npm run db:studio    # Abrir Prisma Studio" -ForegroundColor White
Write-Host "   npm run docker:logs  # Ver logs de servicios" -ForegroundColor White
Write-Host "   npm run docker:down  # Detener servicios" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentación:" -ForegroundColor Cyan
Write-Host "   📖 Plan: PLAN-IMPLEMENTACION.md" -ForegroundColor White
Write-Host "   📊 Status: STATUS-REPORT.md" -ForegroundColor White
Write-Host "   📋 TODOs: todos/README.md" -ForegroundColor White
Write-Host ""
Write-Host "☕ ¡Happy coding! 🚀" -ForegroundColor Cyan
