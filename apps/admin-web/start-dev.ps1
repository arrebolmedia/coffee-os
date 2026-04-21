# Start admin-web with correct environment
$env:NEXT_PUBLIC_API_URL = 'http://localhost:4001/api/v1'
$env:NEXT_PUBLIC_APP_NAME = 'CoffeeOS Admin'
$env:NEXT_PUBLIC_APP_VERSION = '1.0.0'

Set-Location $PSScriptRoot
& node "..\..\node_modules\next\dist\bin\next" dev -p 3002
