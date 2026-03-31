@echo off
REM Quick launcher for PDFSmart (Debug mode)
echo Starting PDFSmart...
set "PROJECT_PATH="

if exist "PDFSmart\PDFSmart.csproj" (
    set "PROJECT_PATH=PDFSmart\PDFSmart.csproj"
) else if exist "SmartPdfEditor\SmartPdfEditor.csproj" (
    set "PROJECT_PATH=SmartPdfEditor\SmartPdfEditor.csproj"
)

if "%PROJECT_PATH%"=="" (
    echo Could not find a launchable project file.
    echo Checked: PDFSmart\PDFSmart.csproj, SmartPdfEditor\SmartPdfEditor.csproj
    exit /b 1
)

echo Launching %PROJECT_PATH%
dotnet run --project "%PROJECT_PATH%"
