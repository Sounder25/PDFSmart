[Setup]
; App Metadata
AppId={{D37F159C-D525-4200-8A7B-0A08EE571CFA}
AppName=PDFSmart
AppVersion=1.0.0
AppPublisher=PDFSmart
AppReadmeFile=https://github.com/Sounder25/PDFSmart
AppSupportURL=https://github.com/Sounder25/PDFSmart/issues
AppUpdatesURL=https://github.com/Sounder25/PDFSmart/releases

; Installation Directory & Appearance
DefaultDirName={autopf}\PDFSmart
DisableProgramGroupPage=yes
OutputBaseFilename=PDFSmart_Setup_v1.0.0
UninstallDisplayIcon={app}\PDFSmart.exe
SetupIconFile=PDFSmart\Assets\AppIcon.ico

; Compression and Modern Theme
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Base App
Source: "publish\PDFSmart.exe"; DestDir: "{app}"; Flags: ignoreversion
; All Dependencies & Subfolders
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\PDFSmart"; Filename: "{app}\PDFSmart.exe"
Name: "{autodesktop}\PDFSmart"; Filename: "{app}\PDFSmart.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\PDFSmart.exe"; Description: "{cm:LaunchProgram,PDFSmart}"; Flags: nowait postinstall skipifsilent
