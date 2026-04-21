# CoffeeOS - Health Check Integral
# Verifica todas las conexiones y módulos del sistema

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         COFFEEOS - HEALTH CHECK INTEGRAL                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$results = @{
    Passed = 0
    Failed = 0
    Warnings = 0
}

function Test-Check {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$SuccessMessage,
        [string]$FailMessage,
        [bool]$Critical = $true
    )
    
    Write-Host "[$Name] " -NoNewline -ForegroundColor Yellow
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host "✅ PASS" -ForegroundColor Green
            Write-Host "  └─ $SuccessMessage" -ForegroundColor Gray
            $script:results.Passed++
            return $true
        } else {
            if ($Critical) {
                Write-Host "❌ FAIL" -ForegroundColor Red
                $script:results.Failed++
            } else {
                Write-Host "⚠️  WARN" -ForegroundColor Yellow
                $script:results.Warnings++
            }
            Write-Host "  └─ $FailMessage" -ForegroundColor Gray
            return $false
        }
    } catch {
        if ($Critical) {
            Write-Host "❌ ERROR" -ForegroundColor Red
            $script:results.Failed++
        } else {
            Write-Host "⚠️  WARN" -ForegroundColor Yellow
            $script:results.Warnings++
        }
        Write-Host "  └─ $($_.Exception.Message)" -ForegroundColor Gray
        return $false
    }
}

# ============================================================================
# SECCIÓN 1: INFRAESTRUCTURA
# ============================================================================
Write-Host "`n═══ 1. INFRAESTRUCTURA ═══" -ForegroundColor Magenta

Test-Check -Name "Node.js" -Test {
    $version = node --version 2>$null
    $version -match "v\d+\.\d+\.\d+"
} -SuccessMessage "Node.js instalado: $(node --version)" -FailMessage "Node.js no encontrado"

Test-Check -Name "npm" -Test {
    $version = npm --version 2>$null
    $version -match "\d+\.\d+\.\d+"
} -SuccessMessage "npm instalado: v$(npm --version)" -FailMessage "npm no encontrado"

Test-Check -Name "PostgreSQL Port" -Test {
    $conn = Get-NetTCPConnection -LocalPort 5434 -ErrorAction SilentlyContinue
    $null -ne $conn
} -SuccessMessage "PostgreSQL escuchando en puerto 5434" -FailMessage "PostgreSQL no está corriendo"

# ============================================================================
# SECCIÓN 2: SERVICIOS
# ============================================================================
Write-Host "`n═══ 2. SERVICIOS BACKEND Y FRONTEND ═══" -ForegroundColor Magenta

$backendRunning = Test-Check -Name "Backend API" -Test {
    $conn = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
    $null -ne $conn
} -SuccessMessage "Backend escuchando en puerto 4000" -FailMessage "Backend no está corriendo"

$frontendRunning = Test-Check -Name "Frontend POS" -Test {
    $conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    $null -ne $conn
} -SuccessMessage "Frontend escuchando en puerto 3001" -FailMessage "Frontend no está corriendo"

# ============================================================================
# SECCIÓN 3: CONECTIVIDAD API
# ============================================================================
Write-Host "`n═══ 3. CONECTIVIDAD API ═══" -ForegroundColor Magenta

if ($backendRunning) {
    Test-Check -Name "API Health" -Test {
        $response = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/health" -Method Get -TimeoutSec 5
        $response -ne $null
    } -SuccessMessage "API respondiendo correctamente" -FailMessage "API no responde"

    Test-Check -Name "API CORS" -Test {
        $headers = @{
            "Origin" = "http://localhost:3001"
        }
        $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -Method Get -Headers $headers -TimeoutSec 5
        $response.Headers["Access-Control-Allow-Origin"] -eq "http://localhost:3001"
    } -SuccessMessage "CORS configurado para localhost:3001" -FailMessage "CORS no configurado correctamente"
} else {
    Write-Host "[API Tests] ⏭️  SKIPPED - Backend no está corriendo" -ForegroundColor DarkGray
}

# ============================================================================
# SECCIÓN 4: BASE DE DATOS
# ============================================================================
Write-Host "`n═══ 4. BASE DE DATOS ═══" -ForegroundColor Magenta

if ($backendRunning) {
    Test-Check -Name "DB Organizations" -Test {
        $orgs = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/organizations" -Method Get -TimeoutSec 5 -ErrorAction Stop
        $orgs.Count -gt 0
    } -SuccessMessage "Organizaciones: $($orgs.Count) encontradas" -FailMessage "No hay organizaciones en la BD" -Critical $false

    Test-Check -Name "DB Products" -Test {
        $products = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/products" -Method Get -TimeoutSec 5
        $products.Count -gt 0
    } -SuccessMessage "Productos: $($products.Count) encontrados" -FailMessage "No hay productos en la BD"

    Test-Check -Name "DB Categories" -Test {
        $categories = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/categories" -Method Get -TimeoutSec 5
        $categories.Count -gt 0
    } -SuccessMessage "Categorías: $($categories.Count) encontradas" -FailMessage "No hay categorías en la BD"
} else {
    Write-Host "[DB Tests] ⏭️  SKIPPED - Backend no está corriendo" -ForegroundColor DarkGray
}

# ============================================================================
# SECCIÓN 5: INTEGRACIÓN PRODUCTOS-RECETAS
# ============================================================================
Write-Host "`n═══ 5. INTEGRACIÓN PRODUCTOS-RECETAS ═══" -ForegroundColor Magenta

if ($backendRunning) {
    $testProduct = $null
    Test-Check -Name "Obtener Producto" -Test {
        $products = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/products" -Method Get -TimeoutSec 5
        $script:testProduct = $products[0]
        $null -ne $testProduct
    } -SuccessMessage "Producto de prueba: $($testProduct.name) (ID: $($testProduct.id))" -FailMessage "No se pudo obtener producto"

    if ($testProduct) {
        $recipe = $null
        Test-Check -Name "Receta por ProductId" -Test {
            $script:recipe = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/recipes/product/$($testProduct.id)" -Method Get -TimeoutSec 5
            $null -ne $recipe
        } -SuccessMessage "Receta encontrada: $($recipe.name)" -FailMessage "No hay receta para este producto" -Critical $false

        if ($recipe) {
            Test-Check -Name "Ingredientes" -Test {
                $recipe.ingredients.Count -gt 0
            } -SuccessMessage "Ingredientes: $($recipe.ingredients.Count)" -FailMessage "Receta sin ingredientes"

            Test-Check -Name "Cálculo de Costos" -Test {
                ($null -ne $recipe.total_cost) -and ($recipe.total_cost -gt 0)
            } -SuccessMessage "Costo total: $$([math]::Round($recipe.total_cost, 2))" -FailMessage "Costos no calculados"

            Test-Check -Name "Precio Sugerido" -Test {
                ($null -ne $recipe.suggested_price) -and ($recipe.suggested_price -gt 0)
            } -SuccessMessage "Precio sugerido: $$([math]::Round($recipe.suggested_price, 2))" -FailMessage "Precio no calculado"

            Test-Check -Name "Margen" -Test {
                ($null -ne $recipe.target_margin_percentage) -and ($recipe.target_margin_percentage -gt 0)
            } -SuccessMessage "Margen objetivo: $($recipe.target_margin_percentage)%" -FailMessage "Margen no configurado"
        }
    }
} else {
    Write-Host "[Integration Tests] ⏭️  SKIPPED - Backend no está corriendo" -ForegroundColor DarkGray
}

# ============================================================================
# SECCIÓN 6: ENDPOINTS PRINCIPALES
# ============================================================================
Write-Host "`n═══ 6. ENDPOINTS PRINCIPALES ═══" -ForegroundColor Magenta

if ($backendRunning) {
    $endpoints = @(
        @{Path="/api/v1/products"; Name="Products"},
        @{Path="/api/v1/categories"; Name="Categories"},
        @{Path="/api/v1/organizations"; Name="Organizations"},
        @{Path="/api/v1/users"; Name="Users"},
        @{Path="/api/v1/locations"; Name="Locations"}
    )

    foreach ($endpoint in $endpoints) {
        Test-Check -Name "GET $($endpoint.Name)" -Test {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:4000$($endpoint.Path)" -Method Get -TimeoutSec 5
                $response.StatusCode -eq 200
            } catch {
                $_.Exception.Response.StatusCode.Value_ -eq 401 # Unauthorized es válido para endpoints protegidos
            }
        } -SuccessMessage "Endpoint accesible" -FailMessage "Endpoint no responde" -Critical $false
    }
} else {
    Write-Host "[Endpoints Tests] ⏭️  SKIPPED - Backend no está corriendo" -ForegroundColor DarkGray
}

# ============================================================================
# SECCIÓN 7: FRONTEND
# ============================================================================
Write-Host "`n═══ 7. FRONTEND ═══" -ForegroundColor Magenta

if ($frontendRunning) {
    Test-Check -Name "Frontend Root" -Test {
        $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method Get -TimeoutSec 10
        $response.StatusCode -eq 200
    } -SuccessMessage "Página principal carga correctamente" -FailMessage "Frontend no responde"

    Test-Check -Name "POS Page" -Test {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/pos" -Method Get -TimeoutSec 10
        $response.StatusCode -eq 200
    } -SuccessMessage "Página POS accesible" -FailMessage "POS no carga"

    Test-Check -Name "Dashboard Page" -Test {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/dashboard" -Method Get -TimeoutSec 10
        $response.StatusCode -eq 200
    } -SuccessMessage "Dashboard accesible" -FailMessage "Dashboard no carga"
} else {
    Write-Host "[Frontend Tests] ⏭️  SKIPPED - Frontend no está corriendo" -ForegroundColor DarkGray
}

# ============================================================================
# SECCIÓN 8: ARCHIVOS Y CONFIGURACIÓN
# ============================================================================
Write-Host "`n═══ 8. ARCHIVOS Y CONFIGURACIÓN ═══" -ForegroundColor Magenta

Test-Check -Name "Prisma Schema" -Test {
    Test-Path "C:\Projects\CoffeeOS\packages\database\prisma\schema.prisma"
} -SuccessMessage "Schema de Prisma existe" -FailMessage "Schema no encontrado"

Test-Check -Name "Backend .env" -Test {
    Test-Path "C:\Projects\CoffeeOS\apps\api\.env"
} -SuccessMessage "Archivo .env del backend existe" -FailMessage ".env no encontrado" -Critical $false

Test-Check -Name "Frontend .env.local" -Test {
    Test-Path "C:\Projects\CoffeeOS\apps\pos-web\.env.local"
} -SuccessMessage "Archivo .env.local del frontend existe" -FailMessage ".env.local no encontrado"

if (Test-Path "C:\Projects\CoffeeOS\apps\pos-web\.env.local") {
    Test-Check -Name "API URL Config" -Test {
        $envContent = Get-Content "C:\Projects\CoffeeOS\apps\pos-web\.env.local" -Raw
        $envContent -match "NEXT_PUBLIC_API_URL=http://localhost:4000"
    } -SuccessMessage "API URL configurada correctamente" -FailMessage "API URL incorrecta en .env.local"
}

# ============================================================================
# SECCIÓN 9: MÓDULOS DEL SISTEMA
# ============================================================================
Write-Host "`n═══ 9. MÓDULOS DEL SISTEMA ═══" -ForegroundColor Magenta

$modules = @(
    @{Path="apps/api/src/modules/auth"; Name="Auth"},
    @{Path="apps/api/src/modules/products"; Name="Products"},
    @{Path="apps/api/src/modules/categories"; Name="Categories"},
    @{Path="apps/api/src/modules/recipes"; Name="Recipes"},
    @{Path="apps/api/src/modules/inventory"; Name="Inventory"},
    @{Path="apps/api/src/modules/pos"; Name="POS"},
    @{Path="apps/api/src/modules/organizations"; Name="Organizations"},
    @{Path="apps/api/src/modules/users"; Name="Users"}
)

foreach ($module in $modules) {
    Test-Check -Name "$($module.Name) Module" -Test {
        Test-Path "C:\Projects\CoffeeOS\$($module.Path)"
    } -SuccessMessage "Módulo implementado" -FailMessage "Módulo no encontrado" -Critical $false
}

# ============================================================================
# SECCIÓN 10: DEPENDENCIAS
# ============================================================================
Write-Host "`n═══ 10. DEPENDENCIAS ═══" -ForegroundColor Magenta

Test-Check -Name "Root node_modules" -Test {
    Test-Path "C:\Projects\CoffeeOS\node_modules"
} -SuccessMessage "Dependencias raíz instaladas" -FailMessage "Ejecutar npm install en la raíz"

Test-Check -Name "Backend node_modules" -Test {
    Test-Path "C:\Projects\CoffeeOS\apps\api\node_modules"
} -SuccessMessage "Dependencias backend instaladas" -FailMessage "Ejecutar npm install en apps/api"

Test-Check -Name "Frontend node_modules" -Test {
    Test-Path "C:\Projects\CoffeeOS\apps\pos-web\node_modules"
} -SuccessMessage "Dependencias frontend instaladas" -FailMessage "Ejecutar npm install en apps/pos-web"

Test-Check -Name "Prisma Client" -Test {
    Test-Path "C:\Projects\CoffeeOS\node_modules\.prisma\client"
} -SuccessMessage "Prisma Client generado" -FailMessage "Ejecutar: npx prisma generate" -Critical $false

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    RESUMEN FINAL                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$total = $results.Passed + $results.Failed + $results.Warnings

Write-Host "`n✅ Pasados:    " -NoNewline -ForegroundColor Green
Write-Host "$($results.Passed)/$total"

Write-Host "❌ Fallidos:   " -NoNewline -ForegroundColor Red
Write-Host "$($results.Failed)/$total"

Write-Host "⚠️  Advertencias: " -NoNewline -ForegroundColor Yellow
Write-Host "$($results.Warnings)/$total"

$percentage = [math]::Round(($results.Passed / $total) * 100, 1)
Write-Host "`n📊 Score: " -NoNewline
if ($percentage -ge 90) {
    Write-Host "$percentage% ⭐⭐⭐" -ForegroundColor Green
} elseif ($percentage -ge 70) {
    Write-Host "$percentage% ⭐⭐" -ForegroundColor Yellow
} else {
    Write-Host "$percentage% ⭐" -ForegroundColor Red
}

# Estado general
Write-Host "`n🔍 Estado General: " -NoNewline
if ($results.Failed -eq 0) {
    Write-Host "SISTEMA OPERACIONAL ✅" -ForegroundColor Green
    Write-Host "   Todos los sistemas están funcionando correctamente." -ForegroundColor Gray
    exit 0
} elseif ($results.Failed -le 3) {
    Write-Host "REQUIERE ATENCIÓN ⚠️" -ForegroundColor Yellow
    Write-Host "   Algunos componentes necesitan revisión." -ForegroundColor Gray
    exit 1
} else {
    Write-Host "SISTEMA CON PROBLEMAS ❌" -ForegroundColor Red
    Write-Host "   Se requiere intervención inmediata." -ForegroundColor Gray
    exit 2
}

Write-Host "`n"
