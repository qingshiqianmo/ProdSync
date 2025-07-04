# ProdSync 快速重新部署指南

## 🚀 服务器重新部署（110.42.101.114）

### 一键重新部署命令

```bash
# 1. 下载重新部署脚本
curl -O https://raw.githubusercontent.com/qingshiqianmo/ProdSync/main/deploy/redeploy.sh

# 2. 添加执行权限
chmod +x redeploy.sh

# 3. 运行重新部署脚本
./redeploy.sh
```

### 脚本功能说明

重新部署脚本会自动执行以下操作：

1. **停止现有服务**
   - 检查并停止现有的ProdSync服务
   - 删除PM2中的旧进程

2. **备份现有部署**
   - 将现有部署备份到带时间戳的目录
   - 删除旧的部署目录

3. **获取最新代码**
   - 从GitHub克隆最新代码
   - 清理所有node_modules目录

4. **安装依赖**
   - 安装服务器端依赖（仅生产环境）
   - 安装客户端依赖

5. **配置生产环境**
   - 修改API地址为相对路径（避免CORS问题）
   - 创建交换空间（如果内存不足）

6. **构建和启动**
   - 构建前端项目
   - 初始化数据库
   - 启动新的ProdSync服务

### 手动部署步骤（如果需要）

如果自动脚本出现问题，可以手动执行以下步骤：

#### 1. 停止现有服务
```bash
# 查看现有服务
pm2 list

# 停止ProdSync服务
pm2 stop prodsync
pm2 delete prodsync
```

#### 2. 备份和清理
```bash
# 备份现有部署
sudo cp -r /opt/prodsync /opt/prodsync-backup-$(date +%Y%m%d-%H%M%S)

# 删除现有部署
sudo rm -rf /opt/prodsync
```

#### 3. 重新部署
```bash
# 创建部署目录
sudo mkdir -p /opt/prodsync
sudo chown $USER:$USER /opt/prodsync

# 克隆最新代码
cd /opt/prodsync
git clone https://github.com/qingshiqianmo/ProdSync.git .

# 清理node_modules
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# 安装依赖
cd /opt/prodsync/server
npm install --production

cd /opt/prodsync/client
npm install

# 配置API地址
sed -i "s|process.env.REACT_APP_API_URL || 'http://localhost:5001/api'|'/api'|g" src/services/api.ts

# 构建前端
npm run build

# 初始化数据库
cd /opt/prodsync/server
node check-db.js

# 启动服务
NODE_ENV=production pm2 start npm --name "prodsync" -- start
pm2 save
```

### 访问信息

- **系统地址**: http://110.42.101.114:5001
- **API地址**: http://110.42.101.114:5001/api

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 系统管理员 | admin | admin123 |
| 生产调度员 | scheduler01 | test123 |
| 生产所领导 | leader01 | test123 |
| 职员 | staff01 | test123 |

### 服务管理命令

```bash
# 查看服务状态
pm2 list

# 查看日志
pm2 logs prodsync

# 重启服务
pm2 restart prodsync

# 停止服务
pm2 stop prodsync

# 删除服务
pm2 delete prodsync
```

### 故障排除

#### 1. 端口占用问题
```bash
# 查看端口占用
sudo netstat -tulpn | grep :5001

# 杀死占用端口的进程
sudo kill -9 <PID>
```

#### 2. 权限问题
```bash
# 确保部署目录权限正确
sudo chown -R $USER:$USER /opt/prodsync
```

#### 3. 内存不足
```bash
# 检查内存使用
free -h

# 创建交换空间
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. 防火墙问题
```bash
# 检查防火墙状态
sudo ufw status

# 开放端口
sudo ufw allow 5001
```

### 注意事项

1. **生产环境配置**: 脚本会自动将API地址配置为相对路径，确保前后端集成
2. **数据备份**: 每次重新部署都会自动备份现有部署
3. **服务启动**: 使用PM2管理服务，确保服务稳定运行
4. **内存管理**: 如果服务器内存不足，会自动创建交换空间

### 完成后验证

1. 访问 http://110.42.101.114:5001 确认系统正常运行
2. 使用默认账号登录测试功能
3. 检查PM2服务状态：`pm2 list`
4. 查看服务日志：`pm2 logs prodsync`

如果遇到任何问题，请查看服务日志进行排查。 