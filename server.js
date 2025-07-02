// ProdSync 生产管理系统 - 云端部署入口
const path = require('path');

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '5001';

console.log(`🚀 启动环境: ${process.env.NODE_ENV}`);
console.log(`📱 端口: ${process.env.PORT}`);
console.log('☁️  云端部署模式已激活');

// 直接启动原始服务器 - 手动调用启动函数
require('./server/src/simple-server-v3.js');