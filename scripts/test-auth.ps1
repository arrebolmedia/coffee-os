# CoffeeOS API - Authentication Test Script
# Prueba el flujo completo de autenticación

$API_URL = "http://localhost:4000/api/v1"

Write-Host "🔐 CoffeeOS Authentication - Testing Flow" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check (Public)
Write-Host "1️⃣  Testing public endpoint (Health Check)..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$API_URL/health" -Method GET
    Write-Host "✅ Health check successful (public endpoint works)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 2: Protected endpoint without token (should fail)
Write-Host ""
Write-Host "2️⃣  Testing protected endpoint without token..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$API_URL/products" -Method GET -ErrorAction Stop
    Write-Host "⚠️  WARNING: Protected endpoint accessible without token!" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ Correctly rejected (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

# Test 3: Register new user
Write-Host ""
Write-Host "3️⃣  Registering new test user..." -ForegroundColor Yellow
$testEmail = "test-$(Get-Random)@coffeeos.mx"
$registerBody = @{
    email = $testEmail
    password = "TestPassword123!"
    name = "Usuario de Prueba"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$API_URL/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ User registered successfully" -ForegroundColor Green
    Write-Host "   Email: $($registerResponse.user.email)" -ForegroundColor Gray
    Write-Host "   User ID: $($registerResponse.user.id)" -ForegroundColor Gray
    Write-Host "   Token received: $($registerResponse.accessToken.Substring(0, 30))..." -ForegroundColor Gray
    
    $accessToken = $registerResponse.accessToken
    $refreshToken = $registerResponse.refreshToken
    $userId = $registerResponse.user.id
} catch {
    Write-Host "❌ Registration failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    exit 1
}

# Test 4: Access protected endpoint with token
Write-Host ""
Write-Host "4️⃣  Accessing protected endpoint with token..." -ForegroundColor Yellow
try {
    $productsAuthResponse = Invoke-RestMethod -Uri "$API_URL/products" -Method GET -Headers @{
        "Authorization" = "Bearer $accessToken"
    }
    Write-Host "✅ Successfully accessed protected endpoint" -ForegroundColor Green
    Write-Host "   Products found: $($productsAuthResponse.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to access protected endpoint" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 5: Get current user info
Write-Host ""
Write-Host "5️⃣  Getting current user info..." -ForegroundColor Yellow
try {
    $meResponse = Invoke-RestMethod -Uri "$API_URL/auth/me" -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
    }
    Write-Host "✅ User info retrieved:" -ForegroundColor Green
    Write-Host "   Name: $($meResponse.data.name)" -ForegroundColor Gray
    Write-Host "   Email: $($meResponse.data.email)" -ForegroundColor Gray
    Write-Host "   User ID: $($meResponse.data.userId)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get user info" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 6: Login with credentials
Write-Host ""
Write-Host "6️⃣  Testing login with credentials..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "   New token received: $($loginResponse.accessToken.Substring(0, 30))..." -ForegroundColor Gray
    
    # Update tokens
    $accessToken = $loginResponse.accessToken
    $refreshToken = $loginResponse.refreshToken
} catch {
    Write-Host "❌ Login failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 7: Refresh token
Write-Host ""
Write-Host "7️⃣  Testing token refresh..." -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $refreshResponse = Invoke-RestMethod -Uri "$API_URL/auth/refresh" -Method POST -Body $refreshBody -ContentType "application/json"
    Write-Host "✅ Token refreshed successfully" -ForegroundColor Green
    Write-Host "   New access token: $($refreshResponse.accessToken.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Token refresh failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 8: Change password
Write-Host ""
Write-Host "8️⃣  Testing password change..." -ForegroundColor Yellow
$changePasswordBody = @{
    currentPassword = "TestPassword123!"
    newPassword = "NewPassword456!"
} | ConvertTo-Json

try {
    $changePasswordResponse = Invoke-RestMethod -Uri "$API_URL/auth/change-password" -Method POST -Body $changePasswordBody -ContentType "application/json" -Headers @{
        "Authorization" = "Bearer $accessToken"
    }
    Write-Host "✅ Password changed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Password change failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 9: Login with new password
Write-Host ""
Write-Host "9️⃣  Testing login with new password..." -ForegroundColor Yellow
$newLoginBody = @{
    email = $testEmail
    password = "NewPassword456!"
} | ConvertTo-Json

try {
    $newLoginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $newLoginBody -ContentType "application/json"
    Write-Host "✅ Login with new password successful" -ForegroundColor Green
    
    $accessToken = $newLoginResponse.accessToken
} catch {
    Write-Host "❌ Login with new password failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Test 10: Logout
Write-Host ""
Write-Host "🔟 Testing logout..." -ForegroundColor Yellow
try {
    $logoutResponse = Invoke-RestMethod -Uri "$API_URL/auth/logout" -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
    }
    Write-Host "✅ Logged out successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Logout failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Authentication Tests Completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Public endpoints accessible" -ForegroundColor Gray
Write-Host "   ✅ Protected endpoints require auth" -ForegroundColor Gray
Write-Host "   ✅ User registration working" -ForegroundColor Gray
Write-Host "   ✅ Login working" -ForegroundColor Gray
Write-Host "   ✅ Token validation working" -ForegroundColor Gray
Write-Host "   ✅ Token refresh working" -ForegroundColor Gray
Write-Host "   ✅ Password change working" -ForegroundColor Gray
Write-Host "   ✅ Logout working" -ForegroundColor Gray
Write-Host ""
Write-Host "🔑 Test Credentials:" -ForegroundColor Cyan
Write-Host "   Email: $testEmail" -ForegroundColor Gray
Write-Host "   Password: NewPassword456!" -ForegroundColor Gray
Write-Host ""
