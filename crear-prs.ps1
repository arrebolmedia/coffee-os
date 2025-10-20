# Script para crear los 3 Pull Requests

Write-Host "🚀 Abriendo Pull Requests en el navegador..." -ForegroundColor Cyan
Write-Host ""

# PR 1: Transactions
Write-Host "📝 PR 1: Transactions Module" -ForegroundColor Green
Start-Process "https://github.com/arrebolmedia/coffee-os/compare/main...feat/transactions-module?expand=1"
Start-Sleep -Seconds 2

# PR 2: Payments
Write-Host "💳 PR 2: Payments Module" -ForegroundColor Green
Start-Process "https://github.com/arrebolmedia/coffee-os/compare/main...feat/payments-module?expand=1"
Start-Sleep -Seconds 2

# PR 3: Inventory Movements
Write-Host "📦 PR 3: Inventory Movements Module" -ForegroundColor Green
Start-Process "https://github.com/arrebolmedia/coffee-os/compare/main...feat/inventory-movements-module?expand=1"

Write-Host ""
Write-Host "✅ 3 PRs abiertos en el navegador!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Instrucciones:" -ForegroundColor Yellow
Write-Host "1. Para cada PR, copia el contenido del archivo correspondiente:" -ForegroundColor White
Write-Host "   - PR-TRANSACTIONS.md" -ForegroundColor Gray
Write-Host "   - PR-PAYMENTS.md" -ForegroundColor Gray
Write-Host "   - PR-INVENTORY-MOVEMENTS.md" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Pega en la descripción del PR" -ForegroundColor White
Write-Host "3. Revisa los archivos modificados" -ForegroundColor White
Write-Host "4. Click en 'Create Pull Request'" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Total: 92 tests, 26 endpoints, 3 módulos críticos" -ForegroundColor Green
