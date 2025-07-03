#!/bin/bash

# ProdSync 一键部署脚本
# 适用于 Linux 服务器

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# 检查是否为root用户
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "检测到以root用户运行，建议使用普通用户部署"
        read -p "是否继续？(y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统环境
check_system() {
    log_info "检查系统环境..."
    
    # 检查操作系统
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "此脚本仅支持Linux系统"
        exit 1
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "未检测到Node.js，请先安装Node.js 16.0+"
        log_info "安装命令: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
        exit 1
    fi
    
    # 检查Node.js版本
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Node.js版本过低，需要16.0+，当前版本: $NODE_VERSION"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "未检测到npm"
        exit 1
    fi
    
    log_success "系统环境检查通过"
}

# 检查端口占用
check_ports() {
    log_info "检查端口占用..."
    
    if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口5001被占用，正在尝试释放..."
        sudo fuser -k 5001/tcp 2>/dev/null || true
        sleep 2
    fi
    
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口5000被占用，正在尝试释放..."
        sudo fuser -k 5000/tcp 2>/dev/null || true
        sleep 2
    fi
    
    log_success "端口检查完成"
}

# 安装系统依赖
install_system_deps() {
    log_info "安装系统依赖..."
    
    # 检查是否有sudo权限
    if command -v sudo &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y build-essential python3 git curl wget
        
        # 安装PM2（如果未安装）
        if ! command -v pm2 &> /dev/null; then
            log_info "安装PM2进程管理器..."
            sudo npm install -g pm2
        fi
        
        # 安装nginx（可选）
        if ! command -v nginx &> /dev/null; then
            log_info "安装nginx..."
            sudo apt-get install -y nginx
        fi
    else
        log_warning "无sudo权限，跳过系统依赖安装"
    fi
    
    log_success "系统依赖安装完成"
}

# 创建目录结构
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
    
    log_success "项目依赖安装完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    # 创建生产环境配置
    cat > .env.production << EOF
# 生产环境配置
NODE_ENV=production
PORT=5001
JWT_SECRET=$(openssl rand -base64 32)
CLIENT_URL=http://110.42.101.114:5000
SERVER_URL=http://110.42.101.114:5001

# 数据库配置
DB_FILE=./server/data/prod_sync.db

# 日志配置
LOG_LEVEL=info
EOF
    
    log_success "环境变量配置完成"
}

# 配置PM2
setup_pm2() {
    log_info "配置PM2进程管理..."
    
    # 创建PM2配置文件
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
        CLIENT_URL: 'http://110.42.101.114:5000'
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

# 配置Nginx
setup_nginx() {
    log_info "配置Nginx..."
    
    # 创建nginx配置文件
    cat > prodsync.nginx.conf << EOF
server {
    listen 80;
    server_name 110.42.101.114;
    
    # 前端静态文件
    location / {
        root $(pwd)/client/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存设置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF
    
    # 提示nginx配置
    log_info "Nginx配置文件已创建: prodsync.nginx.conf"
    log_info "请手动执行以下命令启用Nginx配置:"
    log_info "sudo cp prodsync.nginx.conf /etc/nginx/sites-available/prodsync"
    log_info "sudo ln -s /etc/nginx/sites-available/prodsync /etc/nginx/sites-enabled/"
    log_info "sudo nginx -t && sudo systemctl reload nginx"
    
    log_success "Nginx配置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 停止可能存在的进程
    pm2 stop prodsync-server 2>/dev/null || true
    pm2 delete prodsync-server 2>/dev/null || true
    
    # 启动PM2服务
    pm2 start ecosystem.config.js --env production
    
    # 保存PM2配置
    pm2 save
    
    # 设置PM2开机自启
    pm2 startup 2>/dev/null || log_warning "请手动执行PM2开机自启设置"
    
    log_success "服务启动完成"
}

# 显示部署信息
show_deployment_info() {
    log_success "🎉 ProdSync部署完成！"
    echo ""
    log_info "访问信息:"
    log_info "  前端地址: http://110.42.101.114"
    log_info "  API地址:  http://110.42.101.114/api"
    log_info "  健康检查: http://110.42.101.114/health"
    echo ""
    log_info "默认管理员账户:"
    log_info "  用户名: admin"
    log_info "  密码: admin123"
    echo ""
    log_info "常用命令:"
    log_info "  查看服务状态: pm2 status"
    log_info "  查看日志: pm2 logs prodsync-server"
    log_info "  重启服务: pm2 restart prodsync-server"
    log_info "  停止服务: pm2 stop prodsync-server"
    log_info "  重置管理员密码: npm run reset-admin"
    echo ""
    log_info "日志文件位置:"
    log_info "  错误日志: $(pwd)/logs/err.log"
    log_info "  输出日志: $(pwd)/logs/out.log"
    log_info "  综合日志: $(pwd)/logs/combined.log"
}

# 主函数
main() {
    log_info "开始部署ProdSync生产项目管理系统..."
    log_info "目标服务器: 110.42.101.114"
    
    check_root
    check_system
    check_ports
    install_system_deps
    create_directories
    install_dependencies
    setup_environment
    setup_pm2
    setup_nginx
    start_services
    show_deployment_info
    
    log_success "部署完成！请访问 http://110.42.101.114 开始使用"
}

# 脚本入口
main "$@" 