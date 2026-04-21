#!/usr/bin/env pwsh
# CoffeeOS - Database Setup Script
# Este script inicializa la base de datos PostgreSQL y ejecuta migraciones

Write-Host "🚀 CoffeeOS - Database Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Docker
Write-Host "📦 Verificando Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Por favor instala Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# 2. Verificar si Docker está corriendo
try {
    docker ps | Out-Null
    Write-Host "✅ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop" -ForegroundColor Red
    exit 1
}

# 3. Iniciar contenedores de base de datos
Write-Host ""
Write-Host "🐘 Iniciando PostgreSQL y Redis..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Esperar a que PostgreSQL esté listo
Write-Host ""
Write-Host "⏳ Esperando a que PostgreSQL esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxRetries = 10
$retryCount = 0
$dbReady = $false

while (-not $dbReady -and $retryCount -lt $maxRetries) {
    $retryCount++
    Write-Host "   Intento $retryCount de $maxRetries..." -ForegroundColor Gray
    
    try {
        $result = docker exec coffeeos-postgres pg_isready -U coffeeos 2>&1
        if ($result -like "*accepting connections*") {
            $dbReady = $true
            Write-Host "✅ PostgreSQL está listo" -ForegroundColor Green
        } else {
            Start-Sleep -Seconds 2
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $dbReady) {
    Write-Host "❌ PostgreSQL no está listo después de $maxRetries intentos" -ForegroundColor Red
    exit 1
}

# 4. Generar Prisma Client
Write-Host ""
Write-Host "🔧 Generando Prisma Client..." -ForegroundColor Yellow
Set-Location packages/database
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generando Prisma Client" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Write-Host "✅ Prisma Client generado" -ForegroundColor Green

# 5. Ejecutar migraciones
Write-Host ""
Write-Host "📊 Ejecutando migraciones..." -ForegroundColor Yellow
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error ejecutando migraciones" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Write-Host "✅ Migraciones aplicadas" -ForegroundColor Green

# 6. Ejecutar seed (opcional)
Write-Host ""
$runSeed = Read-Host "¿Deseas poblar la base de datos con datos demo? (S/n)"
if ($runSeed -eq "" -or $runSeed -eq "S" -or $runSeed -eq "s") {
    Write-Host ""
    Write-Host "🌱 Poblando base de datos..." -ForegroundColor Yellow
    npx ts-node seed.ts
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error poblando base de datos" -ForegroundColor Red
        Set-Location ../..
        exit 1
    }
    
    Write-Host "✅ Base de datos poblada con datos demo" -ForegroundColor Green
}

Set-Location ../..

# 7. Resumen
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Setup completado exitosamente" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Información de conexión:" -ForegroundColor Cyan
Write-Host "   Database: postgresql://coffeeos:coffeeos123@localhost:5434/coffeeos_dev"
Write-Host "   Redis:    redis://localhost:6379"
Write-Host ""
Write-Host "🔐 Credenciales demo:" -ForegroundColor Cyan
Write-Host "   Owner:   owner@coffeedemo.mx / password123"
Write-Host "   Manager: manager@coffeedemo.mx / password123"
Write-Host "   Barista: barista@coffeedemo.mx / password123"
Write-Host ""
Write-Host "🚀 Para iniciar el proyecto:" -ForegroundColor Cyan
Write-Host "   npm run dev"
Write-Host ""
