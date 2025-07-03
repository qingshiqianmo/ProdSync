# ProdSync 快速部署指南

## 🚀 一键部署（推荐）

### 在服务器上运行以下命令：

```bash
# 1. 下载一键部署脚本
curl -O https://raw.githubusercontent.com/your-repo/ProdSync/main/server-auto-deploy.sh

# 2. 添加执行权限
chmod +x server-auto-deploy.sh

# 3. 运行部署脚本
./server-auto-deploy.sh
```

## 📦 打包前清理（在开发环境）

### 在推送代码到GitHub前，运行清理脚本：

```bash
# 在项目根目录运行
chmod +x deploy/create-clean-package.sh
./deploy/create-clean-package.sh
```

**清理内容：**
- ✅ 删除所有 `node_modules` 目录
- ✅ 删除构建文件 (`build/`, `dist/`)
- ✅ 删除临时文件和日志
- ✅ 删除环境配置文件
- ⚠️ 可选：删除数据库文件
- ⚠️ 可选：删除Git历史

## 🔥 重要提醒

### ⚠️ 防火墙配置（必须！）

**云服务器安全组必须开放以下端口：**

| 端口 | 协议 | 用途 |
|------|------|------|
| 5000 | TCP | 前端服务 |
| 5001 | TCP | 后端API |
| 22   | TCP | SSH访问 |

**配置方法：**
1. 登录云服务器控制台（阿里云/腾讯云/AWS等）
2. 找到您的ECS实例
3. 点击"安全组"或"Security Groups"
4. 添加入站规则，授权对象设为 `0.0.0.0/0`

### 📋 部署前检查清单

**服务器要求：**
- [ ] Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- [ ] 内存至少 2GB
- [ ] 磁盘空间至少 5GB
- [ ] 能访问互联网（下载依赖）

**准备工作：**
- [ ] Git仓库地址
- [ ] 服务器SSH访问权限
- [ ] 云服务器安全组已配置

## 🛠️ 手动部署步骤

如果一键脚本失败，可以按照以下步骤手动部署：

### 1. 环境准备
```bash
# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

### 2. 获取代码
```bash
sudo mkdir -p /opt/prodsync
sudo chown $USER:$USER /opt/prodsync
cd /opt/prodsync
git clone YOUR_REPO_URL .
```

### 3. 安装依赖
```bash
# 服务器端
cd /opt/prodsync/server
npm install --production

# 客户端
cd /opt/prodsync/client
npm install
```

### 4. 构建前端
```bash
cd /opt/prodsync/client
npm run build
```

### 5. 初始化数据库
```bash
cd /opt/prodsync/server
node check-db.js
```

### 6. 启动服务
```bash
# 启动后端
cd /opt/prodsync/server
pm2 start npm --name "prodsync-server" -- start

# 启动前端
cd /opt/prodsync/client
HOST=0.0.0.0 PORT=5000 pm2 start npm --name "prodsync-frontend" -- start

# 保存配置
pm2 save
pm2 startup
```

## 🌐 访问应用

部署完成后访问：
- **前端界面**：`http://您的服务器IP:5000`
- **后端API**：`http://您的服务器IP:5001`

**默认管理员账号：**
- 用户名：`admin`
- 密码：`admin123`

## 🔧 常用管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs
pm2 logs prodsync-server
pm2 logs prodsync-frontend

# 重启服务
pm2 restart all
pm2 restart prodsync-server
pm2 restart prodsync-frontend

# 停止服务
pm2 stop all

# 删除服务
pm2 delete all
```

## 🐛 故障排除

### 前端无法访问
1. 检查服务状态：`pm2 status`
2. 检查端口监听：`netstat -tlnp | grep 5000`
3. 检查防火墙：确保安全组开放5000端口
4. 查看日志：`pm2 logs prodsync-frontend`

### 后端API无法访问
1. 检查服务状态：`pm2 status`
2. 测试健康检查：`curl http://localhost:5001/health`
3. 检查数据库：`cd /opt/prodsync/server && node check-db.js`
4. 查看日志：`pm2 logs prodsync-server`

### 内存不足
```bash
# 创建交换空间
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### node_modules问题
```bash
# 清理并重新安装
cd /opt/prodsync
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
cd server && npm install --production
cd ../client && npm install
npm run build
```

## 📞 获取帮助

如果遇到问题：
1. 检查本文档的故障排除部分
2. 查看服务日志：`pm2 logs`
3. 检查系统资源：`free -h` 和 `df -h`
4. 确认防火墙配置

**记住：80%的部署问题都是防火墙/安全组配置导致的！** 