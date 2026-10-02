@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Canva Font 20 File Batch Folder Maker

if "%~1"=="" (
  echo.
  echo Font folder ကို ဒီ BAT ပေါ် drag-and-drop လုပ်လို့ရပါတယ်။
  echo ဒါမှမဟုတ် အောက်မှာ font folder path ကို paste/type လုပ်ပါ။
  echo.
  set /p "SRC=Font folder path: "
) else (
  set "SRC=%~1"
)
set "SRC=%SRC:"=%"

if not exist "%SRC%\" (
  echo.
  echo ERROR: Folder မတွေ့ပါ: "%SRC%"
  pause
  exit /b 1
)

for %%A in ("%SRC%") do set "SRC_FULL=%%~fA"
set "OUT=%SRC_FULL%_Canva_20_File_Batches"

if not exist "%OUT%" mkdir "%OUT%" >nul 2>nul

set /a COUNT=0
set /a BATCH=1
set /a IN_BATCH=0

echo.
echo Creating 20-file Canva upload folders...
echo Source : "%SRC_FULL%"
echo Output : "%OUT%"
echo.

for /r "%SRC_FULL%" %%F in (*.ttf *.otf *.woff *.woff2) do (
  if !IN_BATCH! GEQ 20 (
    set /a BATCH+=1
    set /a IN_BATCH=0
  )

  set "PAD=000!BATCH!"
  set "PAD=!PAD:~-3!"
  set "DEST=%OUT%\batch_!PAD!"
  if not exist "!DEST!" mkdir "!DEST!" >nul 2>nul

  copy /y "%%~fF" "!DEST!\%%~nxF" >nul
  if errorlevel 1 (
    echo FAILED: %%~fF
  ) else (
    set /a COUNT+=1
    set /a IN_BATCH+=1
    echo [!COUNT!] batch_!PAD!\%%~nxF
  )
)

echo.
if !COUNT! EQU 0 (
  echo No .ttf / .otf / .woff / .woff2 font files found.
) else (
  echo Done. !COUNT! font file(s) copied into !BATCH! batch folder(s).
  echo Canva ထဲမှာ batch_001 ထဲက 20 files ကို select all လုပ် upload တင်ပါ။ ပြီးရင် batch_002 ... ဆက်တင်ပါ။
)

echo.
pause
endlocal
