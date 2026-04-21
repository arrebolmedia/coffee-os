# CoffeeOS - Quick Health Check
# Verificación rápida de 30 segundos

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "`n⚡ QUICK HEALTH CHECK" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════`n" -ForegroundColor Cyan

# Contadores
$ok = 0
$fail = 0

# Backend
Write-Host "Backend API:      " -NoNewline
if (Get-NetTCPConnection -LocalPort 4000 -State Listen) {
    Write-Host "✅ Running (port 4000)" -ForegroundColor Green
    $ok++
} else {
    Write-Host "❌ Down" -ForegroundColor Red
    $fail++
}

# Frontend
Write-Host "Frontend POS:     " -NoNewline
if (Get-NetTCPConnection -LocalPort 3001 -State Listen) {
    Write-Host "✅ Running (port 3001)" -ForegroundColor Green
    $ok++
} else {
    Write-Host "❌ Down" -ForegroundColor Red
    $fail++
}

# PostgreSQL
Write-Host "PostgreSQL:       " -NoNewline
if (Get-NetTCPConnection -LocalPort 5434 -State Listen) {
    Write-Host "✅ Running (port 5434)" -ForegroundColor Green
    $ok++
} else {
    Write-Host "❌ Down" -ForegroundColor Red
    $fail++
}

# API Health
Write-Host "API Health:       " -NoNewline
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/health" -TimeoutSec 2
    Write-Host "✅ Responding" -ForegroundColor Green
    $ok++
} catch {
    Write-Host "❌ Not responding" -ForegroundColor Red
    $fail++
}

# Products Endpoint
Write-Host "Products API:     " -NoNewline
try {
    $products = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/products" -TimeoutSec 2
    Write-Host "✅ $($products.Count) products" -ForegroundColor Green
    $ok++
} catch {
    Write-Host "❌ Failed" -ForegroundColor Red
    $fail++
}

# Frontend Accessible
Write-Host "Frontend Access:  " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/pos" -TimeoutSec 3
    Write-Host "✅ POS accessible" -ForegroundColor Green
    $ok++
} catch {
    Write-Host "❌ Not accessible" -ForegroundColor Red
    $fail++
}

# Summary
Write-Host "`n══════════════════════════════════════" -ForegroundColor Cyan
if ($fail -eq 0) {
    Write-Host "✅ ALL SYSTEMS OPERATIONAL ($ok/6)" -ForegroundColor Green
    Write-Host "Ready for development! 🚀" -ForegroundColor White
    exit 0
} else {
    Write-Host "⚠️  ISSUES DETECTED ($ok/6 passing)" -ForegroundColor Yellow
    Write-Host "Run full check: .\scripts\health-check.ps1" -ForegroundColor Gray
    exit 1
}
