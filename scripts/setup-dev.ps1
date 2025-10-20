# Development setup script for CoffeeOS (PowerShell)

Write-Host "🚀 Setting up CoffeeOS development environment..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Copy environment file if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "⚠️  Please update .env.local with your actual configuration values" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Start infrastructure services
Write-Host "🐳 Starting infrastructure services..." -ForegroundColor Blue
docker-compose up -d postgres redis baserow n8n minio mailhog

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 2
    $result = docker exec coffeeos-postgres pg_isready -U coffeeos 2>$null
} while ($LASTEXITCODE -ne 0)

# Generate Prisma client
Write-Host "🔄 Generating Prisma client..." -ForegroundColor Blue
Set-Location "packages/database"
npm run generate

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Blue
npm run migrate

# Seed initial data
Write-Host "🌱 Seeding initial data..." -ForegroundColor Blue
npm run seed

Set-Location "../.."

Write-Host "✅ Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Services available at:" -ForegroundColor Cyan
Write-Host "  - API Documentation: http://localhost:4000/docs"
Write-Host "  - POS Web App: http://localhost:3000"
Write-Host "  - Admin Dashboard: http://localhost:3001"
Write-Host "  - Baserow: http://localhost:8000"
Write-Host "  - n8n: http://localhost:5678"
Write-Host "  - Mailhog: http://localhost:8025"
Write-Host "  - MinIO Console: http://localhost:9001"
Write-Host ""
Write-Host "🏃‍♂️ To start development:" -ForegroundColor Cyan
Write-Host "  npm run dev"