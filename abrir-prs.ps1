# Script para abrir los 4 PRs en el navegador
# Ejecutar desde: C:\Projects\CoffeeOS

Write-Host "🚀 Abriendo PRs en GitHub..." -ForegroundColor Green
Write-Host ""

# URLs de los PRs
$prs = @(
    @{
        Name = "Orders Module (43 tests)"
        URL = "https://github.com/arrebolmedia/coffee-os/pull/new/feat/orders-module"
        File = "PR-ORDERS.md"
    },
    @{
        Name = "Discounts Module (39 tests)"
        URL = "https://github.com/arrebolmedia/coffee-os/pull/new/feat/discounts-module"
        File = "PR-DISCOUNTS.md"
    },
    @{
        Name = "Taxes Module (26 tests)"
        URL = "https://github.com/arrebolmedia/coffee-os/pull/new/feat/taxes-module"
        File = "PR-TAXES.md"
    },
    @{
        Name = "Shifts Module (26 tests)"
        URL = "https://github.com/arrebolmedia/coffee-os/pull/new/feat/shifts-module"
        File = "PR-SHIFTS.md"
    }
)

foreach ($pr in $prs) {
    Write-Host "📝 $($pr.Name)" -ForegroundColor Cyan
    Write-Host "   URL: $($pr.URL)" -ForegroundColor Gray
    Write-Host "   Descripción: $($pr.File)" -ForegroundColor Gray
    Write-Host ""
    
    # Abrir en navegador
    Start-Process $pr.URL
    
    # Esperar 2 segundos antes de abrir el siguiente
    Start-Sleep -Seconds 2
}

Write-Host "✅ Todos los PRs abiertos en tu navegador!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Instrucciones:" -ForegroundColor Yellow
Write-Host "1. Copia el contenido de cada archivo PR-*.md" -ForegroundColor White
Write-Host "2. Pégalo en la descripción del PR correspondiente" -ForegroundColor White
Write-Host "3. Crea el Pull Request" -ForegroundColor White
Write-Host ""
