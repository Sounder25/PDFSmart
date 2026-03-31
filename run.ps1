# Quick launcher for PDFSmart (Debug mode)
Write-Host "Starting PDFSmart..." -ForegroundColor Green

$projectCandidates = @(
    "PDFSmart\PDFSmart.csproj",
    "SmartPdfEditor\SmartPdfEditor.csproj"
)

$projectPath = $projectCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $projectPath) {
    Write-Host "Could not find a launchable project file." -ForegroundColor Red
    Write-Host "Checked: $($projectCandidates -join ', ')" -ForegroundColor Yellow
    exit 1
}

Write-Host "Launching $projectPath" -ForegroundColor Cyan
dotnet run --project $projectPath
