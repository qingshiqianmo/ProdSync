@echo off
chcp 65001 >nul
echo ================================
echo 生产项目管理系统 - 生产环境部署
echo ================================

echo 1. 安装PM2进程管理器（如果未安装）
npm list -g pm2 >nul 2>&1
if errorlevel 1 (
    echo 正在全局安装PM2...
    npm install -g pm2
) else (
    echo PM2已安装
)

echo.
echo 2. 停止现有PM2进程
pm2 stop prodsync-backend 2>nul
pm2 stop prodsync-frontend 2>nul
pm2 delete prodsync-backend 2>nul
pm2 delete prodsync-frontend 2>nul

echo.
echo 3. 构建前端应用（生产版本）
cd client
echo 正在安装前端依赖...
npm install
echo 正在构建前端...
npm run build
cd ..

echo.
echo 4. 安装后端依赖
cd server
echo 正在安装后端依赖...
npm install
cd ..

echo.
echo 5. 使用PM2启动服务
echo 启动后端服务...
pm2 start server/src/simple-server-v3.js --name prodsync-backend --env production

echo 启动前端服务（静态文件服务器）...
pm2 serve client/build 3000 --name prodsync-frontend --spa

echo.
echo 6. 保存PM2配置
pm2 save
pm2 startup

echo ================================
echo 生产环境部署完成！
echo ================================
echo 后端服务: http://localhost:3001
echo 前端服务: http://localhost:3000
echo ================================
echo PM2管理命令:
echo pm2 list                    - 查看所有进程
echo pm2 logs prodsync-backend   - 查看后端日志
echo pm2 logs prodsync-frontend  - 查看前端日志
echo pm2 restart prodsync-backend - 重启后端
echo pm2 restart prodsync-frontend - 重启前端
echo pm2 stop all               - 停止所有进程
echo ================================

pause 