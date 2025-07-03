#!/bin/bash

# ProdSync 服务器端一键部署脚本
# 版本：1.0

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查系统要求
check_system() {
    log_info "检查系统要求..."
    
    total_memory=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [[ $total_memory -lt 1500 ]]; then
        log_warning "系统内存不足2GB，将创建交换空间"
    fi
    
    available_space=$(df -m . | awk 'NR==2{print $4}')
    if [[ $available_space -lt 5000 ]]; then
        log_error "可用磁盘空间不足5GB"
        exit 1
    fi
    
    log_success "系统检查通过"
}

# 安装Node.js
install_nodejs() {
    log_info "检查Node.js环境..."
    
    if command -v node >/dev/null 2>&1; then
        node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -ge 16 ]]; then
            log_success "Node.js版本检查通过: $(node --version)"
            return
        fi
    fi
    
    log_info "安装Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log_success "Node.js安装完成: $(node --version)"
}

# 安装PM2
install_pm2() {
    if ! command -v pm2 >/dev/null 2>&1; then
        log_info "安装PM2..."
        sudo npm install -g pm2
    fi
    log_success "PM2已就绪"
}

# 创建部署目录
create_deploy_dir() {
    DEPLOY_DIR="/opt/prodsync"
    
    if [[ -d $DEPLOY_DIR ]]; then
        log_warning "目录已存在，将清理后重新部署"
        sudo rm -rf $DEPLOY_DIR
    fi
    
    sudo mkdir -p $DEPLOY_DIR
    sudo chown $USER:$USER $DEPLOY_DIR
    log_success "部署目录创建完成"
}

# 克隆项目
clone_project() {
    log_info "获取项目代码..."
    cd /opt/prodsync
    
    echo "请输入Git仓库地址（例如: https://github.com/username/ProdSync.git）："
    read -p "仓库地址: " repo_url
    
    if [[ -z "$repo_url" ]]; then
        log_error "仓库地址不能为空"
        exit 1
    fi
    
    git clone "$repo_url" .
    
    # 清理node_modules
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    
    log_success "项目代码获取完成"
}

# 创建交换空间
create_swap() {
    available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7*100/$2}')
    if [[ $available_memory -lt 30 ]] && [[ ! -f /swapfile ]]; then
        log_info "创建交换空间..."
        sudo fallocate -l 1G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        log_success "交换空间创建完成"
    fi
}

# 安装依赖并构建
build_project() {
    log_info "安装服务器端依赖..."
    cd /opt/prodsync/server
    npm install --production
    
    log_info "安装客户端依赖..."
    cd /opt/prodsync/client
    npm install
    
    create_swap
    
    log_info "构建前端项目..."
    npm run build
    
    log_success "项目构建完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    cd /opt/prodsync/server
    node check-db.js
    log_success "数据库初始化完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q "Status: active"; then
        sudo ufw allow 5000
        sudo ufw allow 5001
        sudo ufw allow ssh
        sudo ufw reload
        log_success "防火墙配置完成"
    fi
    
    log_warning "请确保云服务器安全组开放5000和5001端口！"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    pm2 delete prodsync-server prodsync-frontend 2>/dev/null || true
    
    cd /opt/prodsync/server
    pm2 start npm --name "prodsync-server" -- start
    
    cd /opt/prodsync/client  
    HOST=0.0.0.0 PORT=5000 pm2 start npm --name "prodsync-frontend" -- start
    
    pm2 save
    pm2 startup --no-daemon 2>/dev/null || true
    
    log_success "服务启动完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    sleep 5
    
    pm2 status
    netstat -tlnp | grep -E "(5000|5001)"
    
    if curl -f http://localhost:5001/health >/dev/null 2>&1; then
        log_success "后端服务正常"
    fi
    
    if curl -f http://localhost:5000 >/dev/null 2>&1; then
        log_success "前端服务正常"
    fi
}

# 显示结果
show_result() {
    server_ip=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo ""
    echo "========================================"
    echo -e "${GREEN}🎉 ProdSync 部署完成！${NC}"
    echo "========================================"
    echo ""
    echo "访问地址: http://$server_ip:5000"
    echo "后端API:  http://$server_ip:5001"
    echo ""
    echo "默认账号: admin / admin123"
    echo ""
    echo "管理命令:"
    echo "  pm2 status    # 查看状态"
    echo "  pm2 logs      # 查看日志"
    echo "  pm2 restart all # 重启服务"
    echo ""
    echo -e "${RED}重要：请确保云服务器安全组开放5000和5001端口！${NC}"
    echo "========================================"
}

# 主函数
main() {
    echo -e "${GREEN}ProdSync 服务器端一键部署脚本${NC}"
    echo "========================================"
    
    check_system
    install_nodejs
    install_pm2
    create_deploy_dir
    clone_project
    build_project
    init_database
    configure_firewall
    start_services
    verify_deployment
    show_result
}

# 错误处理
trap 'log_error "部署失败！"; exit 1' ERR

main "$@" 