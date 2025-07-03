# ProdSync 部署方案

## 📁 部署文件说明

| 文件 | 用途 | 说明 |
|------|------|------|
| `server-auto-deploy.sh` | 一键部署脚本 | **推荐使用** - 自动化部署整个系统 |
| `SERVER_DEPLOY_GUIDE.md` | 详细部署指南 | 手动部署步骤和故障排除 |
| `create-clean-package.sh` | 项目清理脚本 | 打包前清理临时文件 |
| `check-status.sh` | 状态检查脚本 | 检查服务运行状态 |
| `update.sh` | 更新脚本 | 更新已部署的系统 |
| `monitor.sh` | 监控脚本 | 简单的服务监控 |

## 🚀 快速开始

### 1. 一键部署（推荐）

```bash
# 下载并运行一键部署脚本
curl -O https://raw.githubusercontent.com/your-repo/ProdSync/main/deploy/server-auto-deploy.sh
chmod +x server-auto-deploy.sh && ./server-auto-deploy.sh
```

### 2. 手动部署

参考 `SERVER_DEPLOY_GUIDE.md` 文档进行手动部署。

## 🎯 部署架构

**单服务器架构：**
```
用户浏览器
    ↓
http://服务器IP:5001
    ↓
Express服务器（Node.js）
├── 静态文件服务（React前端）
└── API服务（/api/*）
```

**优势：**
- ✅ **无CORS问题** - 前后端同域
- ✅ **简化运维** - 一个服务管理
- ✅ **节省资源** - 减少端口和进程
- ✅ **提高安全** - 最小化网络暴露

## 🔧 管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs prodsync

# 重启服务
pm2 restart prodsync

# 停止服务
pm2 stop prodsync

# 检查系统状态
./check-status.sh

# 更新系统
./update.sh
```

## 📋 部署清单

**服务器要求：**
- [ ] Linux服务器（Ubuntu 18.04+）
- [ ] 内存至少2GB
- [ ] 磁盘空间至少5GB
- [ ] Root或sudo权限

**网络配置：**
- [ ] 安全组开放5001端口
- [ ] 安全组开放22端口（SSH）

**部署后检查：**
- [ ] `pm2 status` 显示prodsync为online
- [ ] `curl http://localhost:5001` 返回HTML
- [ ] 浏览器访问 `http://服务器IP:5001` 正常
- [ ] 默认账号 `admin/admin123` 登录成功

## 🐛 故障排除

**常见问题：**
1. **无法访问** → 检查安全组5001端口
2. **登录失败** → 检查API服务：`curl http://localhost:5001/api/login`
3. **服务异常** → 查看日志：`pm2 logs prodsync`
4. **内存不足** → 创建交换空间或升级服务器

**获取帮助：**
- 查看详细指南：`SERVER_DEPLOY_GUIDE.md`
- 检查服务状态：`./check-status.sh`
- 查看系统日志：`pm2 logs prodsync`

## 📞 技术支持

部署成功标志：
- ✅ 浏览器能正常访问系统
- ✅ 管理员账号能正常登录
- ✅ 系统功能正常使用

**记住：现在只需要开放一个端口5001！** 🎉 