#!/bin/bash

# ProdSync 清理打包脚本
# 创建干净的部署包，移除所有node_modules和临时文件

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否在项目根目录
check_project_root() {
    if [[ ! -f "package.json" ]] || [[ ! -d "client" ]] || [[ ! -d "server" ]]; then
        log_error "请在ProdSync项目根目录运行此脚本"
        exit 1
    fi
    log_success "项目根目录检查通过"
}

# 清理node_modules目录
clean_node_modules() {
    log_info "清理所有node_modules目录..."
    
    # 查找并删除所有node_modules目录
    find . -name "node_modules" -type d | while read dir; do
        log_warning "删除: $dir"
        rm -rf "$dir"
    done
    
    # 特别检查常见位置
    local dirs_to_check=(
        "./node_modules"
        "./client/node_modules"
        "./server/node_modules"
        "./prodsync-deploy/node_modules"
        "./prodsync-deploy/client/node_modules"
        "./prodsync-deploy/server/node_modules"
    )
    
    for dir in "${dirs_to_check[@]}"; do
        if [[ -d "$dir" ]]; then
            log_warning "删除: $dir"
            rm -rf "$dir"
        fi
    done
    
    log_success "node_modules清理完成"
}

# 清理构建文件
clean_build_files() {
    log_info "清理构建文件..."
    
    # 清理前端构建文件
    if [[ -d "client/build" ]]; then
        rm -rf client/build
        log_info "删除: client/build"
    fi
    
    if [[ -d "client/dist" ]]; then
        rm -rf client/dist
        log_info "删除: client/dist"
    fi
    
    log_success "构建文件清理完成"
}

# 清理临时文件
clean_temp_files() {
    log_info "清理临时文件..."
    
    # 清理日志文件
    find . -name "*.log" -type f -delete 2>/dev/null || true
    find . -name "npm-debug.log*" -type f -delete 2>/dev/null || true
    find . -name ".npm" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # 清理缓存目录
    find . -name ".cache" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".tmp" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "tmp" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # 清理编辑器文件
    find . -name ".DS_Store" -type f -delete 2>/dev/null || true
    find . -name "Thumbs.db" -type f -delete 2>/dev/null || true
    find . -name "*.swp" -type f -delete 2>/dev/null || true
    find . -name "*.swo" -type f -delete 2>/dev/null || true
    
    log_success "临时文件清理完成"
}

# 清理环境文件
clean_env_files() {
    log_info "清理环境文件..."
    
    # 删除可能包含敏感信息的环境文件
    local env_files=(
        ".env"
        ".env.local"
        ".env.production"
        "client/.env"
        "client/.env.local"
        "server/.env"
        "server/.env.local"
    )
    
    for file in "${env_files[@]}"; do
        if [[ -f "$file" ]]; then
            log_warning "删除环境文件: $file"
            rm -f "$file"
        fi
    done
    
    log_success "环境文件清理完成"
}

# 清理数据库文件（可选）
clean_database_files() {
    log_warning "是否清理数据库文件？这将删除所有数据！"
    read -p "清理数据库文件？(y/N): " confirm
    
    if [[ $confirm == [yY] ]]; then
        if [[ -f "server/prodsync.db" ]]; then
            rm -f server/prodsync.db
            log_info "删除: server/prodsync.db"
        fi
        
        if [[ -f "server/data/prod_sync.db" ]]; then
            rm -f server/data/prod_sync.db
            log_info "删除: server/data/prod_sync.db"
        fi
        
        log_success "数据库文件清理完成"
    else
        log_info "跳过数据库文件清理"
    fi
}

# 清理Git相关文件（可选）
clean_git_files() {
    log_warning "是否清理Git历史？这将删除.git目录！"
    read -p "清理Git文件？(y/N): " confirm
    
    if [[ $confirm == [yY] ]]; then
        if [[ -d ".git" ]]; then
            rm -rf .git
            log_info "删除: .git目录"
        fi
        
        if [[ -f ".gitignore" ]]; then
            log_info "保留: .gitignore"
        fi
        
        log_success "Git文件清理完成"
    else
        log_info "跳过Git文件清理"
    fi
}

# 创建部署包
create_package() {
    log_info "创建部署包..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local package_name="prodsync-deploy-${timestamp}.tar.gz"
    
    # 创建压缩包
    tar -czf "../${package_name}" . \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='*.log' \
        --exclude='.cache' \
        --exclude='.tmp' \
        --exclude='build' \
        --exclude='dist'
    
    log_success "部署包创建完成: ../${package_name}"
    
    # 显示包大小
    local size=$(du -h "../${package_name}" | cut -f1)
    log_info "包大小: ${size}"
}

# 验证清理结果
verify_cleanup() {
    log_info "验证清理结果..."
    
    # 检查是否还有node_modules
    local remaining_node_modules=$(find . -name "node_modules" -type d 2>/dev/null | wc -l)
    if [[ $remaining_node_modules -gt 0 ]]; then
        log_error "仍有 ${remaining_node_modules} 个node_modules目录未清理"
        find . -name "node_modules" -type d
        exit 1
    fi
    
    # 检查项目大小
    local project_size=$(du -sh . | cut -f1)
    log_info "清理后项目大小: ${project_size}"
    
    log_success "清理验证通过"
}

# 显示文件清单
show_file_list() {
    log_info "项目文件清单："
    
    echo "主要目录："
    ls -la | grep "^d"
    
    echo ""
    echo "主要文件："
    find . -maxdepth 1 -type f | head -20
    
    echo ""
    echo "client目录："
    ls -la client/ | head -10
    
    echo ""
    echo "server目录："
    ls -la server/ | head -10
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "================================================"
    echo "    ProdSync 清理打包脚本"
    echo "================================================"
    echo -e "${NC}"
    
    check_project_root
    clean_node_modules
    clean_build_files
    clean_temp_files
    clean_env_files
    
    # 可选清理
    clean_database_files
    clean_git_files
    
    verify_cleanup
    show_file_list
    
    # 询问是否创建部署包
    echo ""
    read -p "是否创建部署包？(Y/n): " create_pkg
    if [[ $create_pkg != [nN] ]]; then
        create_package
    fi
    
    echo ""
    log_success "清理完成！项目已准备好用于部署。"
    
    echo ""
    echo -e "${YELLOW}重要提醒：${NC}"
    echo "1. 确保所有node_modules已删除"
    echo "2. 在服务器部署时会重新安装依赖"
    echo "3. 数据库文件已删除，部署时会重新初始化"
    echo "4. 环境文件已删除，请在服务器上重新配置"
}

# 错误处理
trap 'log_error "清理过程中发生错误"; exit 1' ERR

main "$@" 