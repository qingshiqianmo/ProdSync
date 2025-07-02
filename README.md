# 生产项目管理系统 (ProdSync)

一个基于角色的生产项目管理系统，支持任务分配、里程碑管理和进度跟踪。

## 功能特性

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

## 技术栈

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

## 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
# 安装所有依赖（包括前后端）
npm run install-all

# 或者分别安装
npm install
cd server && npm install
cd ../client && npm install
```

### 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或者分别启动
npm run server  # 后端 (端口 5001)
npm run client  # 前端 (端口 5000)
```

### 访问应用

- 前端: http://localhost:5000
- 后端API: http://localhost:5001
- 健康检查: http://localhost:5001/health

### 默认账户

- **用户名**: admin
- **密码**: admin123
- **角色**: 管理员

## 项目结构

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
├── package.json           # 根配置
└── README.md
```

## API 接口

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

## 部署

### 生产环境构建

```bash
# 构建前端
cd client && npm run build

# 构建后端
cd server && npm run build
```

### 环境变量

创建 `.env` 文件：

```env
# 后端
PORT=5001
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5000

# 前端
REACT_APP_API_URL=http://localhost:5001/api
```

## 开发指南

### 添加新功能

1. 在后端 `src/types/index.ts` 中定义类型
2. 在 `src/routes/` 中添加路由
3. 在前端 `src/types/index.ts` 中同步类型
4. 在 `src/services/api.ts` 中添加API调用
5. 在 `src/components/` 中创建UI组件

### 数据库迁移

系统使用SQLite，数据库文件位于 `server/data/prod_sync.db`。首次运行时会自动创建表结构和初始数据。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License 