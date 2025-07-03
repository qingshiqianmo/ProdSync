# ProdSync 服务器部署指南

## 服务器信息
- **IP地址**: 110.42.101.114
- **系统**: Ubuntu 24.04.1 LTS
- **部署时间**: $(date)

## 🚀 快速部署步骤

### 1. 连接服务器并准备环境

```bash
# 切换到工作目录
cd /opt

# 创建项目目录
sudo mkdir -p prodsync
sudo chown $(whoami):$(whoami) prodsync
cd prodsync

# 更新系统
sudo apt update && sudo apt upgrade -y
```

### 2. 安装Node.js和必需工具

```bash
# 安装Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装其他必需工具
sudo apt-get install -y build-essential python3 git curl wget

# 安装PM2进程管理器
sudo npm install -g pm2

# 验证安装
node --version
npm --version
pm2 --version
```

### 3. 下载项目文件

**方案A: 如果服务器能访问GitHub**
```bash
git clone https://github.com/YOUR_USERNAME/ProdSync.git .
```

**方案B: 手动上传文件（推荐）**
由于网络问题，建议手动上传项目文件：

1. 在本地电脑上压缩ProdSync项目
2. 使用SCP或SFTP上传到服务器
3. 解压文件

```bash
# 如果文件已上传，解压
unzip prodsync.zip
# 或者
tar -xzf prodsync.tar.gz
```

### 4. 安装依赖

```bash
# 确保在项目根目录
cd /opt/prodsync

# 安装根目录依赖
npm install

# 安装服务器依赖
cd server
npm install
cd ..

# 安装客户端依赖并构建
cd client
npm install
npm run build
cd ..
```

### 5. 初始化数据库

```bash
# 创建数据目录
mkdir -p server/data
mkdir -p logs

# 初始化数据库
cd server
node src/database-v3.js
cd ..
```

### 6. 配置生产环境

```bash
# 创建环境配置文件
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=5001
JWT_SECRET=$(openssl rand -base64 32)
CLIENT_URL=http://110.42.101.114:5000
SERVER_URL=http://110.42.101.114:5001
DB_FILE=./server/data/prod_sync.db
LOG_LEVEL=info
EOF

# 创建PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'prodsync-server',
      script: 'server/src/simple-server-v3.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
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
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'server/data'
      ]
    },
    {
      name: 'prodsync-frontend',
      script: 'npx',
      args: 'serve -s client/build -l 5000',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

# 安装serve包用于前端静态文件服务
npm install -g serve
```

### 7. 启动服务

```bash
# 停止可能存在的进程
pm2 stop all
pm2 delete all

# 启动服务
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
# 执行上面命令输出的命令

# 查看服务状态
pm2 status
pm2 logs
```

### 8. 配置防火墙

```bash
# 允许必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 5000  # 前端
sudo ufw allow 5001  # 后端

# 启用防火墙（可选）
sudo ufw --force enable
sudo ufw status
```

### 9. 验证部署

```bash
# 检查端口
netstat -tlnp | grep -E ':(5000|5001)'

# 测试后端API
curl -X GET http://localhost:5001/health

# 测试前端
curl -X GET http://localhost:5000
```

## 🌐 访问地址

部署成功后：
- **前端地址**: http://110.42.101.114:5000
- **后端API**: http://110.42.101.114:5001
- **健康检查**: http://110.42.101.114:5001/health

## 👤 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 生产调度员 | scheduler01 | test123 |
| 生产领导 | leader01 | test123 |

## 🔧 常用命令

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

# 停止服务
pm2 stop all

# 查看系统资源
pm2 monit

# 重置管理员密码
cd /opt/prodsync/server
npm run reset-admin
```

## 🚨 故障排除

### 服务无法启动
```bash
# 检查日志
pm2 logs

# 检查端口占用
netstat -tlnp | grep -E ':(5000|5001)'

# 手动启动测试
cd /opt/prodsync
node server/src/simple-server-v3.js
```

### 前端无法访问
```bash
# 检查静态文件
ls -la client/build/

# 重新构建前端
cd client
npm run build
cd ..
pm2 restart prodsync-frontend
```

### 数据库问题
```bash
# 重新初始化数据库
cd server
node src/database-v3.js
```

## 📞 技术支持

如遇问题，请提供：
1. PM2日志：`pm2 logs`
2. 系统状态：`pm2 status`
3. 错误信息截图 