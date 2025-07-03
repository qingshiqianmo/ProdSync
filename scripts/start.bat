@echo off
chcp 65001 >nul

rem ProdSync 启动脚本 - Windows
rem 使用方法: scripts\start.bat

echo ==================================================
echo 🚀 ProdSync 生产项目管理系统
echo ==================================================
echo.

rem 切换到项目根目录
cd /d "%~dp0\.."

rem 检查Node.js环境
echo [%time%] 检查Node.js环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] 错误: 未找到Node.js，请先安装Node.js 16+
    pause
    exit /b 1
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] 错误: 未找到npm，请先安装npm
    pause
    exit /b 1
)

echo [%time%] Node.js环境检查完成

rem 检查依赖
echo [%time%] 检查项目依赖...
if not exist "server\node_modules" goto install_deps
if not exist "client\node_modules" goto install_deps
goto skip_install

:install_deps
echo [%time%] 依赖未安装，正在安装...
call npm run install-all
if %errorlevel% neq 0 (
    echo [%time%] 错误: 依赖安装失败
    pause
    exit /b 1
)

:skip_install
echo [%time%] 依赖检查完成

rem 清理端口占用
echo [%time%] 清理端口占用...

echo [%time%] 检查端口5001（后端）...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5001" ^| find "LISTENING"') do (
    echo [%time%] 停止端口5001上的进程 %%a
    taskkill /F /PID %%a 2>nul
)

echo [%time%] 检查端口5000（前端）...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
    echo [%time%] 停止端口5000上的进程 %%a
    taskkill /F /PID %%a 2>nul
)

echo [%time%] 等待端口释放...
timeout /t 2 /nobreak > nul

rem 启动服务
echo [%time%] 启动ProdSync服务...
node scripts\start.js

rem 如果脚本意外退出，暂停以便查看错误信息
pause 