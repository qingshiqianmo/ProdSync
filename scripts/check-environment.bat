@echo off
chcp 65001 >nul

echo ==================================================
echo 🔍 ProdSync 环境检查工具
echo ==================================================
echo.

echo [%time%] 开始环境检查...
echo.

rem 检查Node.js
echo [%time%] 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] ❌ Node.js未安装
    echo.
    echo [%time%] 🔧 解决方案:
    echo [%time%] 1. 访问 https://nodejs.org/
    echo [%time%] 2. 下载LTS（长期支持）版本
    echo [%time%] 3. 运行安装程序，确保勾选以下选项:
    echo [%time%]    ✅ Add to PATH environment variable
    echo [%time%]    ✅ Install npm package manager
    echo [%time%] 4. 安装完成后重启命令行
    echo.
    goto :npm_check
) else (
    echo [%time%] ✅ Node.js已安装
)

:npm_check
rem 检查npm
echo [%time%] 检查npm...
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] ❌ npm未安装或不可用
    echo.
    echo [%time%] 🔧 解决方案:
    echo [%time%] 1. 重启命令行窗口
    echo [%time%] 2. 重新安装Node.js（推荐）
    echo [%time%] 3. 确保安装时勾选了npm选项
    echo.
    goto :result_fail
) else (
    echo [%time%] ✅ npm已安装
)

rem 检查git（可选）
echo [%time%] 检查git（可选）...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] ⚠️ git未安装（可选，用于版本控制）
    echo [%time%] 下载地址: https://git-scm.com/
) else (
    echo [%time%] ✅ git已安装
)

echo.
echo ==================================================
echo 🎉 环境检查通过！
echo ==================================================
echo [%time%] 您可以运行 scripts\start.bat 启动ProdSync
echo.
echo [%time%] 系统要求:
echo [%time%] ✅ Node.js 16.0+
echo [%time%] ✅ npm包管理器
echo [%time%] ✅ 空闲端口 5000 和 5001
echo.
goto :end

:result_fail
echo ==================================================
echo ❌ 环境检查失败
echo ==================================================
echo [%time%] 请根据上述提示安装缺失的组件
echo.
echo [%time%] 完整安装步骤:
echo [%time%] 1. 访问 https://nodejs.org/
echo [%time%] 2. 下载最新LTS版本（推荐v18或v20）
echo [%time%] 3. 运行安装程序（保持默认设置）
echo [%time%] 4. 重启命令行
echo [%time%] 5. 重新运行此检查脚本
echo.

:end
echo [%time%] 如需帮助，请联系技术支持
echo.
pause 