@echo off
REM PDFSmart - Publish Script
REM Creates a self-contained folder with all dependencies

echo ========================================
echo PDFSmart - Publishing
echo ========================================
echo.

REM Clean previous publish
if exist "publish" (
    echo Cleaning previous publish folder...
    rmdir /s /q publish
)

echo Publishing application...
dotnet publish PDFSmart\PDFSmart.csproj ^
  --configuration Release ^
  --runtime win-x64 ^
  --self-contained true ^
  --output publish ^
  /p:PublishReadyToRun=true

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo.
    echo Executable location: publish\PDFSmart.exe
    echo.
    echo You can now:
    echo 1. Run publish\PDFSmart.exe directly
    echo 2. Package the publish folder into an installer (e.g., Inno Setup, WiX)
    echo.
) else (
    echo.
    echo ========================================
    echo BUILD FAILED
    echo ========================================
    echo Please check the error messages above.
)

pause
