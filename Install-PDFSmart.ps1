# Install-PDFSmart.ps1
# Main installation script for PDFSmart

$InstallDir = "$env:LOCALAPPDATA\PDFSmart"
$ProjectDir = $PSScriptRoot
$ExeName = "PDFSmart.exe"
$FullPath = "$InstallDir\$ExeName"

Write-Host "========================================" -ForegroundColor Green
Write-Host "PDFSmart - Installing" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 1. Build/Publish
Write-Host "Building and publishing single-file executable..." -ForegroundColor Cyan
& "$ProjectDir\publish.ps1"

if (-not (Test-Path "$ProjectDir\publish\$ExeName")) {
    Write-Error "Publish failed. Executable not found."
    return
}

# 2. Create Install Directory
if (-not (Test-Path $InstallDir)) {
    Write-Host "Creating install directory: $InstallDir" -ForegroundColor Yellow
    New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
}

# 3. Copy Files
Write-Host "Copying files to $InstallDir..." -ForegroundColor Cyan
Copy-Item -Path "$ProjectDir\publish\*" -Destination $InstallDir -Recurse -Force

# 4. Create Shortcuts
$WshShell = New-Object -ComObject WScript.Shell

# Desktop Shortcut
Write-Host "Creating Desktop shortcut..." -ForegroundColor Cyan
$DesktopShortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\PDFSmart.lnk")
$DesktopShortcut.TargetPath = $FullPath
$DesktopShortcut.WorkingDirectory = $InstallDir
$DesktopShortcut.IconLocation = "$FullPath,0"
$DesktopShortcut.Description = "PDFSmart - Modern PDF manipulation tool"
$DesktopShortcut.Save()

# Start Menu Shortcut
Write-Host "Creating Start Menu shortcut..." -ForegroundColor Cyan
$StartMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$StartShortcut = $WshShell.CreateShortcut("$StartMenuPath\PDFSmart.lnk")
$StartShortcut.TargetPath = $FullPath
$StartShortcut.WorkingDirectory = $InstallDir
$StartShortcut.IconLocation = "$FullPath,0"
$StartShortcut.Description = "PDFSmart - Modern PDF manipulation tool"
$StartShortcut.Save()

# 5. Register File Association
Write-Host "Registering file associations..." -ForegroundColor Cyan
& "$ProjectDir\Register-FileAssociation.ps1" -ExePath $FullPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now launch PDFSmart from your Desktop or Start Menu."
Write-Host ".pdf files can now be opened with PDFSmart."
Write-Host ""
Read-Host "Press Enter to finish"
