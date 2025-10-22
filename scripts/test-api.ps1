# CoffeeOS API - Quick Test Script
# Este script prueba los endpoints principales del API

$API_URL = "http://localhost:4000"

Write-Host "🧪 CoffeeOS API - Testing Endpoints" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el API esté corriendo
Write-Host "📡 Checking API health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -ErrorAction Stop
    Write-Host "✅ API is running" -ForegroundColor Green
} catch {
    Write-Host "❌ API is not responding. Please start the API first:" -ForegroundColor Red
    Write-Host "   cd apps\api && npm run start:dev" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "🧪 Running API Tests..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Create Category
Write-Host "1️⃣  Creating a category..." -ForegroundColor Yellow
$categoryBody = @{
    name = "Bebidas Calientes"
    description = "Café, té y chocolate"
    color = "#D97706"
    icon = "coffee"
    display_order = 0
    status = "ACTIVE"
} | ConvertTo-Json

try {
    $categoryResponse = Invoke-RestMethod -Uri "$API_URL/categories" -Method POST -Body $categoryBody -ContentType "application/json"
    Write-Host "✅ Category created: $($categoryResponse.name) (ID: $($categoryResponse.id))" -ForegroundColor Green
    $categoryId = $categoryResponse.id
} catch {
    Write-Host "❌ Failed to create category" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    exit 1
}

# Test 2: Create Product
Write-Host ""
Write-Host "2️⃣  Creating a product..." -ForegroundColor Yellow
$productBody = @{
    category_id = $categoryId
    name = "Café Americano"
    description = "Café espresso con agua caliente"
    sku = "CAF-AME-001"
    base_price = 35.00
    cost = 12.50
    tax_rate = 0.16
    is_available = $true
    allow_modifiers = $true
    track_inventory = $false
} | ConvertTo-Json

try {
    $productResponse = Invoke-RestMethod -Uri "$API_URL/products" -Method POST -Body $productBody -ContentType "application/json"
    Write-Host "✅ Product created: $($productResponse.name) (SKU: $($productResponse.sku))" -ForegroundColor Green
    $productId = $productResponse.id
} catch {
    Write-Host "❌ Failed to create product" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 3: List Products
Write-Host ""
Write-Host "3️⃣  Listing all products..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$API_URL/products" -Method GET
    Write-Host "✅ Found $($productsResponse.Count) product(s)" -ForegroundColor Green
    foreach ($product in $productsResponse) {
        Write-Host "   - $($product.name) ($($product.sku)) - $($product.price) MXN" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to list products" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 4: Get Product by ID
Write-Host ""
Write-Host "4️⃣  Getting product by ID..." -ForegroundColor Yellow
try {
    $productDetailResponse = Invoke-RestMethod -Uri "$API_URL/products/$productId" -Method GET
    Write-Host "✅ Product details:" -ForegroundColor Green
    Write-Host "   Name: $($productDetailResponse.name)" -ForegroundColor Gray
    Write-Host "   Price: $($productDetailResponse.price) MXN" -ForegroundColor Gray
    Write-Host "   Category: $($productDetailResponse.category.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get product details" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 5: Update Product
Write-Host ""
Write-Host "5️⃣  Updating product price..." -ForegroundColor Yellow
$updateBody = @{
    base_price = 38.00
} | ConvertTo-Json

try {
    $updatedResponse = Invoke-RestMethod -Uri "$API_URL/products/$productId" -Method PATCH -Body $updateBody -ContentType "application/json"
    Write-Host "✅ Product updated: New price = $($updatedResponse.price) MXN" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to update product" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 6: Product Stats
Write-Host ""
Write-Host "6️⃣  Getting product statistics..." -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod -Uri "$API_URL/products/stats" -Method GET
    Write-Host "✅ Stats retrieved:" -ForegroundColor Green
    Write-Host "   Total products: $($statsResponse.total)" -ForegroundColor Gray
    Write-Host "   Active products: $($statsResponse.active)" -ForegroundColor Gray
    Write-Host "   Total value: $($statsResponse.totalValue) MXN" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get stats" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 7: List Categories
Write-Host ""
Write-Host "7️⃣  Listing all categories..." -ForegroundColor Yellow
try {
    $categoriesResponse = Invoke-RestMethod -Uri "$API_URL/categories" -Method GET
    Write-Host "✅ Found $($categoriesResponse.Count) category(ies)" -ForegroundColor Green
    foreach ($category in $categoriesResponse) {
        $productCount = $category.products.Count
        Write-Host "   - $($category.name) ($productCount product(s))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to list categories" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 8: Category Stats
Write-Host ""
Write-Host "8️⃣  Getting category statistics..." -ForegroundColor Yellow
try {
    $categoryStatsResponse = Invoke-RestMethod -Uri "$API_URL/categories/stats" -Method GET
    Write-Host "✅ Category stats:" -ForegroundColor Green
    Write-Host "   Total categories: $($categoryStatsResponse.total_categories)" -ForegroundColor Gray
    Write-Host "   Active categories: $($categoryStatsResponse.active_categories)" -ForegroundColor Gray
    Write-Host "   Total products: $($categoryStatsResponse.total_products)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get category stats" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ API Tests Completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Useful URLs:" -ForegroundColor Cyan
Write-Host "   Swagger Docs: $API_URL/api" -ForegroundColor Gray
Write-Host "   Health Check: $API_URL/health" -ForegroundColor Gray
Write-Host ""
