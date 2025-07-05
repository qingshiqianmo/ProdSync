#!/bin/bash

# ProdSync Root用户部署脚本
# 适用于root用户直接部署，使用阿里镜像加速
# 包含API配置修复，解决登录页面卡死问题

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
REGISTRY_URL="https://registry.npmmirror.com"

echo "=========================================="
echo "    ProdSync Root用户部署脚本"
echo "    使用阿里镜像加速构建"
echo "=========================================="
echo ""

# 检查是否为root用户
if [[ $EUID -ne 0 ]]; then
    log_error "此脚本需要root权限运行！"
    log_info "请使用: sudo ./root-deploy.sh"
    exit 1
fi

# 检查当前目录是否为部署目录
if [[ ! -f "package.json" ]] || [[ ! -d "client" ]] || [[ ! -d "server" ]]; then
    log_error "请在ProdSync项目根目录运行此脚本！"
    log_info "当前目录: $(pwd)"
    log_info "预期目录: $DEPLOY_DIR"
    exit 1
fi

log_info "当前目录: $(pwd)"
log_info "开始部署流程..."

# 步骤1：检查并停止现有服务
log_info "检查现有ProdSync服务状态..."
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list | grep -q "$SERVICE_NAME"; then
        log_warning "检测到现有ProdSync服务正在运行"
        pm2 stop "$SERVICE_NAME" || true
        pm2 delete "$SERVICE_NAME" || true
        log_success "现有服务已停止"
    else
        log_info "未检测到现有ProdSync服务"
    fi
else
    log_info "PM2未安装，将在后续步骤中安装"
fi

# 步骤2：安装系统依赖
log_info "检查系统依赖..."

# 更新包列表
apt-get update -y

# 安装必要的系统工具
apt-get install -y curl wget unzip build-essential

# 检查Node.js
if ! command -v node >/dev/null 2>&1; then
    log_info "安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# 检查PM2
if ! command -v pm2 >/dev/null 2>&1; then
    log_info "安装PM2..."
    npm install -g pm2 --registry=$REGISTRY_URL
fi

log_success "系统依赖检查完成"

# 步骤3：配置npm使用阿里镜像
log_info "配置npm使用阿里镜像..."
npm config set registry $REGISTRY_URL
npm config set disturl https://npmmirror.com/dist
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/

log_success "npm镜像配置完成"

# 步骤4：彻底清理node_modules目录
log_info "彻底清理所有node_modules目录..."

# 显示清理前的node_modules目录
log_info "检查现有node_modules目录:"
find . -name "node_modules" -type d 2>/dev/null || echo "未发现node_modules目录"

# 使用find命令清理所有node_modules
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# 清理package-lock.json文件
find . -name "package-lock.json" -delete 2>/dev/null || true

# 验证清理结果
remaining_modules=$(find . -name "node_modules" -type d 2>/dev/null | wc -l)
if [[ $remaining_modules -eq 0 ]]; then
    log_success "所有node_modules目录已清理完成"
else
    log_warning "仍有 $remaining_modules 个node_modules目录未清理"
fi

# 步骤5：安装服务器端依赖
log_info "安装服务器端依赖..."
cd server
npm install --production --registry=$REGISTRY_URL
log_success "服务器端依赖安装完成"

# 步骤6：安装客户端依赖
log_info "安装客户端依赖..."
cd ../client
npm install --registry=$REGISTRY_URL
log_success "客户端依赖安装完成"

# 步骤7：修复API配置（关键步骤，解决登录页面卡死问题）
log_info "修复API配置，解决登录页面卡死问题..."

# 备份原配置文件
cp src/services/api.ts src/services/api.ts.backup

# 使用#作为分隔符来避免URL中的/冲突
sed -i 's#const API_BASE_URL = process.env.REACT_APP_API_URL || '\''http://localhost:5001/api'\'';#const API_BASE_URL = '\''/api'\'';#g' src/services/api.ts

# 检查修改结果
log_info "API配置修改结果:"
grep -n "API_BASE_URL" src/services/api.ts

# 确保修改成功
if grep -q "const API_BASE_URL = '/api';" src/services/api.ts; then
    log_success "API配置修复完成"
else
    log_error "API配置修复失败，请检查"
    exit 1
fi

# 步骤8：创建交换空间（如果内存不足）
log_info "检查内存情况..."
available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7*100/$2}')
if [[ $available_memory -lt 30 ]]; then
    log_warning "可用内存不足，检查交换空间..."
    
    if [[ ! -f /swapfile ]]; then
        log_info "创建交换空间..."
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        log_success "交换空间创建完成"
    else
        log_info "交换空间已存在"
    fi
fi

# 步骤9：构建前端项目
log_info "构建前端项目..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
log_success "前端构建完成"

# 步骤10：初始化数据库
log_info "初始化数据库..."
cd ../server
node check-db.js
log_success "数据库初始化完成"

# 步骤11：启动新服务
log_info "启动ProdSync服务..."
NODE_ENV=production pm2 start npm --name "$SERVICE_NAME" -- start

# 保存PM2配置
pm2 save

# 设置PM2开机启动
pm2 startup
pm2 save

log_success "ProdSync服务启动完成"

# 步骤12：检查服务状态
log_info "检查服务状态..."
sleep 5
pm2 list
echo ""
log_info "查看服务日志:"
pm2 logs "$SERVICE_NAME" --lines 20

# 步骤13：配置防火墙（如果需要）
log_info "检查防火墙配置..."
if command -v ufw >/dev/null 2>&1; then
    ufw allow 5001/tcp
    log_success "防火墙规则已添加"
fi

# 步骤14：显示访问信息
echo ""
echo "=========================================="
echo "          部署完成！"
echo "=========================================="
echo ""
log_success "ProdSync部署完成！"
echo ""
echo "🌐 访问地址: http://$(curl -s ifconfig.me):5001"
echo "🌐 内网地址: http://$(hostname -I | awk '{print $1}'):5001"
echo "🔧 API地址: http://$(curl -s ifconfig.me):5001/api"
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
echo "🔧 API配置已修复，解决登录页面卡死问题"
echo "🚀 使用阿里镜像加速构建，提高部署速度"
echo ""
echo "🎉 部署成功！您现在可以通过浏览器访问系统了。"
echo "" 