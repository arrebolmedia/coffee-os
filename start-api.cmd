@echo off
cd apps\api
set PORT=4001
set NODE_ENV=development
set DATABASE_URL=postgresql://coffeeos:coffeeos123@localhost:5434/coffeeos_dev
set REDIS_URL=redis://localhost:6379
set JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
set JWT_EXPIRES_IN=7d
set CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

echo Starting CoffeeOS API on port 4001...
..\..\node_modules\.bin\nest.cmd start --watch
