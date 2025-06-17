Write-Host "Building Virtual Classroom for production..." -ForegroundColor Green

Write-Host "`nStep 1: Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install

Write-Host "`nStep 2: Building React app..." -ForegroundColor Yellow
npm run build

Write-Host "`nStep 3: Installing server dependencies..." -ForegroundColor Yellow
Set-Location ../server
npm install

Write-Host "`nStep 4: Starting the server..." -ForegroundColor Green
Write-Host "The Virtual Classroom will be available at:" -ForegroundColor Cyan
Write-Host "- Local: http://localhost:3001" -ForegroundColor White
Write-Host "- Network: http://YOUR_IP_ADDRESS:3001" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm start 