# run_tests.ps1 - Run all API tests (Windows PowerShell)

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  SmAIrt Mobility API - Test Suite Runner                 ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

$backendPath = Split-Path -Parent $PSScriptRoot
Set-Location $backendPath

Write-Host "Starting FastAPI server in background..." -ForegroundColor Cyan

# Start server in background
$serverProcess = Start-Process `
    -FilePath "python.exe" `
    -ArgumentList "-m uvicorn main:app --reload --host 0.0.0.0 --port 8000" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "✓ Server started (PID: $($serverProcess.Id))" -ForegroundColor Green

# Wait for server to be ready
Write-Host "Waiting for server to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Running test suite..." -ForegroundColor Cyan
Write-Host ""

# Run tests
python tests/test_endpoints.py
$testExit = $LASTEXITCODE

Write-Host ""
Write-Host "Stopping server..." -ForegroundColor Cyan

# Kill server
try {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Server stopped" -ForegroundColor Green
}
catch {
    Write-Host "⚠ Could not stop server gracefully" -ForegroundColor Yellow
}

Write-Host ""

exit $testExit
