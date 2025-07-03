# 🚀 ProdSync 快速部署指令

## 一键复制粘贴部署

连接到您的Linux服务器 `110.42.101.114` 后，直接复制粘贴以下命令：

```bash
# 1. 安装Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs

# 2. 拉取代码
git clone https://github.com/qingshiqianmo/ProdSync.git && cd ProdSync

# 3. 一键部署
chmod +x deploy/deploy.sh && ./deploy/deploy.sh
```

## 部署完成访问地址

- **系统地址**: http://110.42.101.114
- **管理员账户**: admin / admin123

## 常用管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs prodsync-server

# 重启服务
pm2 restart prodsync-server

# 重置管理员密码
npm run reset-admin
```

---

**注意**: 首次部署完成后，请立即修改管理员密码！ 