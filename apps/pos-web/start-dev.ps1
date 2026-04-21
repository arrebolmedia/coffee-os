#!/usr/bin/env pwsh
# Script para iniciar Next.js

$env:NODE_ENV = "development"

Write-Host "🚀 Iniciando CoffeeOS Frontend..." -ForegroundColor Cyan
Write-Host "📍 Puerto: 3001" -ForegroundColor Yellow
Write-Host "🔗 URL: http://localhost:3001" -ForegroundColor Green
Write-Host ""

# Cambiar al directorio del proyecto
Set-Location $PSScriptRoot

# Ejecutar Next.js directamente con node
node ../../node_modules/next/dist/bin/next dev -p 3001
