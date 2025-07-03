# ProdSync 服务器端部署指南

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

### 步骤4：配置生产环境API

```bash
cd /opt/prodsync/client

# ⚠️ 重要：备份原配置文件
cp src/services/api.ts src/services/api.ts.backup

# ⚠️ 关键步骤：配置API为相对路径（避免CORS问题）
sed -i "s|process.env.REACT_APP_API_URL || 'http://localhost:5001/api'|'/api'|g" src/services/api.ts

# 验证修改结果
echo "API地址已配置为相对路径:"
grep "API_BASE_URL" src/services/api.ts
```

### 步骤5：构建前端

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

### 步骤6：初始化数据库

```bash
cd /opt/prodsync/server
node check-db.js
```

### 步骤7：启动服务

```bash
# 以生产模式启动ProdSync（前后端集成）
cd /opt/prodsync/server
NODE_ENV=production pm2 start npm --name "prodsync" -- start

# 保存PM2配置并设置开机自启
pm2 save
pm2 startup
```

---

## 🔥 防火墙配置（重要！）

### 云服务器安全组配置

**只需要开放一个端口：**

| 端口 | 协议 | 授权对象 | 描述 |
|------|------|----------|------|
| 5001 | TCP | 0.0.0.0/0 | ProdSync系统 |
| 22 | TCP | 0.0.0.0/0 | SSH访问 |

**配置方法：**
1. 登录云服务器控制台（阿里云/腾讯云/AWS等）
2. 找到您的ECS实例
3. 点击"安全组"或"Security Groups"
4. 添加入站规则，授权对象设为 `0.0.0.0/0`

### 服务器本地防火墙

```bash
# 检查防火墙状态
sudo ufw status

# 如果启用了防火墙，需要开放端口
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

- **ProdSync系统**：http://您的服务器IP:5001
- **API接口**：http://您的服务器IP:5001/api

**默认管理员账号：**
- 用户名：`admin`
- 密码：`admin123`

---

## 🔧 服务管理

### 常用管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs prodsync

# 重启服务
pm2 restart prodsync

# 停止服务
pm2 stop prodsync

# 删除服务
pm2 delete prodsync
```

### 查看系统信息

```bash
# 查看端口监听
netstat -tlnp | grep 5001

# 查看系统资源
free -h
df -h

# 查看服务详情
pm2 show prodsync
```

---

## 🐛 故障排除

### 无法访问系统

1. **检查服务状态**：`pm2 status`
2. **检查端口监听**：`netstat -tlnp | grep 5001`
3. **检查防火墙**：确保安全组开放5001端口
4. **查看日志**：`pm2 logs prodsync`

### 登录失败

1. **检查数据库**：`cd /opt/prodsync/server && node check-db.js`
2. **测试API**：`curl http://localhost:5001/api/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'`
3. **查看浏览器开发者工具**：F12 → Network标签

### 内存不足

```bash
# 创建交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 重新构建

```bash
# 如果需要更新代码
cd /opt/prodsync
git pull origin main

# 重新构建前端
cd client
npm run build

# 重启服务
pm2 restart prodsync
```

---

## 🎯 架构说明

**单服务器架构优势：**
- ✅ **无CORS问题** - 前后端在同一域名下
- ✅ **简化部署** - 只需管理一个服务
- ✅ **节省资源** - 减少端口和进程数量
- ✅ **提高安全性** - 减少暴露的网络端口

**工作原理：**
```
用户浏览器
    ↓
http://服务器IP:5001
    ↓
Express服务器
├── 静态文件服务 (React前端)
└── API服务 (/api/*)
```

---

## 📞 获取帮助

如果遇到问题：
1. 检查本文档的故障排除部分
2. 查看服务日志：`pm2 logs prodsync`
3. 检查系统资源：`free -h` 和 `df -h`
4. 确认防火墙配置

**记住：现在只需要开放5001端口！** 