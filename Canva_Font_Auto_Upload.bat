@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Canva Font Auto Upload Helper

set "SCRIPT_DIR=%~dp0"
set "JS_FILE=%SCRIPT_DIR%canva-font-uploader.js"
set "TOOLS_DIR=%LOCALAPPDATA%\CanvaFontUploaderTools"

if not exist "%JS_FILE%" (
  echo ERROR: canva-font-uploader.js မတွေ့ပါ။
  echo This BAT file must stay in the same folder as canva-font-uploader.js.
  pause
  exit /b 1
)

if "%~1"=="" (
  echo.
  echo Font folder ကို ဒီ BAT ပေါ် drag-and-drop လုပ်လို့ရပါတယ်။
  echo ဒါမှမဟုတ် အောက်မှာ font folder path ကို paste/type လုပ်ပါ။
  echo Example: D:\Fonts\MyanmarFonts
  echo.
  set /p "FONT_DIR=Font folder path: "
) else (
  set "FONT_DIR=%~1"
)
set "FONT_DIR=%FONT_DIR:"=%"

if not exist "%FONT_DIR%\" (
  echo.
  echo ERROR: Folder မတွေ့ပါ: "%FONT_DIR%"
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Node.js မရှိသေးပါ။
  echo Node.js LTS ကို install လုပ်ပြီး ဒီ BAT ကို ပြန် run ပါ။
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: npm မရှိသေးပါ။ Node.js LTS ကို reinstall လုပ်ပါ။
  pause
  exit /b 1
)

if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%" >nul 2>nul

if not exist "%TOOLS_DIR%\package.json" (
  > "%TOOLS_DIR%\package.json" echo {"private":true,"name":"canva-font-uploader-tools","dependencies":{"playwright":"latest"}}
)

if not exist "%TOOLS_DIR%\node_modules\playwright\package.json" (
  echo.
  echo First run ဖြစ်လို့ Playwright browser automation tools ကို install လုပ်နေပါတယ်...
  echo This can take a few minutes.
  pushd "%TOOLS_DIR%"
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    popd
    echo.
    echo ERROR: Playwright install မအောင်မြင်ပါ။ Internet connection ကိုစစ်ပါ။
    pause
    exit /b 1
  )
  call npx playwright install chromium
  if errorlevel 1 (
    popd
    echo.
    echo ERROR: Chromium install မအောင်မြင်ပါ။
    pause
    exit /b 1
  )
  popd
)

set "NODE_PATH=%TOOLS_DIR%\node_modules"

echo.
echo Starting Canva font uploader...
echo Font folder: "%FONT_DIR%"
echo.
node "%JS_FILE%" "%FONT_DIR%" --batch-size=20 --delay-seconds=12

echo.
pause
endlocal
