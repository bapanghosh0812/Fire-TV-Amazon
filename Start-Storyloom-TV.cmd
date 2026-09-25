@echo off
setlocal EnableExtensions
title Storyloom TV
rem ------------------------------------------------------------------
rem  One click: starts the Fire TV emulator, installs Storyloom, opens it.
rem  Remote on the keyboard: arrow keys = D-pad, Enter = OK, Esc = Back.
rem ------------------------------------------------------------------

set "SDK=%LOCALAPPDATA%\Android\Sdk"
set "ADB=%SDK%\platform-tools\adb.exe"
set "EMU=%SDK%\emulator\emulator.exe"
set "AVD=FireTV_1080p"
set "APK=%~dp0dist\Storyloom-TV.apk"
if not exist "%APK%" set "APK=%~dp0apps\tv\android\app\build\outputs\apk\release\app-release.apk"

if not exist "%EMU%" (
  echo Could not find the Android emulator at "%EMU%".
  echo Please install Android Studio's emulator first.
  pause
  exit /b 1
)
if not exist "%APK%" (
  echo Could not find the Storyloom app file. Build it first:
  echo    cd apps\tv\android ^&^& gradlew app:assembleRelease -PreactNativeArchitectures=x86
  pause
  exit /b 1
)

echo.
echo   Storyloom TV
echo   ------------
"%ADB%" start-server >nul 2>&1
"%ADB%" get-state 1>nul 2>nul
if errorlevel 1 (
  echo   Starting the Fire TV emulator ^(first start can take a minute^)...
  start "Fire TV emulator" "%EMU%" -avd %AVD% -netdelay none -netspeed full -no-snapshot-save
)

"%ADB%" wait-for-device
echo   Waiting for the TV to finish starting...
:boot
set "BOOT="
for /f "delims=" %%i in ('"%ADB%" shell getprop sys.boot_completed 2^>nul') do set "BOOT=%%i"
if not "%BOOT%"=="1" (
  timeout /t 2 /nobreak >nul
  goto boot
)

echo   Installing Storyloom...
"%ADB%" install -r "%APK%" >nul
if errorlevel 1 (
  echo   Install failed. Try closing the emulator and running this again.
  pause
  exit /b 1
)

echo   Opening Storyloom...
"%ADB%" shell am start -n com.storyloom.tv/.MainActivity >nul

echo.
echo   Storyloom is running on the TV emulator.
echo.
echo   Remote controls (click the emulator window first):
echo     Arrow keys  = move        Enter = OK / select
echo     Esc         = Back        Space = play / pause
echo     Number keys = type phone numbers and codes
echo.
echo   To join from your phone: scan the QR code shown on the TV.
echo   Demo sign-in number: +1 202 555 0100   code: 246810
echo.
pause
