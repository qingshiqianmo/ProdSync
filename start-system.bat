@echo off
chcp 65001 >nul
echo ================================
echo 生产项目管理系统 V3 (支持里程碑)
echo ================================

echo 正在检查并停止现有服务...
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

echo 等待端口释放...
timeout /t 3 /nobreak > nul

echo 正在启动后端服务器...
start "ProdSync Backend" cmd /k "chcp 65001 >nul && cd server && node src/simple-server-v3.js"

echo 等待后端初始化...
timeout /t 5 /nobreak > nul

echo 正在启动前端应用...
start "ProdSync Frontend" cmd /k "chcp 65001 >nul && cd client && npm start"

echo 等待应用启动...
timeout /t 8 /nobreak > nul

echo ================================
echo 系统启动成功！
echo ================================
echo 前端地址: http://localhost:5000
echo 后端地址: http://localhost:5001  
echo 健康检查: http://localhost:5001/health
echo ================================
echo 登录账号（密码统一：test123）:
echo 系统管理员:    admin / admin123
echo 生产调度员:    scheduler01 / test123
echo 生产所领导:    leader01, leader02 / test123
echo 职员账号:     staff01-staff10 / test123
echo ================================
echo 新功能特性:
echo 1. 支持任务里程碑节点设置
echo 2. 生产调度员可在创建任务时添加里程碑
echo 3. 里程碑状态跟踪（待开始/进行中/已完成/延期）
echo 4. 任务列表显示里程碑统计信息
echo ================================
echo 重要提示:
echo 1. 如需要请清除浏览器缓存 (Ctrl+Shift+R)
echo 2. 使用调度员账号 scheduler01 创建任务
echo 3. 创建任务时可选择添加里程碑节点
echo 4. 里程碑包含：名称、描述、计划时间等
echo 5. 可后续为任务添加、修改、删除里程碑
echo ================================
echo 服务器部署提示:
echo 1. 生产环境建议使用PM2管理Node.js进程
echo 2. 使用nginx做反向代理和负载均衡
echo 3. 配置systemd服务实现开机自启动
echo ================================
echo 测试里程碑功能:
echo 运行命令: cd server && node test-milestones.js
echo ================================

pause 