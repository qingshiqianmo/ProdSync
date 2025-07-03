# ProdSync 服务器端部署指南

## 🚀 一键部署脚本

### 快速部署命令

```bash
# 下载并运行一键部署脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/ProdSync/main/deploy/server-auto-deploy.sh | bash
```

---

## 📋 手动部署步骤

### 前置要求

**系统要求：**
- Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- 内存：至少2GB（推荐4GB）
- 磁盘：至少5GB可用空间

**必需软件：**
- Node.js 16+ (推荐18+)
- npm 8+
- git
- PM2 (进程管理器)

### 步骤1：环境检查

```bash
# 检查Node.js版本
node --version
npm --version

# 如果未安装，使用以下命令安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

### 步骤2：获取项目代码

```bash
# 创建部署目录
sudo mkdir -p /opt/prodsync
sudo chown $USER:$USER /opt/prodsync
cd /opt/prodsync

# 克隆项目（确保不包含node_modules）
git clone https://github.com/your-repo/ProdSync.git .

# ⚠️ 重要：确保没有node_modules目录
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
```

### 步骤3：安装依赖

```bash
# 安装服务器端依赖
cd /opt/prodsync/server
npm install --production

# 安装客户端依赖
cd /opt/prodsync/client
npm install
```

### 步骤4：构建前端

```bash
cd /opt/prodsync/client

# 如果内存不足，创建交换空间
if [ $(free -m | awk 'NR==2{printf "%.0f", $7*100/$2}') -lt 30 ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 构建前端项目
npm run build
```

### 步骤5：初始化数据库

```bash
cd /opt/prodsync/server
node check-db.js
```

### 步骤6：启动服务

```bash
# 启动后端服务
cd /opt/prodsync/server
pm2 start npm --name "prodsync-server" -- start

# 启动前端服务
cd /opt/prodsync/client
HOST=0.0.0.0 PORT=5000 pm2 start npm --name "prodsync-frontend" -- start

# 保存PM2配置
pm2 save
pm2 startup
```

---

## 🔥 防火墙配置（重要！）

### 阿里云/腾讯云安全组配置

**必须在云服务器控制台配置安全组规则：**

1. **登录云服务器控制台**
2. **找到您的ECS实例**
3. **点击"安全组"**
4. **添加入站规则：**

| 端口范围 | 协议类型 | 授权对象 | 描述 |
|---------|---------|----------|------|
| 5000/5000 | TCP | 0.0.0.0/0 | ProdSync前端 |
| 5001/5001 | TCP | 0.0.0.0/0 | ProdSync后端API |
| 22/22 | TCP | 0.0.0.0/0 | SSH访问 |

### 服务器本地防火墙

```bash
# 检查防火墙状态
sudo ufw status

# 如果启用了防火墙，需要开放端口
sudo ufw allow 5000
sudo ufw allow 5001
sudo ufw allow ssh

# 重新加载防火墙
sudo ufw reload
```

---

## 📦 打包注意事项

### ⚠️ 关键注意事项

**1. node_modules目录**
```bash
# 打包前必须删除所有node_modules
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# 特别检查这些位置：
rm -rf node_modules/
rm -rf client/node_modules/
rm -rf server/node_modules/
rm -rf prodsync-deploy/node_modules/
rm -rf prodsync-deploy/client/node_modules/
rm -rf prodsync-deploy/server/node_modules/
```

**2. 环境文件**
```bash
# 不要包含敏感信息的环境文件
rm -f .env
rm -f server/.env
rm -f client/.env
```

---

## 🌐 访问应用

部署成功后，可以通过以下方式访问：

- **前端界面**：http://您的服务器IP:5000
- **后端API**：http://您的服务器IP:5001

**默认管理员账号：**
- 用户名：`admin`
- 密码：`admin123`

---

## 🔧 故障排除

### 前端无法访问

1. **检查服务状态**：`pm2 status`
2. **检查端口监听**：`netstat -tlnp | grep 5000`
3. **检查防火墙**：确保安全组和本地防火墙开放5000端口
4. **查看日志**：`pm2 logs prodsync-frontend`

### 后端API无法访问

1. **检查服务状态**：`pm2 status`
2. **检查数据库**：`cd /opt/prodsync/server && node check-db.js`
3. **测试健康检查**：`curl http://localhost:5001/health`
4. **查看日志**：`pm2 logs prodsync-server` 