#!/usr/bin/env pwsh
$env:NEXT_PUBLIC_API_URL = "http://localhost:4001/api/v1"
$env:NEXT_PUBLIC_APP_NAME = "CoffeeOS Admin"
$env:NEXT_PUBLIC_APP_VERSION = "1.0.0"

Write-Host "Starting CoffeeOS Admin Web on port 3002..." -ForegroundColor Green
Push-Location
Set-Location -Path "apps\admin-web"
& "..\..\node_modules\.bin\next.cmd" dev -p 3002
Pop-Location
