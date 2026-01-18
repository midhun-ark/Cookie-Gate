Write-Host "Starting all services..."

$baseDir = Get-Location

# 1. Admin Backend
$adminServer = Join-Path $baseDir "Admin Portal\apps\server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$adminServer'; Write-Host 'Starting Admin Backend...'; npm run dev"

# 2. Admin Frontend
$adminUI = Join-Path $baseDir "Admin Portal\apps\admin-ui"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$adminUI'; Write-Host 'Starting Admin Frontend...'; npm run dev"

# 3. Tenant Backend
$tenantServer = Join-Path $baseDir "Tenant Platform\apps\server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$tenantServer'; Write-Host 'Starting Tenant Backend...'; npm run dev"

# 4. Tenant Frontend
$tenantUI = Join-Path $baseDir "Tenant Platform\apps\tenant-ui"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$tenantUI'; Write-Host 'Starting Tenant Frontend...'; npm run dev"

Write-Host "All services initiated in separate terminal windows."
