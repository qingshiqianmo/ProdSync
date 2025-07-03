# ProdSync 快速部署指南

## 🚀 一键部署（推荐）

适用于Linux服务器（Ubuntu/CentOS/Debian）的快速部署方案。

### 前置条件

- ✅ Linux服务器（Ubuntu 18.04+）
- ✅ Root或sudo权限
- ✅ 至少2GB内存（推荐4GB）
- ✅ 互联网连接

### 一键命令

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/your-repo/ProdSync/main/server-auto-deploy.sh

# 添加执行权限并运行
chmod +x server-auto-deploy.sh && ./server-auto-deploy.sh
```

### 部署完成后

🎉 **访问系统：** http://您的服务器IP:5001

👤 **默认账号：**
- 用户名：`admin`
- 密码：`admin123`

---

## 🔥 重要配置

### 1. 开放端口

**⚠️ 必须配置云服务器安全组开放端口：**

| 端口 | 协议 | 授权对象 | 用途 |
|------|------|----------|------|
| 5001 | TCP | 0.0.0.0/0 | ProdSync系统 |
| 22 | TCP | 0.0.0.0/0 | SSH访问 |

**配置位置：**
- 阿里云：控制台 → ECS → 安全组
- 腾讯云：控制台 → CVM → 安全组
- AWS：控制台 → EC2 → Security Groups

### 2. 首次登录

1. 浏览器访问：`http://您的服务器IP:5001`
2. 使用默认账号登录：`admin` / `admin123`
3. **立即修改密码！**

---

## 📋 手动快速部署

如果一键脚本失败，可以手动执行：

### 步骤1：安装基础环境

```bash
# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 安装PM2
sudo npm install -g pm2
```

### 步骤2：获取代码

```bash
# 创建部署目录
sudo mkdir -p /opt/prodsync
sudo chown $USER:$USER /opt/prodsync
cd /opt/prodsync

# 克隆项目
git clone https://github.com/your-repo/ProdSync.git .
```

### 步骤3：配置和构建

```bash
# 安装依赖
cd server && npm install --production
cd ../client && npm install

# 配置API为相对路径（避免CORS）
sed -i "s|process.env.REACT_APP_API_URL || 'http://localhost:5001/api'|'/api'|g" src/services/api.ts

# 构建前端
npm run build
```

### 步骤4：启动服务

```bash
# 初始化数据库
cd ../server
node check-db.js

# 启动服务（生产模式）
NODE_ENV=production pm2 start npm --name "prodsync" -- start

# 保存配置
pm2 save && pm2 startup
```

---

## 🔧 常用管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs prodsync

# 重启服务
pm2 restart prodsync

# 停止服务
pm2 stop prodsync
```

---

## 📦 离线部署

如果服务器无法访问GitHub，可以使用离线包：

### 1. 本地打包

```bash
# 在有网络的机器上执行
git clone https://github.com/your-repo/ProdSync.git
cd ProdSync

# 清理并打包
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
tar -czf prodsync-deploy.tar.gz --exclude='.git' .
```

### 2. 上传部署

```bash
# 上传到服务器
scp prodsync-deploy.tar.gz user@server:/tmp/

# 在服务器上解压
sudo mkdir -p /opt/prodsync
sudo tar -xzf /tmp/prodsync-deploy.tar.gz -C /opt/prodsync
sudo chown -R $USER:$USER /opt/prodsync

# 按手动部署步骤继续...
```

---

## 🐛 常见问题

### Q: 无法访问系统？
**A:** 检查以下项：
1. 安全组是否开放5001端口
2. 服务是否正常运行：`pm2 status`
3. 端口是否监听：`netstat -tlnp | grep 5001`

### Q: 登录提示错误？
**A:** 检查API连接：
```bash
curl http://localhost:5001/api/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Q: 内存不足构建失败？
**A:** 创建交换空间：
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Q: 需要更新代码？
**A:** 重新部署：
```bash
cd /opt/prodsync
git pull origin main
cd client && npm run build
pm2 restart prodsync
```

---

## 🎯 架构优势

**单服务器模式的优势：**
- ✅ **无CORS问题** - 前后端同域
- ✅ **简化运维** - 一个服务管理
- ✅ **节省资源** - 减少端口和进程
- ✅ **提高安全** - 最小化网络暴露

**系统架构：**
```
用户 → http://IP:5001 → Express服务器
                           ├── 静态文件（前端）
                           └── API服务（/api/*）
```

---

## 📞 技术支持

**部署成功标志：**
- ✅ `pm2 status` 显示prodsync服务为online
- ✅ `curl http://localhost:5001` 返回HTML页面
- ✅ 浏览器能访问并登录系统

**获取帮助：**
1. 查看详细日志：`pm2 logs prodsync`
2. 检查系统资源：`free -h && df -h`
3. 验证端口开放：`netstat -tlnp | grep 5001`

**记住：现在只需要一个端口5001！** 🎉 