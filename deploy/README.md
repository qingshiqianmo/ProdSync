# ProdSync Linux服务器部署指南

## 🚀 一键部署方案

通过GitHub拉取代码，然后执行一键部署脚本，适用于Linux服务器（Ubuntu/CentOS等）。

### 前置要求

1. **Linux服务器**（推荐Ubuntu 20.04+或CentOS 8+）
2. **Node.js 16.0+** 和 **npm 8.0+**
3. **sudo权限**（用于安装系统依赖）
4. **git**（用于拉取代码）

### 快速部署步骤

#### 1. 连接到服务器

```bash
ssh username@110.42.101.114
```

#### 2. 安装Node.js（如果未安装）

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

#### 3. 从GitHub拉取代码

```bash
git clone https://github.com/qingshiqianmo/ProdSync.git
cd ProdSync
```

#### 4. 执行一键部署

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 部署完成后访问

- **前端地址**: http://110.42.101.114
- **API地址**: http://110.42.101.114/api
- **健康检查**: http://110.42.101.114/health

### 默认账户

- **用户名**: `admin`
- **密码**: `admin123`

## 🛠 手动部署步骤

如果自动部署遇到问题，可以按以下步骤手动部署：

### 1. 准备环境

```bash
# 更新系统
sudo apt-get update

# 安装构建依赖
sudo apt-get install -y build-essential python3 git curl wget

# 安装PM2进程管理器
sudo npm install -g pm2
```

### 2. 安装项目依赖

```bash
# 安装根目录依赖
npm install

# 安装服务端依赖
cd server && npm install && cd ..

# 安装并构建前端
cd client && npm install && npm run build && cd ..
```

### 3. 配置环境变量

```bash
# 创建生产环境配置
cat > .env.production << EOF
NODE_ENV=production
PORT=5001
JWT_SECRET=$(openssl rand -base64 32)
CLIENT_URL=http://110.42.101.114:5000
SERVER_URL=http://110.42.101.114:5001
EOF
```

### 4. 启动服务

```bash
# 使用PM2启动
pm2 start server/src/simple-server-v3.js --name prodsync-server --env production

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

## 🌐 Nginx配置（推荐）

### 安装Nginx

```bash
sudo apt-get install -y nginx
```

### 配置Nginx

```bash
# 创建配置文件
sudo tee /etc/nginx/sites-available/prodsync << EOF
server {
    listen 80;
    server_name 110.42.101.114;
    
    # 前端静态文件
    location / {
        root /path/to/ProdSync/client/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/prodsync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 服务管理

### PM2常用命令

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

# 监控服务
pm2 monit
```

### 应用管理

```bash
# 重置管理员密码
npm run reset-admin

# 检查数据库
node server/check-db.js

# 查看系统资源
pm2 monit
```

## 🔧 故障排除

### 常见问题

#### 1. 端口被占用

```bash
# 查看端口占用
sudo lsof -i :5001
sudo lsof -i :80

# 停止占用端口的进程
sudo fuser -k 5001/tcp
```

#### 2. 权限问题

```bash
# 修改文件权限
chmod +x deploy/deploy.sh
sudo chown -R $USER:$USER /path/to/ProdSync
```

#### 3. 内存不足

```bash
# 检查内存使用
free -h
df -h

# 创建交换空间（如果需要）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. Node.js版本问题

```bash
# 检查版本
node -v
npm -v

# 升级Node.js
sudo npm install -g n
sudo n stable
```

### 日志文件位置

- **应用日志**: `./logs/`
- **PM2日志**: `~/.pm2/logs/`
- **Nginx日志**: `/var/log/nginx/`
- **系统日志**: `/var/log/syslog`

## 🔒 安全建议

### 1. 修改默认密码

部署完成后立即修改管理员密码：

```bash
npm run reset-admin
```

### 2. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (如果需要)
sudo ufw enable
```

### 3. 启用HTTPS（推荐）

```bash
# 安装Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com
```

### 4. 定期备份

```bash
# 备份数据库
cp server/data/prod_sync.db backups/prod_sync_$(date +%Y%m%d_%H%M%S).db

# 自动备份脚本
cat > backup.sh << EOF
#!/bin/bash
cp server/data/prod_sync.db backups/prod_sync_\$(date +%Y%m%d_%H%M%S).db
find backups/ -name "*.db" -mtime +7 -delete
EOF

chmod +x backup.sh

# 添加到定时任务
crontab -e
# 添加: 0 2 * * * /path/to/ProdSync/backup.sh
```

## 📞 技术支持

如果遇到部署问题，请检查：

1. **系统要求**: Node.js 16.0+, npm 8.0+
2. **端口占用**: 5001端口是否被占用
3. **权限问题**: 是否有足够的文件读写权限
4. **网络连接**: 服务器是否能正常访问外网

更多技术支持请联系开发团队。 