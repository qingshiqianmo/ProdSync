#!/bin/bash

# ProdSync 手动安装脚本
# 适用于无法从GitHub拉取代码的情况

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

# 检查系统环境
check_system() {
    log_info "检查系统环境..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "未检测到Node.js，请先安装Node.js 16.0+"
        echo "Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
        echo "CentOS/RHEL: curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo yum install -y nodejs"
        exit 1
    fi
    
    # 检查Node.js版本
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Node.js版本过低，需要16.0+，当前版本: $NODE_VERSION"
        exit 1
    fi
    
    log_success "系统环境检查通过"
}

# 安装系统依赖
install_system_deps() {
    log_info "安装系统依赖..."
    
    if command -v sudo &> /dev/null; then
        # 更新系统包
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y build-essential python3 git curl wget
        elif command -v yum &> /dev/null; then
            sudo yum update -y
            sudo yum install -y gcc-c++ make python3 git curl wget
        fi
        
        # 安装PM2
        if ! command -v pm2 &> /dev/null; then
            log_info "安装PM2进程管理器..."
            sudo npm install -g pm2
        fi
        
        # 安装nginx（可选）
        if ! command -v nginx &> /dev/null; then
            log_info "安装nginx..."
            if command -v apt-get &> /dev/null; then
                sudo apt-get install -y nginx
            elif command -v yum &> /dev/null; then
                sudo yum install -y nginx
            fi
        fi
    else
        log_warning "无sudo权限，跳过系统依赖安装"
    fi
    
    log_success "系统依赖安装完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建目录结构..."
    
    mkdir -p logs
    mkdir -p server/data
    mkdir -p backups
    
    log_success "目录创建完成"
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装根目录依赖
    npm install
    
    # 安装服务端依赖
    cd server
    npm install
    cd ..
    
    # 安装客户端依赖并构建
    cd client
    npm install
    npm run build
    cd ..
    
    log_success "依赖安装完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 运行数据库初始化脚本
    cd server
    node src/database-v3.js
    cd ..
    
    log_success "数据库初始化完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    # 获取服务器IP
    SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    
    # 创建生产环境配置
    cat > .env.production << EOF
NODE_ENV=production
PORT=5001
JWT_SECRET=$(openssl rand -base64 32)
CLIENT_URL=http://$SERVER_IP:5000
SERVER_URL=http://$SERVER_IP:5001
DB_FILE=./server/data/prod_sync.db
LOG_LEVEL=info
EOF
    
    log_success "环境变量配置完成"
}

# 配置PM2
setup_pm2() {
    log_info "配置PM2..."
    
    # 获取服务器IP
    SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'prodsync-server',
      script: 'server/src/simple-server-v3.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        JWT_SECRET: process.env.JWT_SECRET || 'production-secret-key',
        CLIENT_URL: 'http://$SERVER_IP:5000'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'server/data'
      ]
    }
  ]
};
EOF
    
    log_success "PM2配置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 清理可能存在的进程
    pm2 stop prodsync-server 2>/dev/null || true
    pm2 delete prodsync-server 2>/dev/null || true
    
    # 启动服务
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    # 设置开机自启
    pm2 startup 2>/dev/null || log_warning "请手动执行PM2开机自启设置"
    
    log_success "服务启动完成"
}

# 显示部署信息
show_deployment_info() {
    SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    
    log_success "🎉 ProdSync手动安装完成！"
    echo ""
    log_info "访问信息:"
    log_info "  前端地址: http://$SERVER_IP"
    log_info "  API地址:  http://$SERVER_IP/api"
    log_info "  健康检查: http://$SERVER_IP:5001/health"
    echo ""
    log_info "默认管理员账户:"
    log_info "  用户名: admin"
    log_info "  密码: admin123"
    echo ""
    log_info "常用命令:"
    log_info "  查看服务状态: pm2 status"
    log_info "  查看日志: pm2 logs prodsync-server"
    log_info "  重启服务: pm2 restart prodsync-server"
    log_info "  重置管理员密码: npm run reset-admin"
}

# 主函数
main() {
    log_info "开始ProdSync手动安装..."
    
    check_directory
    check_system
    install_system_deps
    create_directories
    install_dependencies
    init_database
    setup_environment
    setup_pm2
    start_services
    show_deployment_info
    
    log_success "手动安装完成！"
}

# 运行主函数
main "$@" 