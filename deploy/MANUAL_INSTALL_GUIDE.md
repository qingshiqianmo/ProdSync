# 🚀 ProdSync Linux服务器手动安装指南

## 📋 概述

由于GitHub网络问题，无法直接从远程仓库拉取代码，因此提供手动安装方案。

## 📦 准备工作

### 1. 准备文件

将整个ProdSync项目文件夹上传到Linux服务器，包含以下重要文件：

```
ProdSync/
├── package.json                    # 根配置文件
├── README.md                       # 项目说明
├── server/                         # 后端文件
│   ├── src/
│   │   ├── database-v3.js         # 数据库初始化
│   │   └── simple-server-v3.js    # 主服务器
│   ├── package.json               # 服务端依赖
│   └── reset-admin-password.js    # 重置密码工具
├── client/                         # 前端文件
│   ├── src/                       # 源代码
│   ├── public/                    # 静态资源
│   ├── package.json               # 客户端依赖
│   └── tsconfig.json              # TypeScript配置
├── deploy/                         # 部署脚本
│   ├── manual-install.sh          # 手动安装脚本
│   ├── update.sh                  # 更新脚本
│   ├── monitor.sh                 # 监控脚本
│   └── README.md                  # 部署文档
└── scripts/                       # 启动脚本
    ├── start.js
    ├── stop.js
    └── install.js
```

### 2. 文件传输方式

可以使用以下任一方式上传文件：

**方式A：SCP传输**
```bash
# 从本地上传到服务器
scp -r ./ProdSync username@110.42.101.114:/home/username/
```

**方式B：压缩包传输**
```bash
# 本地打包
tar -czf ProdSync.tar.gz ProdSync/

# 上传并解压
scp ProdSync.tar.gz username@110.42.101.114:/home/username/
ssh username@110.42.101.114
tar -xzf ProdSync.tar.gz
```

**方式C：SFTP工具**
使用FileZilla、WinSCP等工具直接上传整个文件夹

## 🛠 安装步骤

### 1. 连接服务器

```bash
ssh username@110.42.101.114
```

### 2. 检查系统环境

```bash
# 检查Node.js
node -v
npm -v

# 如果没有安装Node.js，执行：
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL:
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 3. 进入项目目录

```bash
cd ProdSync
```

### 4. 执行自动安装脚本

```bash
# 给脚本执行权限
chmod +x deploy/manual-install.sh

# 运行安装脚本
./deploy/manual-install.sh
```

## 🔧 手动安装步骤（如果脚本失败）

### 1. 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential python3 git curl wget

# CentOS/RHEL
sudo yum update -y
sudo yum install -y gcc-c++ make python3 git curl wget

# 安装PM2进程管理器
sudo npm install -g pm2
```

### 2. 创建必要目录

```bash
mkdir -p logs
mkdir -p server/data
mkdir -p backups
```

### 3. 安装项目依赖

```bash
# 安装根目录依赖
npm install

# 安装服务端依赖
cd server
npm install
cd ..

# 安装客户端依赖并构建
cd client
npm install
npm run build
cd ..
```

### 4. 初始化数据库

```bash
cd server
node src/database-v3.js
cd ..
```

### 5. 配置环境变量

```bash
# 获取服务器IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# 创建生产环境配置
cat > .env.production << EOF
NODE_ENV=production
PORT=5001
JWT_SECRET=$(openssl rand -base64 32)
CLIENT_URL=http://$SERVER_IP:5000
SERVER_URL=http://$SERVER_IP:5001
DB_FILE=./server/data/prod_sync.db
LOG_LEVEL=info
EOF
```

### 6. 配置PM2

```bash
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'prodsync-server',
      script: 'server/src/simple-server-v3.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        JWT_SECRET: process.env.JWT_SECRET || 'production-secret-key',
        CLIENT_URL: 'http://110.42.101.114:5000'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false
    }
  ]
};
EOF
```

### 7. 启动服务

```bash
# 启动PM2服务
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

## 🌐 配置Nginx（可选但推荐）

### 1. 安装Nginx

```bash
# Ubuntu/Debian
sudo apt-get install -y nginx

# CentOS/RHEL
sudo yum install -y nginx
```

### 2. 配置Nginx

```bash
# 创建配置文件
sudo tee /etc/nginx/sites-available/prodsync << EOF
server {
    listen 80;
    server_name 110.42.101.114;
    
    # 前端静态文件
    location / {
        root $(pwd)/client/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:5001;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/prodsync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## ✅ 验证安装

### 1. 检查服务状态

```bash
# 查看PM2服务状态
pm2 status

# 查看端口监听
sudo netstat -tlnp | grep -E ":5001|:80"

# 查看服务日志
pm2 logs prodsync-server
```

### 2. 测试访问

```bash
# 测试API健康检查
curl http://localhost:5001/health

# 测试前端页面（如果配置了Nginx）
curl http://localhost/
```

### 3. 浏览器访问

- **直接访问API**: http://110.42.101.114:5001/health
- **通过Nginx访问**: http://110.42.101.114

## 🎯 访问系统

安装完成后：

- **系统地址**: http://110.42.101.114
- **管理员账户**: admin / admin123

⚠️ **重要**: 首次登录后请立即修改管理员密码！

## 📊 日常管理

### 服务管理

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs prodsync-server

# 重启服务
pm2 restart prodsync-server

# 停止服务
pm2 stop prodsync-server

# 删除服务
pm2 delete prodsync-server
```

### 监控服务

```bash
# 运行监控脚本
chmod +x deploy/monitor.sh
./deploy/monitor.sh

# 查看系统资源
pm2 monit
```

### 更新系统

```bash
# 如果有代码更新，重新上传文件后：
chmod +x deploy/update.sh
./deploy/update.sh
```

### 数据库管理

```bash
# 重置管理员密码
node server/reset-admin-password.js

# 备份数据库
cp server/data/prod_sync.db backups/prod_sync_$(date +%Y%m%d_%H%M%S).db
```

## 🔧 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   sudo fuser -k 5001/tcp
   sudo fuser -k 80/tcp
   ```

2. **权限问题**
   ```bash
   chmod +x deploy/manual-install.sh
   sudo chown -R $USER:$USER /path/to/ProdSync
   ```

3. **依赖安装失败**
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

4. **数据库问题**
   ```bash
   cd server
   node src/database-v3.js
   ```

5. **内存不足**
   ```bash
   # 创建swap空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### 日志位置

- **应用日志**: `./logs/`
- **PM2日志**: `~/.pm2/logs/`
- **Nginx日志**: `/var/log/nginx/`
- **系统日志**: `/var/log/syslog`

## 🔒 安全建议

1. **修改默认密码**: 使用重置密码功能修改admin账户密码
2. **配置防火墙**: 只开放必要端口（22, 80, 443）
3. **启用HTTPS**: 生产环境建议使用SSL证书
4. **定期备份**: 定期备份数据库文件
5. **监控资源**: 定期检查服务器资源使用情况

## 📞 技术支持

如果遇到安装问题：

1. 检查Node.js版本是否 >= 16.0.0
2. 确认所有文件权限正确
3. 查看PM2和应用日志
4. 检查端口是否被占用
5. 验证系统资源是否充足

---

🎉 **祝您部署成功！** 