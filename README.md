# ProdSync - 生产项目管理系统

一个基于角色的跨平台生产项目管理系统，支持任务分配、里程碑管理和进度跟踪。

## 🌟 功能特性

### 🏢 角色管理
- **管理员**: 最高权限，管理用户和系统配置
- **生产调度**: 创建和分配任务给生产所领导
- **生产所领导**: 接收任务并转发给项目负责人，管理里程碑
- **项目负责人**: 执行任务并更新里程碑状态
- **设计者**: 查看参与项目的任务信息

### 📋 任务管理
- 支持多种任务类型：会议、设计项目、零星任务
- 任务状态跟踪：待处理、进行中、已完成、逾期
- 里程碑管理：计划完成时间、实际完成时间、延期原因
- 任务转发机制：生产所领导可转发任务给项目负责人

### 📊 数据可视化
- 实时统计：总任务数、已完成、进行中、逾期
- 任务列表：支持筛选、排序、分页
- 进度监控：计划vs实际完成时间对比

### 🔐 安全认证
- JWT令牌认证
- 基于角色的权限控制
- 安全的密码加密存储

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

## 📁 项目结构

```
ProdSync/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── database/      # 数据库相关
│   │   ├── middleware/    # 中间件
│   │   ├── routes/        # 路由
│   │   ├── types/         # 类型定义
│   │   └── index.ts       # 主入口
│   ├── data/              # SQLite数据库文件
│   └── package.json
├── client/                # 前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── contexts/      # React上下文
│   │   ├── services/      # API服务
│   │   ├── types/         # 类型定义
│   │   └── App.tsx        # 主应用
│   └── package.json
├── scripts/               # 跨平台脚本
│   ├── start.js           # 主启动脚本
│   ├── stop.js            # 停止脚本
│   ├── install.js         # 安装脚本
│   ├── start.sh           # Unix/Linux/Mac脚本
│   └── start.bat          # Windows脚本
├── package.json           # 根配置
└── README.md
```

## 🛠 技术栈

### 后端
- **Node.js** + **Express** + **TypeScript**
- **SQLite** 数据库
- **JWT** 认证
- **bcryptjs** 密码加密
- **express-validator** 数据验证

### 前端
- **React** + **TypeScript**
- **Ant Design** UI组件库
- **React Router** 路由管理
- **Axios** HTTP客户端
- **Day.js** 日期处理

## 📡 API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `GET /api/auth/users` - 获取用户列表（管理员）
- `POST /api/auth/users` - 创建用户（管理员）

### 任务接口
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks` - 创建任务（生产调度）
- `POST /api/tasks/:id/forward` - 转发任务（生产所领导）
- `POST /api/tasks/:id/milestones` - 添加里程碑
- `PUT /api/tasks/:taskId/milestones/:milestoneId` - 更新里程碑

## 🔧 开发指南

### 开发模式启动

```bash
# 同时启动前后端开发服务器
npm run dev

# 或者分别启动
npm run server  # 后端 (端口 5001)
npm run client  # 前端 (端口 5000)
```

### 构建生产版本

```bash
# 构建前端
npm run build

# 构建后端
npm run build:server
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

## 🎯 跨平台特性

- ✅ **Windows** 支持
- ✅ **macOS** 支持
- ✅ **Linux** 支持
- ✅ 自动端口清理
- ✅ 依赖检查与安装
- ✅ 统一的启动和停止脚本
- ✅ 彩色日志输出
- ✅ 错误处理和恢复

## 📝 使用说明

1. **首次使用**：运行 `npm run install-all` 安装所有依赖
2. **启动服务**：运行 `npm start` 启动完整系统
3. **访问应用**：在浏览器中打开 http://localhost:5000
4. **登录系统**：使用默认账户 admin/admin123
5. **停止服务**：运行 `npm run stop` 或按 Ctrl+C

## 🔍 故障排除

### 端口占用问题
如果遇到端口占用，脚本会自动清理。也可以手动停止：
```bash
npm run stop
```

### 依赖安装失败
确保Node.js版本 >= 16.0.0，然后重新安装：
```bash
npm run install-all
```

### 数据库问题
数据库文件位于 `server/data/prod_sync.db`，如需重置，删除该文件后重新启动。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。 