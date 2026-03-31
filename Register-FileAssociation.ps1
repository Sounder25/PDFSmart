# Register-FileAssociation.ps1
# Registers PDFSmart for .pdf files in the Windows Registry (Current User)

param(
    [string]$ExePath = "$env:LOCALAPPDATA\PDFSmart\PDFSmart.exe"
)

$ProgId = "PDFSmart.PDF"
$Extension = ".pdf"

Write-Host "Registering file association for $Extension..." -ForegroundColor Cyan

# Ensure the executable exists
if (-not (Test-Path $ExePath)) {
    Write-Error "Executable not found at $ExePath"
    return
}

# 1. Create the ProgID
$ProgIdPath = "HKCU:\Software\Classes\$ProgId"
if (-not (Test-Path $ProgIdPath)) {
    New-Item -Path $ProgIdPath -Force | Out-Null
}
Set-ItemProperty -Path $ProgIdPath -Name "(Default)" -Value "PDFSmart Document"

# 2. Set the icon
$IconPath = "$ProgIdPath\DefaultIcon"
if (-not (Test-Path $IconPath)) {
    New-Item -Path $IconPath -Force | Out-Null
}
Set-ItemProperty -Path $IconPath -Name "(Default)" -Value "$ExePath,0"

# 3. Set the open command
$CommandPath = "$ProgIdPath\shell\open\command"
if (-not (Test-Path $CommandPath)) {
    New-Item -Path $CommandPath -Force | Out-Null
}
Set-ItemProperty -Path $CommandPath -Name "(Default)" -Value "`"$ExePath`" `"%1`""

# 4. Associate the extension with the ProgID
$ExtPath = "HKCU:\Software\Classes\$Extension"
if (-not (Test-Path $ExtPath)) {
    New-Item -Path $ExtPath -Force | Out-Null
}
Set-ItemProperty -Path $ExtPath -Name "(Default)" -Value $ProgId

# 5. Add to "Open with" list (Optional but helpful)
$OpenWithList = "HKCU:\Software\Classes\.pdf\OpenWithList\PDFSmart.exe"
if (-not (Test-Path $OpenWithList)) {
    New-Item -Path $OpenWithList -Force | Out-Null
}

Write-Host "File association registered successfully!" -ForegroundColor Green
Write-Host "Note: You might need to select PDFSmart manually once in 'Open with' -> 'Choose another app' for it to become the default." -ForegroundColor Yellow
