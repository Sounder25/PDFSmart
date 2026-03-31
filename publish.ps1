

# PDFSmart - Publish Script (PowerShell)
# Creates a single-file executable with all dependencies

Write-Host "========================================" -ForegroundColor Green
Write-Host "PDFSmart - Publishing" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Clean previous publish
if (Test-Path "publish") {
    Write-Host "Cleaning previous publish folder..." -ForegroundColor Yellow
    Remove-Item -Path "publish" -Recurse -Force
}

Write-Host "Publishing application..." -ForegroundColor Cyan
dotnet publish PDFSmart\PDFSmart.csproj `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  --output publish `
  /p:PublishReadyToRun=true

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Executable location: " -NoNewline
    Write-Host "publish\PDFSmart.exe" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Cyan
    Write-Host "1. Run publish\PDFSmart.exe directly"
    Write-Host "2. Create a shortcut to Desktop/Start Menu"
    Write-Host "3. Package with an installer (e.g., Inno Setup, WiX)"
    Write-Host ""
    
    # Optionally create desktop shortcut
    $createShortcut = Read-Host "Create desktop shortcut? (Y/N)"
    if ($createShortcut -eq "Y" -or $createShortcut -eq "y") {
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\PDFSmart.lnk")
        $Shortcut.TargetPath = "$PWD\publish\PDFSmart.exe"
        $Shortcut.WorkingDirectory = "$PWD\publish"
        $Shortcut.IconLocation = "$PWD\publish\PDFSmart.exe,0"
        $Shortcut.Description = "PDFSmart - Modern PDF manipulation tool"
        $Shortcut.Save()
        Write-Host "Desktop shortcut created!" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "BUILD FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
