#!/usr/bin/env pwsh
# Script de verificación rápida de endpoints de CoffeeOS

Write-Host "🔍 Verificación de Endpoints - CoffeeOS" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Variables
$backendUrl = "http://localhost:4000"
$frontendUrl = "http://localhost:3001"

# Función para verificar endpoint
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Name,
        [int[]]$ValidStatusCodes = @(200, 401, 404)
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -ErrorAction SilentlyContinue
        $statusCode = $response.StatusCode
        
        if ($ValidStatusCodes -contains $statusCode) {
            Write-Host "✅ $Name" -ForegroundColor Green
            Write-Host "   Status: $statusCode" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "⚠️  $Name" -ForegroundColor Yellow
            Write-Host "   Status: $statusCode (inesperado)" -ForegroundColor Gray
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($ValidStatusCodes -contains $statusCode) {
            Write-Host "✅ $Name" -ForegroundColor Green
            Write-Host "   Status: $statusCode" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ $Name" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
            return $false
        }
    }
}

# 1. Verificar servicios
Write-Host "`n📡 Verificando Servicios..." -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Yellow

$backendTest = Test-NetConnection -ComputerName localhost -Port 4000 -InformationLevel Quiet
if ($backendTest) {
    Write-Host "✅ Backend (Puerto 4000)" -ForegroundColor Green
} else {
    Write-Host "❌ Backend (Puerto 4000) NO RESPONDE" -ForegroundColor Red
    Write-Host "`n⚠️  Inicia el backend con: cd apps/api && npm run dev" -ForegroundColor Yellow
}

$frontendTest = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet
if ($frontendTest) {
    Write-Host "✅ Frontend (Puerto 3001)" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend (Puerto 3001) NO RESPONDE" -ForegroundColor Red
    Write-Host "`n⚠️  Inicia el frontend con: cd apps/pos-web && npm run dev" -ForegroundColor Yellow
}

if (-not $backendTest) {
    Write-Host "`n❌ Backend no está corriendo. No se pueden verificar endpoints." -ForegroundColor Red
    exit 1
}

# 2. Verificar endpoints del backend
Write-Host "`n🔌 Verificando Endpoints del Backend..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$orgId = "cmh29onrp0000wpumsnlsw45p"

Test-Endpoint -Url "$backendUrl/api/v1/auth/login" -Name "Auth: Login" -ValidStatusCodes @(201, 400, 401)
Test-Endpoint -Url "$backendUrl/api/v1/recipes" -Name "Recipes: Lista" -ValidStatusCodes @(200, 401)
Test-Endpoint -Url "$backendUrl/api/v1/suppliers" -Name "Suppliers: Lista" -ValidStatusCodes @(200, 401)
Test-Endpoint -Url "$backendUrl/api/v1/suppliers/organization/$orgId" -Name "Suppliers: Por Organización" -ValidStatusCodes @(200, 401, 404)
Test-Endpoint -Url "$backendUrl/api/v1/suppliers/organization/$orgId/stats" -Name "Suppliers: Estadísticas" -ValidStatusCodes @(200, 401, 404)
Test-Endpoint -Url "$backendUrl/api/v1/products" -Name "Products: Lista" -ValidStatusCodes @(200, 401)
Test-Endpoint -Url "$backendUrl/api/v1/categories" -Name "Categories: Lista" -ValidStatusCodes @(200, 401)
Test-Endpoint -Url "$backendUrl/api/v1/inventory/organization/$orgId/stats" -Name "Inventory: Stats" -ValidStatusCodes @(200, 401, 404)

# 3. Verificar frontend
Write-Host "`n🌐 Verificando Frontend..." -ForegroundColor Yellow
Write-Host "--------------------------" -ForegroundColor Yellow

if ($frontendTest) {
    Test-Endpoint -Url "$frontendUrl" -Name "Frontend: Página Principal" -ValidStatusCodes @(200)
    Test-Endpoint -Url "$frontendUrl/api/auth/signin" -Name "Frontend: Auth Sign In" -ValidStatusCodes @(200)
} else {
    Write-Host "⚠️  Frontend no está corriendo" -ForegroundColor Yellow
}

# 4. Resumen
Write-Host "`n📊 Resumen de Verificación" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

if ($backendTest -and $frontendTest) {
    Write-Host "✅ SERVICIOS: Backend y Frontend activos" -ForegroundColor Green
} elseif ($backendTest) {
    Write-Host "⚠️  SERVICIOS: Solo Backend activo" -ForegroundColor Yellow
} else {
    Write-Host "❌ SERVICIOS: Backend inactivo" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔗 URLs de Acceso:" -ForegroundColor White
Write-Host "   Frontend: $frontendUrl" -ForegroundColor Gray
Write-Host "   Backend:  $backendUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "👤 Credenciales de Prueba:" -ForegroundColor White
Write-Host "   Email:    owner@coffeedemo.mx" -ForegroundColor Gray
Write-Host "   Password: password123" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Próximo Paso:" -ForegroundColor White
Write-Host "   1. Abre $frontendUrl en tu navegador" -ForegroundColor Gray
Write-Host "   2. Inicia sesión con las credenciales de arriba" -ForegroundColor Gray
Write-Host "   3. Sigue el checklist en TESTING-CHECKLIST.md" -ForegroundColor Gray
Write-Host ""
