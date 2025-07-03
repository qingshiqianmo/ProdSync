#!/bin/bash

# ProdSync 手动安装包生成脚本
# 生成不依赖GitHub的完整部署包

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在项目根目录
check_directory() {
    if [ ! -f "package.json" ]; then
        log_error "请在ProdSync项目根目录下运行此脚本"
        exit 1
    fi
}

# 创建打包目录
create_package_dir() {
    PACKAGE_NAME="ProdSync-Manual-$(date +%Y%m%d_%H%M%S)"
    PACKAGE_DIR="./packages/$PACKAGE_NAME"
    
    log_info "创建打包目录: $PACKAGE_DIR"
    
    rm -rf ./packages
    mkdir -p "$PACKAGE_DIR"
    
    echo "$PACKAGE_DIR"
}

# 复制必要的文件
copy_files() {
    local package_dir=$1
    
    log_info "复制项目文件..."
    
    # 复制根目录文件
    cp package.json "$package_dir/"
    cp README.md "$package_dir/"
    cp DEPLOYMENT.md "$package_dir/"
    cp .gitignore "$package_dir/"
    
    # 复制服务端文件（不包括node_modules）
    mkdir -p "$package_dir/server"
    cp -r server/src "$package_dir/server/"
    cp server/package.json "$package_dir/server/"
    cp server/reset-admin-password.js "$package_dir/server/"
    
    # 复制客户端文件（不包括node_modules）
    mkdir -p "$package_dir/client"
    cp -r client/src "$package_dir/client/"
    cp -r client/public "$package_dir/client/"
    cp client/package.json "$package_dir/client/"
    cp client/tsconfig.json "$package_dir/client/"
    
    # 复制部署脚本
    mkdir -p "$package_dir/deploy"
    cp deploy/manual-install.sh "$package_dir/deploy/"
    cp deploy/update.sh "$package_dir/deploy/"
    cp deploy/monitor.sh "$package_dir/deploy/"
    cp deploy/README.md "$package_dir/deploy/"
    cp deploy/quick-deploy.md "$package_dir/deploy/"
    
    # 复制脚本目录
    mkdir -p "$package_dir/scripts"
    cp -r scripts/* "$package_dir/scripts/"
    
    log_success "文件复制完成"
}

# 创建安装说明
create_install_guide() {
    local package_dir=$1
    
    log_info "创建安装说明..."
    
    cat > "$package_dir/INSTALL.md" << 'EOF'
# ProdSync 手动安装指南

## 📦 安装包说明

这是一个完整的ProdSync手动安装包，包含了所有必要的文件和脚本。

## 🚀 快速安装

### 1. 上传文件

将整个文件夹上传到Linux服务器，例如：

```bash
# 解压文件（如果是压缩包）
tar -xzf ProdSync-Manual-*.tar.gz
cd ProdSync-Manual-*

# 或者直接上传文件夹
```

### 2. 执行安装

```bash
# 给脚本执行权限
chmod +x deploy/manual-install.sh

# 运行安装脚本
./deploy/manual-install.sh
```

## 📋 安装前准备

### 系统要求

- **操作系统**: Linux (Ubuntu 18.04+, CentOS 7+)
- **Node.js**: 16.0+ (脚本会自动检查)
- **内存**: 至少1GB RAM
- **磁盘**: 至少2GB可用空间

### 预装软件

如果系统没有Node.js，请先安装：

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

## 🛠 手动安装步骤

如果自动安装脚本失败，可以手动执行：

### 1. 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential python3 git curl wget
sudo npm install -g pm2

# CentOS/RHEL
sudo yum update -y
sudo yum install -y gcc-c++ make python3 git curl wget
sudo npm install -g pm2
```

### 2. 安装项目依赖

```bash
# 根目录
npm install

# 服务端
cd server && npm install && cd ..

# 客户端
cd client && npm install && npm run build && cd ..
```

### 3. 初始化数据库

```bash
cd server
node src/database-v3.js
cd ..
```

### 4. 启动服务

```bash
# 使用PM2启动
pm2 start server/src/simple-server-v3.js --name prodsync-server
pm2 save
pm2 startup
```

## 🌐 访问系统

安装完成后，通过以下地址访问：

- **系统地址**: http://your-server-ip
- **管理员账户**: admin / admin123

## 📊 服务管理

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

## 🔧 故障排除

### 常见问题

1. **权限问题**: 确保脚本有执行权限 `chmod +x deploy/manual-install.sh`
2. **端口被占用**: 使用 `sudo fuser -k 5001/tcp` 释放端口
3. **Node.js版本**: 确保Node.js版本 >= 16.0.0
4. **内存不足**: 检查系统资源，必要时创建swap空间

### 获取帮助

- 查看详细文档: `deploy/README.md`
- 运行监控脚本: `./deploy/monitor.sh`
- 查看系统日志: `./logs/combined.log`

---

🎉 **祝您使用愉快！**
EOF
    
    log_success "安装说明创建完成"
}

# 创建快速部署脚本
create_quick_deploy() {
    local package_dir=$1
    
    log_info "创建快速部署脚本..."
    
    cat > "$package_dir/quick-deploy.sh" << 'EOF'
#!/bin/bash

# ProdSync 快速部署脚本
# 一键执行完整安装

echo "🚀 ProdSync 快速部署"
echo "===================="

# 检查执行权限
if [ ! -x "deploy/manual-install.sh" ]; then
    echo "设置执行权限..."
    chmod +x deploy/manual-install.sh
    chmod +x deploy/update.sh
    chmod +x deploy/monitor.sh
fi

# 执行安装
echo "开始安装..."
./deploy/manual-install.sh

echo ""
echo "🎉 部署完成！"
echo "访问地址: http://$(hostname -I | awk '{print $1}' 2>/dev/null || echo 'localhost')"
echo "管理员账户: admin / admin123"
EOF
    
    chmod +x "$package_dir/quick-deploy.sh"
    
    log_success "快速部署脚本创建完成"
}

# 创建压缩包
create_archive() {
    local package_dir=$1
    local package_name=$(basename "$package_dir")
    
    log_info "创建压缩包..."
    
    cd ./packages
    tar -czf "$package_name.tar.gz" "$package_name"
    cd ..
    
    log_success "压缩包创建完成: ./packages/$package_name.tar.gz"
}

# 显示包信息
show_package_info() {
    local package_dir=$1
    local package_name=$(basename "$package_dir")
    
    log_success "🎉 手动安装包生成完成！"
    echo ""
    log_info "安装包信息:"
    log_info "  目录: $package_dir"
    log_info "  压缩包: ./packages/$package_name.tar.gz"
    log_info "  大小: $(du -sh "$package_dir" | cut -f1)"
    echo ""
    log_info "使用方法:"
    log_info "  1. 将压缩包上传到Linux服务器"
    log_info "  2. 解压: tar -xzf $package_name.tar.gz"
    log_info "  3. 进入目录: cd $package_name"
    log_info "  4. 执行安装: ./quick-deploy.sh"
    echo ""
    log_info "或者查看详细说明: INSTALL.md"
}

# 主函数
main() {
    log_info "开始生成ProdSync手动安装包..."
    
    check_directory
    
    package_dir=$(create_package_dir)
    copy_files "$package_dir"
    create_install_guide "$package_dir"
    create_quick_deploy "$package_dir"
    create_archive "$package_dir"
    show_package_info "$package_dir"
    
    log_success "手动安装包生成完成！"
}

# 运行主函数
main "$@" 