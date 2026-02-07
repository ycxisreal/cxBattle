@echo off
:: ==============================
:: 自动检测是否为管理员
:: ==============================
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo 需要管理员权限，正在重新请求...
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

:: ==============================
:: 已获得管理员权限
:: ==============================
cd /d %~dp0

echo.
echo ===== 开始 Electron Windows 构建 =====
echo.

npm run electron:build:win

echo.
echo ===== 构建完成 =====
pause
