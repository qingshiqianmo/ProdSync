@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

rem ProdSync 启动脚本 - Windows
rem 使用方法: scripts\start.bat

echo ==================================================
echo 🚀 ProdSync 生产项目管理系统
echo ==================================================
echo.

rem 切换到项目根目录
pushd "%~dp0\.."
set "PROJECT_ROOT=%CD%"
echo [%time%] 项目根目录: %PROJECT_ROOT%

rem 检查Node.js环境
echo [%time%] 检查Node.js环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] 错误: 未找到Node.js，请先安装Node.js 16+
    echo [%time%] 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [%time%] Node.js环境检查完成

rem 检查npm
echo [%time%] 检查npm环境...
call npm --version >tmp_npm_check.txt 2>&1
if %errorlevel% neq 0 (
    echo [%time%] ❌ 错误: 未找到npm
    echo [%time%] npm是Node.js的包管理器，通常随Node.js一起安装
    echo.
    echo [%time%] 解决方案：
    echo [%time%] 1. 重新安装Node.js（推荐）
    echo [%time%]    下载地址: https://nodejs.org/
    echo [%time%]    选择LTS版本，安装时确保勾选"Add to PATH"
    echo.
    echo [%time%] 2. 如果已安装Node.js但找不到npm：
    echo [%time%]    - 重启命令行窗口
    echo [%time%]    - 检查系统环境变量PATH
    echo [%time%]    - 重新安装Node.js
    echo.
    if exist tmp_npm_check.txt del tmp_npm_check.txt
    pause
    exit /b 1
)

if exist tmp_npm_check.txt del tmp_npm_check.txt
echo [%time%] npm环境检查完成

echo.

rem 检查项目结构
echo [%time%] 检查项目结构...
if not exist "server" (
    echo [%time%] 错误: 找不到server目录
    echo [%time%] 请确保在ProdSync项目根目录下运行此脚本
    echo.
    pause
    exit /b 1
)

if not exist "client" (
    echo [%time%] 错误: 找不到client目录
    echo [%time%] 请确保在ProdSync项目根目录下运行此脚本
    echo.
    pause
    exit /b 1
)

if not exist "scripts\start.js" (
    echo [%time%] 错误: 找不到scripts\start.js文件
    echo [%time%] 请确保项目文件完整
    echo.
    pause
    exit /b 1
)

echo [%time%] 项目结构检查完成
echo.

rem 检查依赖
echo [%time%] 检查项目依赖...
set NEED_INSTALL=0

if not exist "node_modules" (
    echo [%time%] 根目录依赖未安装
    set NEED_INSTALL=1
)

if not exist "server\node_modules" (
    echo [%time%] 服务器依赖未安装
    set NEED_INSTALL=1
)

if not exist "client\node_modules" (
    echo [%time%] 客户端依赖未安装
    set NEED_INSTALL=1
)

if %NEED_INSTALL% equ 1 (
    echo [%time%] 检测到依赖未安装，正在安装...
    echo [%time%] 这可能需要几分钟时间，请耐心等待...
    echo.
    
    echo [%time%] 安装根目录依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [%time%] 错误: 根目录依赖安装失败
        echo [%time%] 请检查网络连接或手动运行: npm install
        echo.
        pause
        exit /b 1
    )
    
    echo [%time%] 安装服务器依赖...
    cd server
    call npm install
    if %errorlevel% neq 0 (
        echo [%time%] 错误: 服务器依赖安装失败
        echo [%time%] 请检查网络连接或手动运行: cd server && npm install
        cd ..
        echo.
        pause
        exit /b 1
    )
    cd ..
    
    echo [%time%] 安装客户端依赖...
    cd client
    call npm install
    if %errorlevel% neq 0 (
        echo [%time%] 错误: 客户端依赖安装失败
        echo [%time%] 请检查网络连接或手动运行: cd client && npm install
        cd ..
        echo.
        pause
        exit /b 1
    )
    cd ..
    
    echo [%time%] 所有依赖安装完成
    echo.
) else (
    echo [%time%] 依赖已安装
    echo.
)

rem 清理端口占用
echo [%time%] 清理端口占用...

rem 查找并停止端口5001上的进程
echo [%time%] 检查端口5001（后端）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING" 2^>nul') do (
    echo [%time%] 停止端口5001上的进程 %%a
    taskkill /F /PID %%a >nul 2>&1
)

rem 查找并停止端口5000上的进程
echo [%time%] 检查端口5000（前端）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING" 2^>nul') do (
    echo [%time%] 停止端口5000上的进程 %%a
    taskkill /F /PID %%a >nul 2>&1
)

rem 查找并停止端口3000上的进程（React开发服务器）
echo [%time%] 检查端口3000（React开发）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
    echo [%time%] 停止端口3000上的进程 %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [%time%] 等待端口释放...
timeout /t 3 /nobreak >nul
echo [%time%] 端口清理完成
echo.

rem 启动服务
echo [%time%] 启动ProdSync服务...
echo [%time%] 如果第一次启动，可能需要等待几分钟...
echo.

rem 使用call来确保正确调用Node.js
echo [%time%] 执行启动脚本...
call node scripts\start.js
set START_EXIT_CODE=%errorlevel%

echo.
echo [%time%] 启动脚本执行完成，退出码: %START_EXIT_CODE%

if %START_EXIT_CODE% neq 0 (
    echo [%time%] 启动过程中遇到错误
    echo [%time%] 可能的原因：
    echo [%time%] 1. 端口被占用
    echo [%time%] 2. 依赖安装不完整
    echo [%time%] 3. 权限问题
    echo [%time%] 4. 防火墙阻止
    echo.
    echo [%time%] 请尝试：
    echo [%time%] 1. 重新运行此脚本
    echo [%time%] 2. 手动运行: node scripts\start.js
    echo [%time%] 3. 检查防火墙设置
    echo [%time%] 4. 重启电脑后再试
    echo.
)

rem 恢复原来的目录
popd

echo.
echo [%time%] 脚本执行完成
echo [%time%] 如果遇到问题，请截图发送给技术支持
echo.
pause 