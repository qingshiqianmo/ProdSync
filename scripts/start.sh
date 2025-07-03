#!/bin/bash

# ProdSync 启动脚本 - Unix/Linux/Mac
# 使用方法: ./scripts/start.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] $1${NC}"
}

# 检查Node.js环境
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "未找到Node.js，请先安装Node.js 16+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "未找到npm，请先安装npm"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    log "Node.js版本: $NODE_VERSION"
}

# 检查依赖
check_dependencies() {
    log "检查项目依赖..."
    
    if [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
        log_warning "依赖未安装，正在安装..."
        npm run install-all
    fi
}

# 清理端口
cleanup_ports() {
    log "清理端口占用..."
    
    # 检查并杀死占用端口5001的进程
    if lsof -i :5001 &> /dev/null; then
        log_warning "端口5001被占用，正在清理..."
        lsof -ti:5001 | xargs kill -9 2>/dev/null || true
    fi
    
    # 检查并杀死占用端口5000的进程
    if lsof -i :5000 &> /dev/null; then
        log_warning "端口5000被占用，正在清理..."
        lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    fi
    
    sleep 2
}

# 启动服务
start_services() {
    log "启动ProdSync服务..."
    
    # 使用Node.js启动脚本
    node scripts/start.js
}

# 信号处理
trap 'log_warning "正在关闭服务..."; node scripts/stop.js; exit 0' SIGINT SIGTERM

# 主程序
main() {
    echo "=================================================="
    echo "🚀 ProdSync 生产项目管理系统"
    echo "=================================================="
    
    # 切换到项目根目录
    cd "$(dirname "$0")/.."
    
    check_node
    check_dependencies
    cleanup_ports
    start_services
}

# 执行主程序
main "$@" 