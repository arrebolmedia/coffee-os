# CoffeeOS - Start Development Services
# Este script inicia todos los servicios necesarios para desarrollo

Write-Host "🚀 CoffeeOS - Starting Development Services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Host "📦 Checking Docker..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "   Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
    exit 1
}

# Iniciar servicios Docker
Write-Host ""
Write-Host "🐘 Starting PostgreSQL & Redis..." -ForegroundColor Yellow
docker-compose up -d postgres redis

Start-Sleep -Seconds 5

# Verificar PostgreSQL
Write-Host ""
Write-Host "🔍 Checking PostgreSQL connection..." -ForegroundColor Yellow
$maxRetries = 10
$retry = 0
$connected = $false

while ($retry -lt $maxRetries -and -not $connected) {
    try {
        docker exec coffeeos-postgres pg_isready -U coffeeos > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            $connected = $true
            Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
        } else {
            $retry++
            Write-Host "   Waiting for PostgreSQL... ($retry/$maxRetries)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    } catch {
        $retry++
        Write-Host "   Waiting for PostgreSQL... ($retry/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $connected) {
    Write-Host "❌ PostgreSQL failed to start after $maxRetries attempts" -ForegroundColor Red
    exit 1
}

# Ejecutar migraciones de Prisma
Write-Host ""
Write-Host "🔄 Running Prisma migrations..." -ForegroundColor Yellow
Set-Location -Path "packages\database"
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migrations failed, but continuing..." -ForegroundColor Yellow
}

# Generar Prisma Client
Write-Host ""
Write-Host "⚙️  Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Set-Location -Path "..\..\"

# Seed de datos (opcional)
Write-Host ""
Write-Host "🌱 Seeding database (optional)..." -ForegroundColor Yellow
$seedResponse = Read-Host "Do you want to seed the database with sample data? (y/N)"
if ($seedResponse -eq "y" -or $seedResponse -eq "Y") {
    Set-Location -Path "packages\database"
    npx tsx seed.ts
    Set-Location -Path "..\..\"
}

# Resumen
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Services Started Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "   PostgreSQL:  localhost:5434 (user: coffeeos, db: coffeeos_dev)" -ForegroundColor Gray
Write-Host "   Redis:       localhost:6379" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start API:          cd apps\api && npm run start:dev" -ForegroundColor Gray
Write-Host "   2. Start Admin:        cd apps\admin-web && npm run dev" -ForegroundColor Gray
Write-Host "   3. Start POS:          cd apps\pos-web && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Useful Commands:" -ForegroundColor Cyan
Write-Host "   - View logs:           docker-compose logs -f postgres" -ForegroundColor Gray
Write-Host "   - Stop services:       docker-compose down" -ForegroundColor Gray
Write-Host "   - Prisma Studio:       cd packages\database && npx prisma studio" -ForegroundColor Gray
Write-Host ""
