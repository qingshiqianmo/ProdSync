#!/bin/bash

# ProdSync 状态检查脚本
# 用于诊断Linux服务器上的安装和运行状态

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

echo "============================================"
echo "🔍 ProdSync 系统状态检查"
echo "============================================"
echo ""

# 检查当前目录
log_info "当前目录: $(pwd)"

# 检查项目结构
log_info "检查项目结构..."
if [ -f "package.json" ]; then
    log_success "找到根目录package.json"
else
    log_error "未找到根目录package.json"
fi

if [ -d "server" ]; then
    log_success "找到server目录"
    if [ -f "server/package.json" ]; then
        log_success "找到server/package.json"
    else
        log_error "未找到server/package.json"
    fi
else
    log_error "未找到server目录"
fi

if [ -d "client" ]; then
    log_success "找到client目录"
    if [ -f "client/package.json" ]; then
        log_success "找到client/package.json"
    else
        log_error "未找到client/package.json"
    fi
else
    log_error "未找到client目录"
fi

echo ""

# 检查系统环境
log_info "检查系统环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    log_success "Node.js已安装: $NODE_VERSION"
else
    log_error "Node.js未安装"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    log_success "npm已安装: $NPM_VERSION"
else
    log_error "npm未安装"
fi

if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    log_success "PM2已安装: $PM2_VERSION"
else
    log_warning "PM2未安装"
fi

echo ""

# 检查依赖安装
log_info "检查依赖安装状态..."
if [ -d "node_modules" ]; then
    log_success "根目录依赖已安装"
else
    log_warning "根目录依赖未安装"
fi

if [ -d "server/node_modules" ]; then
    log_success "服务器依赖已安装"
else
    log_warning "服务器依赖未安装"
fi

if [ -d "client/node_modules" ]; then
    log_success "客户端依赖已安装"
else
    log_warning "客户端依赖未安装"
fi

if [ -d "client/build" ]; then
    log_success "客户端已构建"
else
    log_warning "客户端未构建"
fi

echo ""

# 检查数据库
log_info "检查数据库状态..."
if [ -f "server/data/prod_sync.db" ]; then
    log_success "找到数据库文件 server/data/prod_sync.db"
    DB_SIZE=$(du -h server/data/prod_sync.db | cut -f1)
    log_info "数据库大小: $DB_SIZE"
else
    log_warning "未找到数据库文件"
fi

if [ -f "server/prodsync.db" ]; then
    log_success "找到数据库文件 server/prodsync.db"
    DB_SIZE=$(du -h server/prodsync.db | cut -f1)
    log_info "数据库大小: $DB_SIZE"
else
    log_warning "未找到数据库文件"
fi

echo ""

# 检查端口占用
log_info "检查端口占用状态..."
if command -v netstat &> /dev/null; then
    PORT_5000=$(netstat -tlnp 2>/dev/null | grep ":5000 " | wc -l)
    PORT_5001=$(netstat -tlnp 2>/dev/null | grep ":5001 " | wc -l)
    
    if [ $PORT_5000 -gt 0 ]; then
        log_success "端口5000已被占用 (前端服务可能在运行)"
    else
        log_info "端口5000未被占用"
    fi
    
    if [ $PORT_5001 -gt 0 ]; then
        log_success "端口5001已被占用 (后端服务可能在运行)"
    else
        log_info "端口5001未被占用"
    fi
else
    log_warning "netstat命令不可用，无法检查端口状态"
fi

echo ""

# 检查PM2进程
log_info "检查PM2进程状态..."
if command -v pm2 &> /dev/null; then
    PM2_PROCESSES=$(pm2 list 2>/dev/null | grep -c "online\|stopped\|errored")
    if [ $PM2_PROCESSES -gt 0 ]; then
        log_success "发现PM2进程:"
        pm2 list 2>/dev/null || log_warning "无法获取PM2进程列表"
    else
        log_info "未发现PM2进程"
    fi
else
    log_warning "PM2未安装"
fi

echo ""

# 检查日志文件
log_info "检查日志文件..."
if [ -d "logs" ]; then
    log_success "找到logs目录"
    if [ -f "logs/combined.log" ]; then
        LOG_SIZE=$(du -h logs/combined.log | cut -f1)
        log_info "日志文件大小: $LOG_SIZE"
        log_info "最近的日志内容:"
        tail -n 5 logs/combined.log 2>/dev/null || log_warning "无法读取日志文件"
    else
        log_warning "未找到日志文件"
    fi
else
    log_warning "未找到logs目录"
fi

echo ""

# 检查配置文件
log_info "检查配置文件..."
if [ -f "ecosystem.config.js" ]; then
    log_success "找到PM2配置文件"
else
    log_warning "未找到PM2配置文件"
fi

if [ -f ".env.production" ]; then
    log_success "找到生产环境配置文件"
else
    log_warning "未找到生产环境配置文件"
fi

echo ""

# 系统资源检查
log_info "系统资源检查..."
if command -v free &> /dev/null; then
    MEMORY_USAGE=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
    log_info "内存使用率: $MEMORY_USAGE"
else
    log_warning "无法检查内存使用率"
fi

if command -v df &> /dev/null; then
    DISK_USAGE=$(df -h . | awk 'NR==2{print $5}')
    log_info "磁盘使用率: $DISK_USAGE"
else
    log_warning "无法检查磁盘使用率"
fi

echo ""
echo "============================================"
echo "检查完成！"
echo "============================================"

# 提供建议
echo ""
log_info "根据检查结果，您可能需要："
echo "1. 如果依赖未安装，运行: npm install"
echo "2. 如果客户端未构建，运行: cd client && npm run build"
echo "3. 如果数据库未创建，运行: cd server && node src/database-v3.js"
echo "4. 如果服务未启动，运行: pm2 start ecosystem.config.js"
echo "5. 查看详细日志: pm2 logs"
echo "" 