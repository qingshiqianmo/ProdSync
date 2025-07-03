# ProdSync 部署文档

## 🚀 快速部署

### 一键部署（推荐）

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/your-repo/ProdSync/main/server-auto-deploy.sh

# 运行部署
chmod +x server-auto-deploy.sh && ./server-auto-deploy.sh
```

### 部署完成

- 🌐 **访问地址**：http://您的服务器IP:5001
- 👤 **默认账号**：admin / admin123
- 🔑 **重要**：首次登录后请立即修改密码

---

## 🎯 架构说明

### 单服务器架构
```
用户浏览器 → http://服务器IP:5001 → Express服务器
                                       ├── 前端静态文件
                                       └── API服务 (/api/*)
```

### 优势
- ✅ **无CORS问题** - 前后端同域
- ✅ **简化运维** - 一个服务管理
- ✅ **节省资源** - 减少端口和进程
- ✅ **提高安全** - 最小化网络暴露

---

## 📋 部署要求

### 服务器要求
- **操作系统**：Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- **内存**：至少2GB（推荐4GB）
- **磁盘**：至少5GB可用空间
- **权限**：Root或sudo权限

### 网络要求
- **端口开放**：5001（ProdSync系统）、22（SSH）
- **网络连接**：能访问互联网下载依赖

---

## 🔧 手动部署

如果一键脚本失败，可以手动部署：

### 1. 安装环境
```bash
# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 安装PM2
sudo npm install -g pm2
```

### 2. 获取代码
```bash
sudo mkdir -p /opt/prodsync
sudo chown $USER:$USER /opt/prodsync
cd /opt/prodsync
git clone https://github.com/your-repo/ProdSync.git .
```

### 3. 安装依赖
```bash
cd server && npm install --production
cd ../client && npm install
```

### 4. 配置API
```bash
# 配置API为相对路径（避免CORS）
cd client
sed -i "s|process.env.REACT_APP_API_URL || 'http://localhost:5001/api'|'/api'|g" src/services/api.ts
```

### 5. 构建和启动
```bash
# 构建前端
npm run build

# 初始化数据库
cd ../server
node check-db.js

# 启动服务
NODE_ENV=production pm2 start npm --name "prodsync" -- start
pm2 save && pm2 startup
```

---

## 🔥 防火墙配置

### 云服务器安全组
**必须开放端口：**
| 端口 | 协议 | 授权对象 | 描述 |
|------|------|----------|------|
| 5001 | TCP | 0.0.0.0/0 | ProdSync系统 |
| 22 | TCP | 0.0.0.0/0 | SSH访问 |

### 本地防火墙
```bash
sudo ufw allow 5001
sudo ufw allow ssh
sudo ufw enable
```

---

## 🔧 管理命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs prodsync

# 重启服务
pm2 restart prodsync

# 停止服务
pm2 stop prodsync

# 监控资源
pm2 monit
```

---

## 🐛 故障排除

### 无法访问系统
1. 检查服务：`pm2 status`
2. 检查端口：`netstat -tlnp | grep 5001`
3. 检查防火墙：确保安全组开放5001端口

### 登录失败
1. 测试API：`curl http://localhost:5001/api/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'`
2. 检查数据库：`cd /opt/prodsync/server && node check-db.js`

### 内存不足
```bash
# 创建交换空间
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📚 相关文档

- **详细指南**：[deploy/SERVER_DEPLOY_GUIDE.md](deploy/SERVER_DEPLOY_GUIDE.md)
- **快速部署**：[QUICK_DEPLOY.md](QUICK_DEPLOY.md)
- **快速开始**：[QUICK_START.md](QUICK_START.md)

---

## 📞 获取帮助

**部署成功标志：**
- ✅ `pm2 status` 显示prodsync为online
- ✅ 浏览器能访问 http://服务器IP:5001
- ✅ 默认账号能正常登录

**需要帮助时：**
1. 查看日志：`pm2 logs prodsync`
2. 检查资源：`free -h && df -h`
3. 验证端口：`netstat -tlnp | grep 5001`

**记住：现在只需要开放一个端口5001！** 🎉 