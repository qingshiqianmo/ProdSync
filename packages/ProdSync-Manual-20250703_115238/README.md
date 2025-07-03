# ProdSync - 生产项目管理系统

一个基于角色的跨平台生产项目管理系统，支持任务分配、里程碑管理和进度跟踪。

## 🌟 功能特性

### 🏢 角色管理
- **管理员**: 最高权限，管理用户和系统配置，可重置用户密码
- **生产调度**: 创建、修改和分配任务给生产所领导
- **生产所领导**: 接收任务并转发给项目负责人，管理里程碑
- **项目负责人**: 执行任务并更新里程碑状态
- **设计者**: 查看参与项目的任务信息

### 📋 任务管理
- **任务类型**: 会议、设计项目、零星任务
- **任务状态**: 待处理、进行中、已完成、逾期、逾期完成
- **任务操作**: 创建、修改、转发、开始、完成（管理员和生产调度员可修改）
- **确认提示**: 开始任务、完成任务、完成节点时需要确认
- **里程碑管理**: 支持添加、修改、删除里程碑，逾期自动标识

### 📊 数据可视化
- **实时统计**: 总任务数、已完成、进行中、逾期
- **里程碑统计**: 总数、完成数、逾期数、完成率
- **任务列表**: 支持筛选、排序、分页
- **进度监控**: 计划vs实际完成时间对比
- **逾期提醒**: 任务和里程碑逾期自动标识

### 🔐 安全认证
- JWT令牌认证
- 基于角色的权限控制
- 安全的密码加密存储
- 管理员密码智能管理（重启服务不会重置）

## 🚀 快速开始

### 环境要求
- Node.js 16.0+ 
- npm 8.0+

### 安装依赖

```bash
# 自动安装所有依赖
npm run install-all

# 或者手动安装
npm install
cd server && npm install
cd ../client && npm install
```

### 启动应用

#### 方式一：使用npm脚本（推荐）
```bash
npm start
```

#### 方式二：直接使用Node.js
```bash
node scripts/start.js
```

#### 方式三：使用平台专用脚本

**Windows:**
```cmd
scripts\start.bat
```

**Unix/Linux/Mac:**
```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

### 停止服务

```bash
# 停止所有服务
npm run stop

# 或者直接使用
node scripts/stop.js
```

### 访问应用

- **前端**: http://localhost:5000
- **后端API**: http://localhost:5001
- **健康检查**: http://localhost:5001/health

### 默认账户

- **用户名**: admin
- **密码**: admin123
- **角色**: 管理员

⚠️ **重要提醒**: 
- 首次启动后，管理员密码会保留，重启服务不会重置
- 如需重置管理员密码，请使用：`npm run reset-admin`

## 📁 项目结构

```
ProdSync/
├── server/                      # 后端服务
│   ├── src/
│   │   ├── database-v3.js      # 数据库初始化（包含自动迁移）
│   │   └── simple-server-v3.js # 主服务器
│   ├── data/                   # SQLite数据库文件
│   ├── reset-admin-password.js # 重置管理员密码工具
│   └── package.json
├── client/                     # 前端应用
│   ├── src/
│   │   ├── components/        # React组件
│   │   │   ├── Dashboard.tsx  # 主仪表板
│   │   │   ├── Login.tsx      # 登录页面
│   │   │   ├── TaskManagement.tsx    # 任务管理
│   │   │   ├── ProjectManagement.tsx # 项目管理
│   │   │   └── UserManagement.tsx    # 用户管理
│   │   ├── contexts/          # React上下文
│   │   ├── services/          # API服务
│   │   ├── types/             # 类型定义
│   │   └── App.tsx            # 主应用
│   └── package.json
├── scripts/                   # 跨平台脚本
│   ├── start.js              # 主启动脚本
│   ├── stop.js               # 停止脚本
│   ├── install.js            # 安装脚本
│   ├── start.sh              # Unix/Linux/Mac脚本
│   └── start.bat             # Windows脚本
├── package.json              # 根配置
└── README.md
```

## 🛠 技术栈

### 后端
- **Node.js** + **Express** + **JavaScript**
- **SQLite** 数据库（自动迁移）
- **JWT** 认证
- **bcryptjs** 密码加密
- **express-validator** 数据验证

### 前端
- **React** + **TypeScript**
- **Ant Design** UI组件库
- **React Router** 路由管理
- **Axios** HTTP客户端
- **Day.js** 日期处理
- **React Hook Form** 表单管理

## 📡 API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 用户管理接口
- `GET /api/users` - 获取用户列表（管理员）
- `POST /api/users` - 创建用户（管理员）
- `PUT /api/users/:id/reset-password` - 重置用户密码（管理员）

### 任务接口
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks` - 创建任务（生产调度/管理员）
- `PUT /api/tasks/:id` - 修改任务（生产调度/管理员）
- `POST /api/tasks/:id/forward` - 转发任务（生产所领导）
- `POST /api/tasks/:id/start` - 开始任务
- `POST /api/tasks/:id/complete` - 完成任务

### 里程碑接口
- `POST /api/tasks/:id/milestones` - 添加里程碑
- `PUT /api/milestones/:id` - 更新里程碑
- `DELETE /api/milestones/:id` - 删除里程碑
- `POST /api/milestones/:id/complete` - 完成里程碑节点

## 🔧 开发指南

### 开发模式启动

```bash
# 同时启动前后端开发服务器
npm run dev

# 或者分别启动
npm run server  # 后端 (端口 5001)
npm run client  # 前端 (端口 5000)
```

### 管理员密码管理

```bash
# 重置管理员密码为默认值 (admin123)
npm run reset-admin

# 或者直接运行脚本
node server/reset-admin-password.js
```

### 环境变量配置

创建 `.env` 文件：

```env
# 后端配置
PORT=5001
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5000

# 前端配置
REACT_APP_API_URL=http://localhost:5001/api
```

## 🎯 核心功能详解

### 任务管理
1. **创建任务**: 生产调度和管理员可创建任务
2. **修改任务**: 管理员和生产调度员可修改任务信息和里程碑
3. **任务转发**: 生产所领导可将任务转发给项目负责人
4. **任务执行**: 项目负责人可开始和完成任务
5. **确认提示**: 所有关键操作都需要确认

### 里程碑管理
1. **添加里程碑**: 创建任务时或编辑任务时添加
2. **修改里程碑**: 支持修改里程碑信息和计划完成时间
3. **完成里程碑**: 记录实际完成时间和延期原因
4. **逾期提醒**: 自动标识逾期里程碑

### 权限控制
- **管理员**: 所有权限
- **生产调度**: 创建、修改任务，查看所有数据
- **生产所领导**: 转发任务，管理里程碑
- **项目负责人**: 执行任务，更新里程碑状态
- **设计者**: 只读权限

### 数据统计
- **任务统计**: 总数、已完成、进行中、逾期、逾期完成
- **里程碑统计**: 总数、完成数、逾期数、完成率
- **进度可视化**: 实时更新的统计卡片

## 🔍 功能亮点

### 1. 智能逾期管理
- 自动检测任务和里程碑逾期状态
- 逾期任务标记为红色"逾期"
- 逾期完成任务标记为橙色"逾期完成"
- 里程碑逾期自动显示逾期天数

### 2. 完善的权限控制
- 基于角色的细粒度权限管理
- 已完成任务禁止修改
- 管理员可重置任何用户密码（除自己）

### 3. 用户友好的交互
- 所有关键操作都有确认提示
- 实时数据更新
- 响应式设计，适配不同屏幕
- 优雅的错误处理和提示

### 4. 数据持久化
- SQLite数据库，轻量级部署
- 自动数据库迁移
- 管理员密码智能管理，重启不重置

## 🎨 界面展示

### 主要页面
1. **登录页面**: 简洁的登录界面
2. **仪表板**: 统计信息和任务概览
3. **任务管理**: 任务列表、详情、编辑
4. **项目管理**: 项目信息管理
5. **用户管理**: 用户创建、管理、密码重置

### 交互特性
- 实时数据更新
- 表单验证
- 加载状态提示
- 错误信息展示
- 成功操作反馈

## 🚀 跨平台特性

- ✅ **Windows** 支持
- ✅ **macOS** 支持  
- ✅ **Linux** 支持
- ✅ 自动端口清理
- ✅ 跨平台启动脚本

## 🌐 Linux服务器部署

### 一键部署到生产服务器

适用于Linux服务器（Ubuntu/CentOS等）的一键部署：

```bash
# 1. 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs

# 2. 克隆项目
git clone https://github.com/qingshiqianmo/ProdSync.git && cd ProdSync  

# 3. 执行一键部署
chmod +x deploy/deploy.sh && ./deploy/deploy.sh
```

### 生产环境管理

```bash
# 查看服务状态
pm2 status

# 查看日志  
pm2 logs prodsync-server

# 重启服务
pm2 restart prodsync-server

# 更新系统
chmod +x deploy/update.sh && ./deploy/update.sh
```

更多部署详情请查看 [deploy/README.md](deploy/README.md)

## 📮 版本信息

- **当前版本**: 测试版
- **数据库版本**: V3 (支持自动迁移)
- **Node.js版本**: 16.0+
- **React版本**: 18.0+

## 🛠 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 停止所有服务
   npm run stop
   ```

2. **数据库错误**
   ```bash
   # 检查数据库状态
   node server/check-db.js
   ```

3. **忘记管理员密码**
   ```bash
   # 重置管理员密码
   npm run reset-admin
   ```

4. **依赖安装失败**
   ```bash
   # 清理并重新安装
   npm run clean
   npm run install-all
   ```

## 📄 许可证

本项目仅供学习和内部使用。

---

**技术支持**: 如有问题请联系开发团队
**最后更新**: 2025年1月 