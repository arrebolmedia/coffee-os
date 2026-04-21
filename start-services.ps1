# Script para iniciar todos los servicios de CoffeeOS
# Ejecutar desde la raíz del proyecto: .\start-services.ps1

Write-Host "🚀 Iniciando servicios de CoffeeOS..." -ForegroundColor Green
Write-Host ""

# Función para verificar si un puerto está en uso
function Test-Port {
    param($port)
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

# 1. Verificar Docker
Write-Host "📦 Verificando Docker..." -ForegroundColor Cyan
$dockerRunning = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerRunning) {
    Write-Host "⚠️  Docker Desktop no está corriendo. Iniciándolo..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "Esperando 30 segundos para que Docker Desktop inicie..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}
Write-Host "✅ Docker Desktop está corriendo" -ForegroundColor Green
Write-Host ""

# 2. Verificar PostgreSQL
Write-Host "🐘 Verificando PostgreSQL (puerto 5434)..." -ForegroundColor Cyan
if (-not (Test-Port 5434)) {
    Write-Host "⚠️  PostgreSQL no está escuchando en puerto 5434" -ForegroundColor Yellow
    Write-Host "Ejecuta: docker-compose up -d postgres" -ForegroundColor Yellow
} else {
    Write-Host "✅ PostgreSQL está corriendo" -ForegroundColor Green
}
Write-Host ""

# 3. Verificar Redis
Write-Host "📮 Verificando Redis (puerto 6379)..." -ForegroundColor Cyan
if (-not (Test-Port 6379)) {
    Write-Host "⚠️  Redis no está escuchando en puerto 6379" -ForegroundColor Yellow
    Write-Host "Ejecuta: docker-compose up -d redis" -ForegroundColor Yellow
} else {
    Write-Host "✅ Redis está corriendo" -ForegroundColor Green
}
Write-Host ""

# 4. Iniciar API Backend (puerto 4001)
Write-Host "🌐 Iniciando API Backend (puerto 4001)..." -ForegroundColor Cyan
if (Test-Port 4001) {
    Write-Host "⚠️  Puerto 4001 ya está en uso. Deteniendo proceso..." -ForegroundColor Yellow
    $apiProcess = Get-NetTCPConnection -LocalPort 4001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($apiProcess) {
        Stop-Process -Id $apiProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Set-Location "apps\api"
Write-Host "Compilando API..." -ForegroundColor Yellow
npm run build | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ API compilada exitosamente" -ForegroundColor Green
    Write-Host "Iniciando servidor..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node .\dist\main.js"
    Start-Sleep -Seconds 5
    if (Test-Port 4001) {
        Write-Host "✅ API Backend corriendo en http://localhost:4001" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: API no pudo iniciar" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Error al compilar API" -ForegroundColor Red
}
Set-Location "..\.."
Write-Host ""

# 5. Iniciar POS Web (puerto 3000)
Write-Host "💰 Iniciando POS Web (puerto 3000)..." -ForegroundColor Cyan
if (Test-Port 3000) {
    Write-Host "✅ POS Web ya está corriendo en http://localhost:3000" -ForegroundColor Green
} else {
    Set-Location "apps\pos-web"
    Write-Host "Iniciando servidor Next.js..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node ..\..\node_modules\next\dist\bin\next dev -p 3000"
    Start-Sleep -Seconds 5
    if (Test-Port 3000) {
        Write-Host "✅ POS Web corriendo en http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: POS Web no pudo iniciar" -ForegroundColor Red
    }
    Set-Location "..\.."
}
Write-Host ""

# 6. Resumen
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "✅ SERVICIOS DE COFFEEOS INICIADOS" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "🌐 API Backend:   http://localhost:4001" -ForegroundColor Cyan
Write-Host "📚 API Docs:      http://localhost:4001/docs" -ForegroundColor Cyan
Write-Host "💰 POS Web:       http://localhost:3000" -ForegroundColor Cyan
Write-Host "🐘 PostgreSQL:    localhost:5434" -ForegroundColor Cyan
Write-Host "📮 Redis:         localhost:6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔑 Credenciales de prueba:" -ForegroundColor Yellow
Write-Host "   Owner:    owner@coffeedemo.mx / password123" -ForegroundColor White
Write-Host "   Manager:  manager@coffeedemo.mx / password123" -ForegroundColor White
Write-Host "   Barista:  barista@coffeedemo.mx / password123" -ForegroundColor White
Write-Host ""
Write-Host "Para detener los servicios, cierra las ventanas de PowerShell" -ForegroundColor Yellow
