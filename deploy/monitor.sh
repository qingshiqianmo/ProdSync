#!/bin/bash

# ProdSync 服务监控脚本

echo "🚀 ProdSync 服务监控"
echo "=================="

# 检查PM2状态
echo "PM2服务状态:"
pm2 status

echo ""
echo "系统资源:"
free -h

echo ""  
echo "磁盘使用:"
df -h

echo ""
echo "端口监听:"
netstat -tlnp | grep -E ":80 |:5001 "

echo ""
echo "最近日志:"
pm2 logs prodsync-server --lines 5 --nostream 