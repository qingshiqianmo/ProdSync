# ProdSync - 生产项目管理系统

一个基于角色的跨平台生产项目管理系统，支持任务分配、里程碑管理和进度跟踪。

## 🌟 功能特性

### 🏢 角色权限管理
- **管理员**：最高权限，用户管理、系统配置、密码重置
- **生产调度员**：创建/修改任务，分配给生产所领导
- **生产所领导**：接收并转发任务，管理里程碑节点  
- **项目负责人**：执行任务，更新里程碑状态
- **设计者**：查看相关项目任务信息

### 📋 任务管理
- **任务类型**：会议、设计项目、零星任务
- **任务状态**：待处理、进行中、已完成、逾期、逾期完成
- **智能操作**：创建、修改、转发、开始、完成（带确认提示）
- **里程碑管理**：支持添加、编辑、删除，自动逾期检测

### 📊 数据统计
- **实时统计**：任务总数、完成率、逾期情况
- **里程碑监控**：进度跟踪、逾期预警
- **可视化图表**：任务状态分布、完成趋势

### 🔐 安全特性
- JWT令牌认证
- 密码加密存储
- 智能密码管理（重启不重置）
- 基于角色的权限控制

---

## 🎯 环境架构说明

### 开发环境 vs 生产环境

#### 🔧 开发环境架构
```
前端开发服务器 (localhost:5000)  ←→  后端API服务器 (localhost:5001)
    ↓                                    ↓
React Dev Server                      Express Server
(热重载、快速开发)                      (API接口)
```

**特点：**
- ✅ **两个独立服务**：前端5000端口，后端5001端口
- ✅ **热重载**：代码修改自动刷新
- ✅ **开发调试**：完整的开发工具支持
- ✅ **CORS代理**：前端通过proxy访问后端API

**启动方式：** `npm start`

#### 🚀 生产环境架构
```
用户浏览器 → http://服务器IP:5001 → Express服务器
                                       ├── 前端静态文件（构建后）
                                       └── API服务 (/api/*)
```

**特点：**
- ✅ **单一服务**：只有一个5001端口
- ✅ **无CORS问题**：前后端同域名
- ✅ **资源优化**：前端已构建为静态文件
- ✅ **简化运维**：一个进程管理

**部署方式：** 一键部署脚本

### 架构对比表

| 特性 | 开发环境 | 生产环境 |
|------|----------|----------|
| **前端服务** | React Dev Server (5000) | 静态文件 (5001) |
| **后端服务** | Express Server (5001) | Express Server (5001) |
| **访问地址** | localhost:5000 | 服务器IP:5001 |
| **CORS问题** | 通过proxy解决 | 无CORS问题 |
| **热重载** | ✅ 支持 | ❌ 不支持 |
| **资源消耗** | 较高（两个进程） | 较低（一个进程） |
| **适用场景** | 本地开发调试 | 生产环境部署 |

---

## 🚀 快速开始

### 系统要求
- **Node.js** 16.0+
- **npm** 8.0+
- **内存** 4GB+
- **硬盘** 1GB+ 可用空间

### 开发环境启动

#### 1. 克隆项目
```bash
git clone https://github.com/your-repo/ProdSync.git
cd ProdSync
```

#### 2. 安装依赖
```bash
# 一键安装所有依赖
npm run install-all

# 或者分步安装
npm install
cd server && npm install
cd ../client && npm install
```

#### 3. 启动应用
```bash
# 推荐方式：使用npm脚本
npm start

# 其他方式
node scripts/start.js           # 直接使用Node.js
scripts\start.bat              # Windows批处理
./scripts/start.sh             # Unix/Linux/Mac脚本
```

#### 4. 访问应用
- **前端**：http://localhost:5000
- **后端API**：http://localhost:5001
- **健康检查**：http://localhost:5001/health

#### 5. 默认账户
- **管理员**：admin / admin123
- **调度员**：scheduler01 / test123
- **领导**：leader01 / test123

### 停止服务
```bash
npm run stop
# 或者按 Ctrl+C
```

---

## 🌐 服务器部署

### 一键部署（推荐）

适用于Linux服务器（Ubuntu/CentOS/Debian）：

```bash
# 下载并运行部署脚本
curl -O https://raw.githubusercontent.com/your-repo/ProdSync/main/server-auto-deploy.sh
chmod +x server-auto-deploy.sh && ./server-auto-deploy.sh
```

### 手动部署步骤

#### 1. 环境准备
```bash
# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 安装PM2进程管理器
sudo npm install -g pm2
```

#### 2. 获取代码
```bash
# 创建部署目录
sudo mkdir -p /opt/prodsync
sudo chown $USER:$USER /opt/prodsync
cd /opt/prodsync

# 克隆项目
git clone https://github.com/your-repo/ProdSync.git .

# 清理可能的node_modules
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
```

#### 3. 安装依赖
```bash
# 后端依赖
cd server && npm install --production

# 前端依赖
cd ../client && npm install
```

#### 4. 配置生产环境
```bash
# 配置API为相对路径（避免CORS问题）
cd client
sed -i "s|process.env.REACT_APP_API_URL || 'http://localhost:5001/api'|'/api'|g" src/services/api.ts
```

#### 5. 构建和启动
```bash
# 构建前端
npm run build

# 初始化数据库
cd ../server && node check-db.js

# 启动服务（生产模式）
NODE_ENV=production pm2 start npm --name "prodsync" -- start

# 保存配置并设置开机自启
pm2 save && pm2 startup
```

### 防火墙配置

#### 云服务器安全组
**必须开放端口：**
| 端口 | 协议 | 授权对象 | 描述 |
|------|------|----------|------|
| 5001 | TCP | 0.0.0.0/0 | ProdSync系统 |
| 22 | TCP | 0.0.0.0/0 | SSH访问 |

#### 本地防火墙
```bash
sudo ufw allow 5001
sudo ufw allow ssh
sudo ufw enable
```

### 部署架构
```
用户浏览器 → http://服务器IP:5001 → Express服务器
                                       ├── 前端静态文件
                                       └── API服务 (/api/*)
```

**优势：**
- ✅ 无CORS问题 - 前后端同域
- ✅ 简化运维 - 一个服务管理  
- ✅ 节省资源 - 减少端口和进程
- ✅ 提高安全 - 最小化网络暴露

---

## 🛠 技术栈

### 后端技术
- **Node.js** + **Express** + **JavaScript**
- **SQLite** 数据库（轻量级，支持自动迁移）
- **JWT** 身份认证
- **bcryptjs** 密码加密
- **express-validator** 数据验证

### 前端技术
- **React** + **TypeScript**
- **Ant Design** UI组件库
- **React Router** 路由管理
- **Axios** HTTP客户端
- **Day.js** 日期处理

### 开发工具
- **PM2** 进程管理（生产环境）
- **concurrently** 并发执行
- **cross-env** 跨平台环境变量

---

## 📁 项目结构

```
ProdSync/
├── server/                     # 后端服务
│   ├── src/
│   │   ├── database-v3.js     # 数据库层
│   │   └── simple-server-v3.js # 服务器主程序
│   ├── data/                  # SQLite数据库文件
│   ├── check-db.js            # 数据库检查工具
│   └── reset-admin-password.js # 密码重置工具
├── client/                    # 前端应用
│   ├── src/
│   │   ├── components/        # React组件
│   │   │   ├── Dashboard.tsx  # 仪表板
│   │   │   ├── TaskManagement.tsx # 任务管理
│   │   │   ├── UserManagement.tsx # 用户管理
│   │   │   └── ...
│   │   ├── services/          # API服务
│   │   ├── contexts/          # React上下文
│   │   └── types/             # TypeScript类型
├── scripts/                   # 跨平台脚本
│   ├── start.js              # 主启动脚本
│   ├── stop.js               # 停止脚本
│   ├── install.js            # 安装脚本
│   └── start.bat/start.sh     # 平台专用脚本
├── deploy/                    # 部署相关
│   ├── server-auto-deploy.sh  # 一键部署脚本
│   ├── SERVER_DEPLOY_GUIDE.md # 详细部署指南
│   └── create-clean-package.sh # 清理打包脚本
└── README.md                  # 项目说明
```

---

## 📡 API 接口

### 认证接口
- `POST /api/login` - 用户登录
- `GET /api/me` - 获取当前用户信息

### 用户管理
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id/reset-password` - 重置用户密码

### 任务管理
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 修改任务
- `POST /api/tasks/:id/forward` - 转发任务
- `POST /api/tasks/:id/start` - 开始任务
- `POST /api/tasks/:id/complete` - 完成任务

### 里程碑管理
- `POST /api/tasks/:id/milestones` - 添加里程碑
- `PUT /api/milestones/:id` - 更新里程碑
- `DELETE /api/milestones/:id` - 删除里程碑
- `POST /api/milestones/:id/complete` - 完成里程碑

---

## 🔧 服务管理

### 开发环境
```bash
npm start                      # 启动开发服务器
npm run stop                   # 停止所有服务
npm run server                 # 仅启动后端
npm run client                 # 仅启动前端
npm run build                  # 构建前端
```

### 生产环境
```bash
pm2 status                     # 查看服务状态
pm2 logs prodsync              # 查看日志
pm2 restart prodsync           # 重启服务
pm2 stop prodsync              # 停止服务
pm2 monit                      # 资源监控
```

### 维护工具
```bash
# 重置管理员密码
node server/reset-admin-password.js

# 检查数据库状态
node server/check-db.js

# 清理项目（删除node_modules等）
./deploy/create-clean-package.sh
```

---

## 🐛 故障排除

### 开发环境问题

#### 端口被占用
```bash
# 自动清理端口
npm run stop

# 手动清理（Windows）
netstat -ano | findstr :5000
taskkill /F /PID <进程ID>

# 手动清理（Linux/Mac）
lsof -ti:5000 | xargs kill -9
```

#### 依赖安装失败
```bash
# 清理缓存
npm cache clean --force

# 重新安装
npm run install-all

# 使用国内镜像
npm config set registry https://registry.npmmirror.com/
```

#### 数据库问题
```bash
# 检查数据库
node server/check-db.js

# 重置数据库（删除server/data/prod_sync.db后重启）
```

### 生产环境问题

#### 无法访问系统
1. **检查服务**：`pm2 status`
2. **检查端口**：`netstat -tlnp | grep 5001`
3. **检查防火墙**：云服务器安全组是否开放5001端口
4. **查看日志**：`pm2 logs prodsync`

#### 登录失败
```bash
# 测试API连接
curl http://localhost:5001/api/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 检查数据库
cd /opt/prodsync/server && node check-db.js
```

#### 内存不足
```bash
# 创建交换空间
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 更新系统
```bash
# 拉取最新代码
cd /opt/prodsync
git pull origin main

# 重新构建
cd client && npm run build

# 重启服务
pm2 restart prodsync
```

---

## 🎯 功能亮点

### 1. 智能任务管理
- **自动逾期检测**：任务和里程碑自动标记逾期状态
- **权限控制**：不同角色有不同的操作权限
- **确认提示**：所有关键操作都需要确认

### 2. 里程碑监控
- **进度跟踪**：实时显示任务完成进度
- **逾期预警**：自动计算并显示逾期天数
- **灵活管理**：支持添加、编辑、删除里程碑

### 3. 用户体验
- **响应式设计**：适配不同屏幕尺寸
- **实时更新**：数据自动刷新
- **友好提示**：清晰的成功/错误提示

### 4. 跨平台支持
- **开发环境**：Windows、macOS、Linux统一体验
- **生产部署**：Linux服务器一键部署
- **自动化工具**：智能端口清理、依赖检查

---

## 🔄 版本信息

- **当前版本**：测试版 V3.0
- **数据库版本**：V3（支持自动迁移）
- **Node.js要求**：16.0+
- **浏览器支持**：Chrome 88+、Firefox 85+、Safari 14+

---

## 📞 技术支持

### 联系方式
- **开发团队**：[联系信息]
- **项目地址**：https://github.com/your-repo/ProdSync
- **部署指南**：[deploy/SERVER_DEPLOY_GUIDE.md](deploy/SERVER_DEPLOY_GUIDE.md)

### 获取帮助
1. **查看日志**：开发环境检查控制台，生产环境使用 `pm2 logs prodsync`
2. **检查状态**：使用 `pm2 status` 查看服务状态
3. **验证配置**：确保防火墙和端口配置正确
4. **重启服务**：遇到问题时尝试重启服务

---

## 📄 许可证

本项目仅供学习和内部使用。

---

**🎉 快速开始：** `npm start`  
**🚀 一键部署：** `curl -O https://raw.githubusercontent.com/your-repo/ProdSync/main/server-auto-deploy.sh && chmod +x server-auto-deploy.sh && ./server-auto-deploy.sh`  
**📱 访问地址：** 开发环境 `http://localhost:5000`，生产环境 `http://服务器IP:5001`

**最后更新：** 2025年1月 