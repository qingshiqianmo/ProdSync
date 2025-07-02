@echo off
chcp 65001 >nul
echo ================================
echo 停止生产项目管理系统
echo ================================

echo 正在检查运行的服务...

echo.
echo 检查PM2进程...
pm2 list 2>nul | find "prodsync" >nul
if not errorlevel 1 (
    echo 发现PM2管理的ProdSync进程，正在停止...
    pm2 stop prodsync-backend 2>nul
    pm2 stop prodsync-frontend 2>nul
    echo PM2进程已停止
) else (
    echo 未发现PM2管理的ProdSync进程
)

echo.
echo 检查端口占用...
echo 检查端口5001（后端）...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5001" ^| find "LISTENING"') do (
  echo 停止端口5001上的进程 %%a
  taskkill /F /PID %%a 2>nul
)

echo 检查端口5000（前端）...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
  echo 停止端口5000上的进程 %%a
  taskkill /F /PID %%a 2>nul
)

echo.
echo 检查名为"ProdSync"的窗口...
tasklist /fi "windowtitle eq ProdSync Backend" 2>nul | find "node.exe" >nul
if not errorlevel 1 (
    echo 关闭ProdSync Backend窗口
    taskkill /fi "windowtitle eq ProdSync Backend" /f 2>nul
)

tasklist /fi "windowtitle eq ProdSync Frontend" 2>nul | find "node.exe" >nul
if not errorlevel 1 (
    echo 关闭ProdSync Frontend窗口
    taskkill /fi "windowtitle eq ProdSync Frontend" /f 2>nul
)

echo.
echo ================================
echo 系统停止完成！
echo ================================
echo 所有ProdSync相关进程已安全停止
echo 其他Node.js应用不受影响
echo ================================

pause 