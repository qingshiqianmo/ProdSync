#!/bin/bash

echo "正在启动生产项目管理系统..."
echo

echo "检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js 16+"
    exit 1
fi

echo "安装依赖..."
npm run install-all

echo
echo "启动开发服务器..."
echo "前端: http://localhost:5000"
echo "后端: http://localhost:5001"
echo "默认账户: admin / admin123"
echo

npm run dev 