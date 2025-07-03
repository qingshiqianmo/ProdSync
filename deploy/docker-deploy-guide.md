# ProdSync Docker 部署指南 🐳

## 目录
- [前提条件](#前提条件)
- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [管理容器](#管理容器)
- [常见问题](#常见问题)
- [监控和维护](#监控和维护)

## 前提条件

### 1. 服务器要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+ / CentOS 8+)
- **内存**: 最少 1GB，推荐 2GB+
- **存储**: 最少 5GB 可用空间
- **网络**: 需要开放 5001 端口

### 2. 软件要求
- **Docker**: 20.10.0+
- **Docker Compose**: 1.29.0+

### 3. 安装Docker (如果未安装)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 快速部署

### 1. 清理旧安装
```bash
# 停止可能运行的服务
sudo pkill -f "node.*5000" 2>/dev/null || true
sudo pkill -f "node.*5001" 2>/dev/null || true
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 删除旧的项目目录
sudo rm -rf /opt/prodsync
```

### 2. 克隆项目
```bash
# 克隆到服务器
git clone https://github.com/qingshiqianmo/ProdSync.git /opt/prodsync
cd /opt/prodsync

# 给部署脚本执行权限
chmod +x deploy/docker-deploy.sh
```

### 3. 一键部署
```bash
# 运行部署脚本
./deploy/docker-deploy.sh
```

## 手动部署

### 1. 准备项目
```bash
cd /opt/prodsync
```

### 2. 构建镜像
```bash
# 构建Docker镜像
docker-compose build --no-cache
```

### 3. 启动服务
```bash
# 启动容器
docker-compose up -d
```

### 4. 验证部署
```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 检查服务
curl http://localhost:5001/health
```

## 管理容器

### 基本命令
```bash
# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新并重启
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 进入容器
```bash
# 进入应用容器
docker-compose exec prodsync sh

# 查看容器内文件
docker-compose exec prodsync ls -la
```

### 数据备份
```bash
# 备份数据库
docker-compose exec prodsync cp /app/server/data/prodsync.db /app/server/data/prodsync.db.backup

# 从主机复制备份
docker cp prodsync-app:/app/server/data/prodsync.db.backup ./backup-$(date +%Y%m%d).db
```

## 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
ss -tlnp | grep :5001

# 杀死占用进程
sudo pkill -f "node.*5001"
```

### 2. 容器无法启动
```bash
# 查看详细日志
docker-compose logs prodsync

# 检查镜像
docker images | grep prodsync

# 重新构建
docker-compose build --no-cache
```

### 3. 无法访问服务
```bash
# 检查防火墙
sudo ufw status
sudo ufw allow 5001

# 或者 CentOS/RHEL
sudo firewall-cmd --add-port=5001/tcp --permanent
sudo firewall-cmd --reload
```

### 4. 数据丢失
```bash
# 检查数据卷
docker-compose exec prodsync ls -la /app/server/data/

# 恢复备份
docker-compose exec prodsync cp /app/server/data/prodsync.db.backup /app/server/data/prodsync.db
docker-compose restart
```

## 监控和维护

### 健康检查
```bash
# 手动健康检查
curl -f http://localhost:5001/health && echo "服务正常" || echo "服务异常"

# 查看容器健康状态
docker-compose ps
```

### 性能监控
```bash
# 查看资源使用
docker stats prodsync-app

# 查看容器进程
docker-compose exec prodsync ps aux
```

### 日志管理
```bash
# 查看最新日志
docker-compose logs --tail=50 prodsync

# 清理日志
docker-compose down
docker system prune -f
docker-compose up -d
```

### 自动备份脚本
```bash
#!/bin/bash
# backup-prodsync.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/prodsync-backups"
mkdir -p $BACKUP_DIR

# 备份数据库
docker cp prodsync-app:/app/server/data/prodsync.db $BACKUP_DIR/prodsync_$DATE.db

# 清理7天前的备份
find $BACKUP_DIR -name "prodsync_*.db" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/prodsync_$DATE.db"
```

## 配置文件说明

### docker-compose.yml
- **端口映射**: 5001:5001
- **数据卷**: 持久化数据库和日志
- **健康检查**: 自动检测服务状态
- **重启策略**: 自动重启

### Dockerfile
- **基础镜像**: Node.js 18 Alpine
- **生产优化**: 多阶段构建
- **安全配置**: 非root用户运行
- **体积优化**: 精简依赖

## 默认配置

- **访问地址**: http://服务器IP:5001
- **管理员账号**: admin
- **管理员密码**: admin123
- **数据存储**: ./server/data/prodsync.db

## 更新部署

```bash
# 拉取最新代码
cd /opt/prodsync
git pull origin main

# 重新部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 支持

如果遇到问题，请检查：
1. Docker和Docker Compose版本
2. 防火墙设置
3. 端口占用情况
4. 容器日志信息

---

**注意**: 生产环境使用前请修改默认管理员密码！ 