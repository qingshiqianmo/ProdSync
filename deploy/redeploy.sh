#!/bin/bash

# ProdSync 重新部署脚本
# 用于停止现有服务并覆盖部署新版本
# 适用于服务器IP: 110.42.101.114

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 配置变量
DEPLOY_DIR="/opt/prodsync"
SERVICE_NAME="prodsync"
BACKUP_DIR="/opt/prodsync-backup-$(date +%Y%m%d-%H%M%S)"
REPO_URL="https://github.com/qingshiqianmo/ProdSync.git"

echo "=========================================="
echo "       ProdSync 重新部署脚本"
echo "       服务器: 110.42.101.114"
echo "=========================================="
echo ""

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
    log_error "请不要使用root用户运行此脚本！"
    log_info "建议使用普通用户，脚本会在需要时请求sudo权限"
    exit 1
fi

# 步骤1：检查现有服务状态
log_info "检查现有ProdSync服务状态..."
if pm2 list | grep -q "$SERVICE_NAME"; then
    log_warning "检测到现有ProdSync服务正在运行"
    pm2 list | grep "$SERVICE_NAME"
    
    # 停止现有服务
    log_info "停止现有ProdSync服务..."
    pm2 stop "$SERVICE_NAME" || true
    pm2 delete "$SERVICE_NAME" || true
    log_success "现有服务已停止"
else
    log_info "未检测到现有ProdSync服务"
fi

# 步骤2：备份现有部署（如果存在）
if [[ -d "$DEPLOY_DIR" ]]; then
    log_info "备份现有部署到: $BACKUP_DIR"
    sudo cp -r "$DEPLOY_DIR" "$BACKUP_DIR" || true
    log_success "现有部署已备份"
    
    # 删除现有部署目录
    log_info "删除现有部署目录..."
    sudo rm -rf "$DEPLOY_DIR"
    log_success "现有部署目录已删除"
else
    log_info "未检测到现有部署目录"
fi

# 步骤3：创建新的部署目录
log_info "创建新的部署目录..."
sudo mkdir -p "$DEPLOY_DIR"
sudo chown $USER:$USER "$DEPLOY_DIR"
log_success "部署目录创建完成: $DEPLOY_DIR"

# 步骤4：克隆最新代码
log_info "克隆最新项目代码..."
cd "$DEPLOY_DIR"
git clone "$REPO_URL" .
log_success "最新代码克隆完成"

# 步骤5：彻底清理node_modules目录
log_info "彻底清理所有node_modules目录..."

# 显示清理前的node_modules目录
log_info "检查现有node_modules目录:"
find . -name "node_modules" -type d 2>/dev/null || echo "未发现node_modules目录"

# 清理根目录下的node_modules
if [[ -d "node_modules" ]]; then
    log_warning "删除根目录node_modules..."
    rm -rf node_modules
fi

# 清理client目录下的node_modules
if [[ -d "client/node_modules" ]]; then
    log_warning "删除client/node_modules..."
    rm -rf client/node_modules
fi

# 清理server目录下的node_modules
if [[ -d "server/node_modules" ]]; then
    log_warning "删除server/node_modules..."
    rm -rf server/node_modules
fi

# 使用find命令清理所有可能遗漏的node_modules
log_info "执行全面清理..."
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# 验证清理结果
log_info "验证清理结果:"
remaining_modules=$(find . -name "node_modules" -type d 2>/dev/null | wc -l)
if [[ $remaining_modules -eq 0 ]]; then
    log_success "所有node_modules目录已清理完成"
else
    log_warning "仍有 $remaining_modules 个node_modules目录未清理"
    find . -name "node_modules" -type d 2>/dev/null
fi

# 步骤6：安装服务器端依赖
log_info "安装服务器端依赖..."
cd "$DEPLOY_DIR/server"
npm install --production
log_success "服务器端依赖安装完成"

# 步骤7：安装客户端依赖
log_info "安装客户端依赖..."
cd "$DEPLOY_DIR/client"
npm install --registry=https://registry.npmmirror.com
log_success "客户端依赖安装完成"

# 步骤8：配置API地址为相对路径
log_info "配置API地址为相对路径..."
cd "$DEPLOY_DIR/client"

# 备份原配置文件
cp src/services/api.ts src/services/api.ts.backup

# 修改API地址为相对路径（生产环境）
sed -i "s|process.env.REACT_APP_API_URL || 'http://localhost:5001/api'|'/api'|g" src/services/api.ts

# 验证修改结果
log_info "API配置验证:"
grep "API_BASE_URL" src/services/api.ts || echo "配置已更新为相对路径"
log_success "API地址配置完成"

# 步骤9：创建交换空间（如果内存不足）
available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7*100/$2}')
if [[ $available_memory -lt 30 ]]; then
    log_warning "可用内存不足，检查交换空间..."
    
    if [[ ! -f /swapfile ]]; then
        log_info "创建交换空间..."
        sudo fallocate -l 1G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        log_success "交换空间创建完成"
    else
        log_info "交换空间已存在"
    fi
fi

# 步骤10：构建前端项目
log_info "构建前端项目..."
cd "$DEPLOY_DIR/client"
npm run build
log_success "前端构建完成"

# 步骤11：初始化数据库
log_info "初始化数据库..."
cd "$DEPLOY_DIR/server"
node check-db.js
log_success "数据库初始化完成"

# 步骤12：启动新服务
log_info "启动ProdSync服务..."
cd "$DEPLOY_DIR/server"
NODE_ENV=production pm2 start npm --name "$SERVICE_NAME" -- start

# 保存PM2配置
pm2 save
log_success "ProdSync服务启动完成"

# 步骤13：检查服务状态
log_info "检查服务状态..."
sleep 5
pm2 list
pm2 logs "$SERVICE_NAME" --lines 10

# 步骤14：显示访问信息
echo ""
echo "=========================================="
echo "          部署完成！"
echo "=========================================="
echo ""
log_success "ProdSync重新部署完成！"
echo ""
echo "🌐 访问地址: http://110.42.101.114:5001"
echo "🔧 API地址: http://110.42.101.114:5001/api"
echo ""
echo "👤 默认管理员账号:"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "📊 服务管理命令:"
echo "   查看状态: pm2 list"
echo "   查看日志: pm2 logs $SERVICE_NAME"
echo "   重启服务: pm2 restart $SERVICE_NAME"
echo "   停止服务: pm2 stop $SERVICE_NAME"
echo ""
echo "📁 备份位置: $BACKUP_DIR"
echo ""
echo "🎉 部署成功！您现在可以通过浏览器访问系统了。"
echo "" 