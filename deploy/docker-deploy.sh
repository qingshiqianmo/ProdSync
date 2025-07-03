#!/bin/bash

# ProdSync Docker 一键部署脚本
# 用途：在服务器上使用Docker快速部署ProdSync系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "🐳 ProdSync Docker 部署脚本开始..." "$BLUE"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    print_message "❌ Docker未安装，请先安装Docker！" "$RED"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_message "❌ Docker Compose未安装，请先安装Docker Compose！" "$RED"
    exit 1
fi

print_message "✅ Docker环境检查通过" "$GREEN"

# 停止并删除现有容器
print_message "🛑 停止现有容器..." "$YELLOW"
docker-compose down || true

# 清理可能的端口占用
print_message "🧹 清理端口占用..." "$YELLOW"
sudo pkill -f "node.*5000" 2>/dev/null || true
sudo pkill -f "node.*5001" 2>/dev/null || true

# 检查端口是否被占用
if ss -tlnp | grep -q ":5001"; then
    print_message "⚠️  端口5001被占用，请手动处理后重试" "$YELLOW"
    ss -tlnp | grep ":5001"
    exit 1
fi

# 创建必要的目录
print_message "📁 创建必要目录..." "$YELLOW"
mkdir -p server/data logs

# 构建和启动容器
print_message "🏗️  构建Docker镜像..." "$BLUE"
docker-compose build --no-cache

print_message "🚀 启动ProdSync容器..." "$BLUE"
docker-compose up -d

# 等待服务启动
print_message "⏳ 等待服务启动..." "$YELLOW"
sleep 10

# 检查服务状态
print_message "🔍 检查服务状态..." "$BLUE"
docker-compose ps

# 检查服务是否正常运行
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    print_message "✅ ProdSync服务启动成功！" "$GREEN"
    print_message "🌐 访问地址：http://您的服务器IP:5001" "$GREEN"
    print_message "👤 默认管理员账号：admin" "$GREEN"
    print_message "🔐 默认管理员密码：admin123" "$GREEN"
else
    print_message "❌ 服务启动失败，请检查日志" "$RED"
    docker-compose logs
    exit 1
fi

# 显示容器信息
print_message "📊 容器信息：" "$BLUE"
docker-compose ps

# 显示日志查看命令
print_message "📋 常用命令：" "$BLUE"
echo "  查看日志：docker-compose logs -f"
echo "  停止服务：docker-compose down"
echo "  重启服务：docker-compose restart"
echo "  进入容器：docker-compose exec prodsync sh"

print_message "🎉 部署完成！" "$GREEN" 