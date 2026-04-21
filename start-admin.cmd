@echo off
cd apps\admin-web
set NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
set NEXT_PUBLIC_APP_NAME=CoffeeOS Admin
set NEXT_PUBLIC_APP_VERSION=1.0.0

echo Starting CoffeeOS Admin Web on port 3002...
..\..\node_modules\.bin\next.cmd dev -p 3002
