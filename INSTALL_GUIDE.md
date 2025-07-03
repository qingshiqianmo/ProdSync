# ProdSync 安装指南

## 🎯 系统要求

### 必需环境
- **操作系统**: Windows 10/11, macOS, Linux
- **Node.js**: 16.0或更高版本
- **npm**: 包管理器（通常随Node.js一起安装）
- **内存**: 至少4GB RAM
- **硬盘**: 至少1GB可用空间

### 端口要求
- **5000**: 前端服务端口
- **5001**: 后端API服务端口

## 📥 安装步骤

### 1. 环境检查
在安装前，先运行环境检查：

```batch
# Windows
scripts\check-environment.bat

# Linux/macOS
./scripts/check-environment.sh
```

### 2. 安装Node.js（如果未安装）

#### Windows用户：
1. 访问 [https://nodejs.org/](https://nodejs.org/)
2. 下载LTS（长期支持）版本
3. 运行安装程序，**务必确保勾选以下选项**：
   - ✅ Add to PATH environment variable
   - ✅ Install npm package manager
   - ✅ Install additional tools for Node.js
4. 安装完成后**重启命令行**

#### macOS用户：
```bash
# 使用Homebrew（推荐）
brew install node

# 或者从官网下载安装包
# https://nodejs.org/
```

#### Linux用户：
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs
```

### 3. 验证安装
```bash
node --version  # 应显示 v16.0.0 或更高
npm --version   # 应显示版本号
```

### 4. 启动ProdSync

#### Windows用户：
```batch
scripts\start.bat
```

#### Linux/macOS用户：
```bash
./scripts/start.sh
```

### 5. 访问系统
启动成功后，在浏览器中访问：
- **前端地址**: http://localhost:5000
- **健康检查**: http://localhost:5001/health

## 👤 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 生产调度员 | scheduler01 | test123 |
| 生产领导 | leader01 | test123 |

## 🔧 常见问题

### 问题1: 找不到Node.js或npm
**解决方案**：
1. 重启命令行窗口
2. 检查环境变量PATH
3. 重新安装Node.js
4. 确保安装时勾选了"Add to PATH"

### 问题2: 端口被占用
**错误信息**: `Error: listen EADDRINUSE :::5000`

**解决方案**：
```bash
# Windows
netstat -ano | findstr :5000
taskkill /F /PID <进程ID>

# Linux/macOS
lsof -ti:5000 | xargs kill -9
```

### 问题3: 权限错误
**Linux/macOS用户**:
```bash
sudo chown -R $(whoami) ~/.npm
```

### 问题4: 防火墙阻止
- Windows: 在Windows Defender防火墙中允许Node.js
- macOS: 系统偏好设置 → 安全性与隐私 → 防火墙
- Linux: 配置iptables或ufw

### 问题5: npm安装缓慢
**解决方案**：
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com/

# 清理缓存
npm cache clean --force
```

## 📞 技术支持

如果遇到问题：
1. 首先运行环境检查脚本
2. 查看本指南的常见问题部分
3. 检查错误日志
4. 联系技术支持

## 🔄 卸载

如需卸载ProdSync：
1. 停止服务（Ctrl+C）
2. 删除项目文件夹
3. 可选：卸载Node.js（如果不再需要）

---

**注意**: 首次启动时，系统会自动安装依赖包，可能需要几分钟时间，请耐心等待。 