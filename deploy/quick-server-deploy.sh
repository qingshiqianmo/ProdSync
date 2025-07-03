#!/bin/bash

# ProdSync 服务器一键部署脚本
# 适用于Ubuntu 18.04+系统

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

# 检查是否为root用户
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "检测到root用户，建议创建普通用户运行应用"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 安装系统依赖
install_system_deps() {
    log_info "更新系统包..."
    sudo apt update && sudo apt upgrade -y
    
    log_info "安装基础工具..."
    sudo apt install -y curl wget git unzip build-essential python3
    
    log_success "系统依赖安装完成"
}

# 安装Node.js
install_nodejs() {
    log_info "安装Node.js 18 LTS..."
    
    # 检查是否已安装Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        log_info "检测到已安装Node.js版本: $NODE_VERSION"
        
        # 检查版本是否满足要求
        if [ "$(printf '%s\n' "16.0.0" "$NODE_VERSION" | sort -V | head -n1)" = "16.0.0" ]; then
            log_success "Node.js版本满足要求"
            return 0
        else
            log_warning "Node.js版本过低，需要升级"
        fi
    fi
    
    # 安装或升级Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # 验证安装
    node --version
    npm --version
    
    log_success "Node.js安装完成"
}

# 安装PM2
install_pm2() {
    log_info "安装PM2进程管理器..."
    
    if command -v pm2 &> /dev/null; then
        log_info "PM2已安装"
        return 0
    fi
    
    sudo npm install -g pm2
    sudo npm install -g serve
    
    pm2 --version
    log_success "PM2安装完成"
}

# 创建项目目录
setup_project_dir() {
    log_info "设置项目目录..."
    
    PROJECT_DIR="/opt/prodsync"
    
    if [ -d "$PROJECT_DIR" ]; then
        log_warning "项目目录已存在，是否覆盖？"
        read -p "继续将清空现有数据 (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo rm -rf "$PROJECT_DIR"
        else
            log_error "部署取消"
            exit 1
        fi
    fi
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $(whoami):$(whoami) "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    log_success "项目目录创建完成: $PROJECT_DIR"
}

# 上传提示
upload_files() {
    echo ""
    echo "======================================"
    log_warning "需要手动上传项目文件"
    echo "======================================"
    echo ""
    echo "请在本地电脑执行以下步骤："
    echo ""
    echo "1. 压缩ProdSync项目："
    echo "   zip -r prodsync.zip . -x '*.git*' 'node_modules/*' '*/node_modules/*'"
    echo ""
    echo "2. 上传到服务器："
    echo "   scp prodsync.zip root@110.42.101.114:/opt/prodsync/"
    echo ""
    echo "3. 或使用其他方式（如FileZilla）上传项目文件"
    echo ""
    echo "项目文件上传位置: /opt/prodsync/"
    echo ""
    
    read -p "文件已上传完成，按Enter继续..." 
    
    # 检查文件
    if [ -f "prodsync.zip" ]; then
        log_info "解压项目文件..."
        unzip -q prodsync.zip
        rm prodsync.zip
        log_success "文件解压完成"
    elif [ -f "package.json" ]; then
        log_success "检测到项目文件"
    else
        log_error "未找到项目文件，请确保文件已正确上传"
        exit 1
    fi
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装根目录依赖
    log_info "安装根目录依赖..."
    npm install
    
    # 安装服务器依赖
    log_info "安装服务器依赖..."
    cd server
    npm install
    cd ..
    
    # 安装客户端依赖并构建
    log_info "安装客户端依赖..."
    cd client
    npm install
    
    log_info "构建前端应用..."
    npm run build
    cd ..
    
    log_success "依赖安装完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    mkdir -p server/data
    mkdir -p logs
    
    cd server
    node src/database-v3.js
    cd ..
    
    log_success "数据库初始化完成"
}

# 配置生产环境
setup_production() {
    log_info "配置生产环境..."
    
    # 创建环境配置文件
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > .env.production << EOF
NODE_ENV=production
PORT=5001
JWT_SECRET=$JWT_SECRET
CLIENT_URL=http://110.42.101.114:5000
SERVER_URL=http://110.42.101.114:5001
DB_FILE=./server/data/prod_sync.db
LOG_LEVEL=info
EOF

    # 创建PM2配置文件
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'prodsync-server',
      script: 'server/src/simple-server-v3.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        JWT_SECRET: process.env.JWT_SECRET || 'production-secret-key',
        CLIENT_URL: 'http://110.42.101.114:5000'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false
    },
    {
      name: 'prodsync-frontend',
      script: 'npx',
      args: 'serve -s client/build -l 5000',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

    log_success "生产环境配置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 停止可能存在的进程
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # 启动服务
    pm2 start ecosystem.config.js --env production
    
    # 保存PM2配置
    pm2 save
    
    # 设置开机自启
    pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
    
    log_success "服务启动完成"
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 22
        sudo ufw allow 5000
        sudo ufw allow 5001
        log_success "防火墙配置完成"
    else
        log_warning "未检测到ufw，请手动配置防火墙"
    fi
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    sleep 5
    
    # 检查进程状态
    pm2 status
    
    # 检查端口
    if netstat -tlnp 2>/dev/null | grep -q ":5001"; then
        log_success "后端服务运行正常 (端口5001)"
    else
        log_error "后端服务未启动"
    fi
    
    if netstat -tlnp 2>/dev/null | grep -q ":5000"; then
        log_success "前端服务运行正常 (端口5000)"
    else
        log_error "前端服务未启动"
    fi
    
    # 测试API
    if curl -s http://localhost:5001/health > /dev/null; then
        log_success "API健康检查通过"
    else
        log_warning "API健康检查失败"
    fi
}

# 显示部署信息
show_info() {
    echo ""
    echo "======================================"
    log_success "🎉 ProdSync部署完成！"
    echo "======================================"
    echo ""
    echo "访问地址："
    echo "  前端: http://110.42.101.114:5000"
    echo "  API:  http://110.42.101.114:5001"
    echo "  健康检查: http://110.42.101.114:5001/health"
    echo ""
    echo "默认账户："
    echo "  管理员: admin / admin123"
    echo "  调度员: scheduler01 / test123"
    echo "  领导: leader01 / test123"
    echo ""
    echo "常用命令："
    echo "  pm2 status     # 查看服务状态"
    echo "  pm2 logs       # 查看日志"
    echo "  pm2 restart all # 重启服务"
    echo ""
    echo "项目目录: /opt/prodsync"
    echo ""
}

# 主函数
main() {
    echo "======================================"
    echo "🚀 ProdSync 服务器一键部署"
    echo "======================================"
    echo ""
    
    check_root
    install_system_deps
    install_nodejs
    install_pm2
    setup_project_dir
    upload_files
    install_dependencies
    init_database
    setup_production
    start_services
    setup_firewall
    verify_deployment
    show_info
}

# 运行主函数
main "$@" 