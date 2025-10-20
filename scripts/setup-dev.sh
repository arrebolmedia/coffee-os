#!/bin/bash
# Development setup script for CoffeeOS

set -e

echo "🚀 Setting up CoffeeOS development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your actual configuration values"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose up -d postgres redis baserow n8n minio mailhog

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec coffeeos-postgres pg_isready -U coffeeos; do
    sleep 2
done

# Generate Prisma client
echo "🔄 Generating Prisma client..."
cd packages/database
npm run generate

# Run database migrations
echo "🗄️  Running database migrations..."
npm run migrate

# Seed initial data
echo "🌱 Seeding initial data..."
npm run seed

echo "✅ Development environment setup complete!"
echo ""
echo "🌐 Services available at:"
echo "  - API Documentation: http://localhost:4000/docs"
echo "  - POS Web App: http://localhost:3000"
echo "  - Admin Dashboard: http://localhost:3001"
echo "  - Baserow: http://localhost:8000"
echo "  - n8n: http://localhost:5678"
echo "  - Mailhog: http://localhost:8025"
echo "  - MinIO Console: http://localhost:9001"
echo ""
echo "🏃‍♂️ To start development:"
echo "  npm run dev"