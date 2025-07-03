# 🚀 ProdSync 服务器部署总结

## 🎯 部署目标
将ProdSync生产项目管理系统部署到Linux服务器：**110.42.101.114**

## 📦 部署文件说明

### 核心部署文件
- `deploy/deploy.sh` - 一键部署脚本（首次部署）
- `deploy/update.sh` - 更新部署脚本（后续更新）
- `deploy/monitor.sh` - 服务监控脚本
- `deploy/README.md` - 详细部署指南
- `deploy/quick-deploy.md` - 快速部署指令

### 配置文件
- `.gitignore` - 已更新，忽略生产环境敏感文件
- `README.md` - 已添加Linux部署章节

## 🚀 一键部署步骤

### 1. 连接服务器
```bash
ssh username@110.42.101.114
```

### 2. 安装Node.js（如需要）
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs

# CentOS/RHEL  
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo yum install -y nodejs
```

### 3. 克隆并部署
```bash
git clone https://github.com/qingshiqianmo/ProdSync.git
cd ProdSync
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## 📊 部署后管理

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
```

### 系统监控
```bash
# 系统监控
chmod +x deploy/monitor.sh && ./deploy/monitor.sh

# 连续监控
./deploy/monitor.sh --continuous
```

### 系统更新
```bash
# 更新到最新版本
chmod +x deploy/update.sh && ./deploy/update.sh

# 重置管理员密码
npm run reset-admin
```

## 🌐 访问信息

- **前端地址**: http://110.42.101.114
- **API地址**: http://110.42.101.114/api  
- **健康检查**: http://110.42.101.114/health

### 默认账户
- **用户名**: admin
- **密码**: admin123

⚠️ **重要**: 首次登录后请立即修改管理员密码！

## 🔧 部署架构

```
Internet
    ↓
Nginx (Port 80)
    ↓
ProdSync API (Port 5001)
    ↓
SQLite Database
```

### 技术栈
- **前端**: React + Ant Design (静态文件)
- **后端**: Node.js + Express + SQLite
- **进程管理**: PM2
- **Web服务器**: Nginx（可选）
- **操作系统**: Linux (Ubuntu/CentOS)

## 📝 注意事项

### 安全建议
1. 修改默认管理员密码
2. 配置防火墙规则
3. 启用HTTPS（生产环境）
4. 定期备份数据库
5. 监控系统资源

### 维护建议
1. 定期更新系统依赖
2. 查看应用日志
3. 监控服务状态
4. 备份重要数据
5. 关注系统性能

## 🆘 故障排除

### 常见问题
1. **端口被占用**: 使用 `sudo fuser -k 5001/tcp` 释放端口
2. **权限不足**: 检查文件权限，使用 `chmod +x` 给脚本执行权限
3. **服务启动失败**: 查看 `pm2 logs prodsync-server` 日志
4. **内存不足**: 检查系统资源，必要时创建swap空间

### 日志位置
- **应用日志**: `./logs/`
- **PM2日志**: `~/.pm2/logs/`
- **Nginx日志**: `/var/log/nginx/`

## 📞 技术支持

如遇到部署问题，请：
1. 查看相关日志文件
2. 运行监控脚本检查状态
3. 参考 `deploy/README.md` 详细文档
4. 联系开发团队获取支持

---

**部署完成后，您就可以通过 http://110.42.101.114 访问ProdSync系统了！** 🎉 