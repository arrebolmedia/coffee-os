# Script de Configuración Automática de Baserow usando PowerShell
# No requiere dependencias de Node.js, usa Invoke-RestMethod nativo

param(
    [Parameter(Mandatory=$false)]
    [string]$BaserowUrl = "http://localhost:8000",
    
    [Parameter(Mandatory=$true)]
    [string]$BaserowToken
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando configuración de Baserow para CoffeeOS..." -ForegroundColor Cyan
Write-Host ""

# Configuración de headers
$headers = @{
    "Authorization" = "Token $BaserowToken"
    "Content-Type" = "application/json"
}

$apiBase = "$BaserowUrl/api"

# Función para crear tabla
function Create-BaserowTable {
    param(
        [string]$DatabaseId,
        [string]$TableName
    )
    
    try {
        $body = @{
            database_id = [int]$DatabaseId
            name = $TableName
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$apiBase/database/tables/" -Method Post -Headers $headers -Body $body
        Write-Host "   ✅ Tabla creada: $TableName (ID: $($response.id))" -ForegroundColor Green
        return $response.id
    }
    catch {
        Write-Host "   ❌ Error creando tabla $TableName : $_" -ForegroundColor Red
        throw
    }
}

# Función para crear campo
function Create-BaserowField {
    param(
        [int]$TableId,
        [string]$FieldName,
        [string]$FieldType,
        [hashtable]$AdditionalParams = @{}
    )
    
    try {
        $body = @{
            table_id = $TableId
            name = $FieldName
            type = $FieldType
        }
        
        # Agregar parámetros adicionales
        foreach ($key in $AdditionalParams.Keys) {
            $body[$key] = $AdditionalParams[$key]
        }
        
        $jsonBody = $body | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$apiBase/database/fields/" -Method Post -Headers $headers -Body $jsonBody
        Write-Host "      ➕ Campo agregado: $FieldName ($FieldType)" -ForegroundColor Gray
        return $response.id
    }
    catch {
        Write-Host "      ⚠️ Campo $FieldName omitido (puede ya existir)" -ForegroundColor Yellow
        return $null
    }
}

# Función para agregar fila
function Add-BaserowRow {
    param(
        [int]$TableId,
        [hashtable]$Data
    )
    
    try {
        $jsonBody = $Data | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$apiBase/database/tables/$TableId/rows/" -Method Post -Headers $headers -Body $jsonBody
        return $response.id
    }
    catch {
        Write-Host "      ⚠️ Fila no agregada (puede ser duplicado)" -ForegroundColor Yellow
        return $null
    }
}

try {
    # Paso 1: Crear Database
    Write-Host "📚 Paso 1: Creando base de datos..." -ForegroundColor Yellow
    
    $dbBody = @{
        name = "CoffeeOS Core"
    } | ConvertTo-Json
    
    $database = Invoke-RestMethod -Uri "$apiBase/databases/" -Method Post -Headers $headers -Body $dbBody
    $databaseId = $database.id
    
    Write-Host "   ✅ Base de datos creada: CoffeeOS Core (ID: $databaseId)" -ForegroundColor Green
    Write-Host ""
    
    # Paso 2: Crear tablas principales
    Write-Host "🗂️ Paso 2: Creando tablas principales..." -ForegroundColor Yellow
    
    $tableIds = @{}
    
    # Organizations
    Write-Host "   📋 Creando tabla: Organizations..." -ForegroundColor Cyan
    $tableIds['organizations'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Organizations"
    Start-Sleep -Milliseconds 500
    
    # Locations
    Write-Host "   📋 Creando tabla: Locations..." -ForegroundColor Cyan
    $tableIds['locations'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Locations"
    Start-Sleep -Milliseconds 500
    
    # Roles
    Write-Host "   📋 Creando tabla: Roles..." -ForegroundColor Cyan
    $tableIds['roles'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Roles"
    Start-Sleep -Milliseconds 500
    
    # Users
    Write-Host "   📋 Creando tabla: Users..." -ForegroundColor Cyan
    $tableIds['users'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Users"
    Start-Sleep -Milliseconds 500
    
    # Categories
    Write-Host "   📋 Creando tabla: Categories..." -ForegroundColor Cyan
    $tableIds['categories'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Categories"
    Start-Sleep -Milliseconds 500
    
    # Products
    Write-Host "   📋 Creando tabla: Products..." -ForegroundColor Cyan
    $tableIds['products'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Products"
    Start-Sleep -Milliseconds 500
    
    # Modifiers
    Write-Host "   📋 Creando tabla: Modifiers..." -ForegroundColor Cyan
    $tableIds['modifiers'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Modifiers"
    Start-Sleep -Milliseconds 500
    
    # Suppliers
    Write-Host "   📋 Creando tabla: Suppliers..." -ForegroundColor Cyan
    $tableIds['suppliers'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Suppliers"
    Start-Sleep -Milliseconds 500
    
    # InventoryItems
    Write-Host "   📋 Creando tabla: InventoryItems..." -ForegroundColor Cyan
    $tableIds['inventory_items'] = Create-BaserowTable -DatabaseId $databaseId -TableName "InventoryItems"
    Start-Sleep -Milliseconds 500
    
    # Recipes
    Write-Host "   📋 Creando tabla: Recipes..." -ForegroundColor Cyan
    $tableIds['recipes'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Recipes"
    Start-Sleep -Milliseconds 500
    
    # Customers
    Write-Host "   📋 Creando tabla: Customers..." -ForegroundColor Cyan
    $tableIds['customers'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Customers"
    Start-Sleep -Milliseconds 500
    
    # Tickets
    Write-Host "   📋 Creando tabla: Tickets..." -ForegroundColor Cyan
    $tableIds['tickets'] = Create-BaserowTable -DatabaseId $databaseId -TableName "Tickets"
    Start-Sleep -Milliseconds 500
    
    Write-Host ""
    Write-Host "   ✅ Tablas creadas: $($tableIds.Count)/12" -ForegroundColor Green
    Write-Host ""
    
    # Paso 3: Agregar campos a tablas (ejemplo con Categories)
    Write-Host "📊 Paso 3: Configurando campos de tabla Categories..." -ForegroundColor Yellow
    
    Create-BaserowField -TableId $tableIds['categories'] -FieldName "description" -FieldType "long_text"
    Create-BaserowField -TableId $tableIds['categories'] -FieldName "color" -FieldType "text"
    Create-BaserowField -TableId $tableIds['categories'] -FieldName "icon" -FieldType "text"
    Create-BaserowField -TableId $tableIds['categories'] -FieldName "sort_order" -FieldType "number"
    Create-BaserowField -TableId $tableIds['categories'] -FieldName "active" -FieldType "boolean"
    
    Write-Host ""
    
    # Paso 4: Importar datos iniciales
    Write-Host "📄 Paso 4: Importando datos iniciales..." -ForegroundColor Yellow
    
    # Categorías de ejemplo
    Write-Host "   📦 Importando categorías..." -ForegroundColor Cyan
    
    Add-BaserowRow -TableId $tableIds['categories'] -Data @{
        Name = "Cafés Calientes"
        description = "Bebidas de café servidas calientes"
        color = "#8B4513"
        icon = "☕"
        sort_order = 1
        active = $true
    } | Out-Null
    
    Add-BaserowRow -TableId $tableIds['categories'] -Data @{
        Name = "Cafés Fríos"
        description = "Bebidas de café servidas frías"
        color = "#4169E1"
        icon = "🧊"
        sort_order = 2
        active = $true
    } | Out-Null
    
    Add-BaserowRow -TableId $tableIds['categories'] -Data @{
        Name = "Pasteles"
        description = "Productos de panadería y repostería"
        color = "#FF69B4"
        icon = "🧁"
        sort_order = 3
        active = $true
    } | Out-Null
    
    Write-Host "   ✅ Categorías importadas: 3" -ForegroundColor Green
    Write-Host ""
    
    # Paso 5: Guardar configuración
    Write-Host "💾 Paso 5: Guardando configuración..." -ForegroundColor Yellow
    
    $config = @{
        database_id = $databaseId
        tables = $tableIds
        api_url = "$BaserowUrl/api/database/tables/"
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        config = @{
            name = "CoffeeOS Core"
            tables_count = $tableIds.Count
            baserow_url = $BaserowUrl
        }
    }
    
    $configJson = $config | ConvertTo-Json -Depth 10
    $configPath = Join-Path $PSScriptRoot ".." "config" "baserow.json"
    
    # Crear directorio si no existe
    $configDir = Split-Path $configPath -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $configJson | Set-Content -Path $configPath -Encoding UTF8
    
    Write-Host "   ✅ Configuración guardada en: $configPath" -ForegroundColor Green
    Write-Host ""
    
    # Resumen final
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host "✅ ¡Configuración de Baserow completada exitosamente!" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Resumen:" -ForegroundColor Cyan
    Write-Host "   • Base de datos: CoffeeOS Core (ID: $databaseId)" -ForegroundColor White
    Write-Host "   • Tablas creadas: $($tableIds.Count)" -ForegroundColor White
    Write-Host "   • URL: $BaserowUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Accede a Baserow: $BaserowUrl" -ForegroundColor White
    Write-Host "   2. Revisa las tablas creadas" -ForegroundColor White
    Write-Host "   3. Configura los campos adicionales según la documentación" -ForegroundColor White
    Write-Host "   4. Importa más datos iniciales" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Archivo de configuración:" -ForegroundColor Cyan
    Write-Host "   $configPath" -ForegroundColor White
    Write-Host ""
    
}
catch {
    Write-Host ""
    Write-Host "❌ Error durante la configuración: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Sugerencias:" -ForegroundColor Yellow
    Write-Host "   • Verifica que Baserow esté corriendo: $BaserowUrl" -ForegroundColor White
    Write-Host "   • Verifica que el token sea válido" -ForegroundColor White
    Write-Host "   • Revisa la documentación en docs/setup/BASEROW_SETUP.md" -ForegroundColor White
    Write-Host ""
    exit 1
}
