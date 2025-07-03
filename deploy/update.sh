#!/bin/bash

# ProdSync 更新部署脚本
# 用于更新已部署的ProdSync系统

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

# 检查是否在正确的目录
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
        log_error "请在ProdSync项目根目录下运行此脚本"
        exit 1
    fi
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."
    
    mkdir -p backups
    
    if [ -f "server/data/prod_sync.db" ]; then
        cp server/data/prod_sync.db "backups/prod_sync_$(date +%Y%m%d_%H%M%S).db"
        log_success "数据库备份完成"
    else
        log_warning "未找到数据库文件，跳过备份"
    fi
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    pm2 stop prodsync-server 2>/dev/null || log_warning "服务未运行或停止失败"
    
    log_success "服务停止完成"
}

# 拉取最新代码
pull_code() {
    log_info "拉取最新代码..."
    
    # 保存本地修改
    git stash push -m "Auto stash before update $(date)"
    
    # 拉取最新代码
    git pull origin main
    
    log_success "代码更新完成"
}

# 更新依赖
update_dependencies() {
    log_info "更新项目依赖..."
    
    # 更新根目录依赖
    npm install
    
    # 更新服务端依赖
    cd server
    npm install
    cd ..
    
    # 更新并重新构建前端
    cd client
    npm install
    npm run build
    cd ..
    
    log_success "依赖更新完成"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    
    # 重启PM2服务
    pm2 restart prodsync-server 2>/dev/null || {
        log_warning "服务重启失败，尝试重新启动..."
        pm2 start ecosystem.config.js --env production
    }
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if pm2 list | grep -q "prodsync-server.*online"; then
        log_success "服务重启成功"
    else
        log_error "服务重启失败"
        pm2 logs prodsync-server --lines 10
        exit 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务完全启动
    sleep 5
    
    # 检查健康端点
    if curl -f http://localhost:5001/health >/dev/null 2>&1; then
        log_success "健康检查通过"
    else
        log_warning "健康检查失败，但服务可能仍在启动中"
    fi
}

# 显示更新信息
show_update_info() {
    log_success "🎉 ProdSync更新完成！"
    echo ""
    log_info "服务状态:"
    pm2 status
    echo ""
    log_info "访问地址:"  
    log_info "  前端: http://110.42.101.114"
    log_info "  API:  http://110.42.101.114/api"
    echo ""
    log_info "常用命令:"
    log_info "  查看日志: pm2 logs prodsync-server"
    log_info "  重启服务: pm2 restart prodsync-server"
    log_info "  查看状态: pm2 status"
}

# 主函数
main() {
    log_info "开始更新ProdSync系统..."
    
    check_directory
    backup_database
    stop_services
    pull_code
    update_dependencies
    restart_services
    health_check
    show_update_info
    
    log_success "更新完成！"
}

# 脚本入口
main "$@" 