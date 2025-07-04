# ProdSync 生产项目管理系统

## 📋 项目简介

ProdSync是一个现代化的生产项目管理系统，专为工业生产环境设计，支持多角色协作的完整任务管理流程。系统实现了从任务创建、分配、执行到完成的全生命周期管理，并提供里程碑跟踪和回执记录功能。

## 🚀 技术栈

- **前端**: React 18 + TypeScript + Ant Design
- **后端**: Node.js + Express
- **数据库**: SQLite
- **认证**: JWT
- **构建工具**: Create React App + npm

## 👥 用户角色与权限

| 角色 | 标识 | 主要职责 | 权限范围 |
|------|------|----------|----------|
| **系统管理员** | `admin` | 系统管理、用户管理 | 全部功能权限 |
| **生产调度员** | `production_scheduler` | 创建任务、指定生产所领导 | 任务创建、编辑、查看全部任务 |
| **生产所领导** | `production_leader` | 分配执行人、确认完成 | 分配任务、完成任务、查看负责任务 |
| **职员** | `staff` | 执行任务、填写回执 | 完成分配给自己的任务、查看自己的任务 |

## ✨ 核心功能

### 🎯 任务管理工作流

```
创建任务 → 分配执行人 → 执行任务 → 完成任务
   ↓           ↓          ↓        ↓
生产调度    生产所领导     职员    职员/领导
```

#### 1. 任务创建（生产调度员）
- 创建任务时只需指定生产所领导，无需指定执行人
- 自动设置开始时间为当前时间
- 支持添加多个里程碑节点
- 任务创建后状态为"待处理"

#### 2. 任务分配（生产所领导）
- 接收到任务后，可分配给具体执行人
- 分配后任务状态自动变为"进行中"
- 支持查看和管理负责的所有任务

#### 3. 任务执行（职员）
- 查看分配给自己的任务
- 可以完成里程碑节点
- 完成任务时需填写回执内容

#### 4. 任务完成
- **职员完成**：填写回执，系统自动判断是否逾期
- **领导确认**：生产所领导可直接确认任务完成
- 完成时自动完成所有未完成的里程碑

### 📊 里程碑管理
- **创建里程碑**：任务创建时或后续添加
- **进度跟踪**：实时显示完成进度（如：2/5）
- **逾期提醒**：自动标记逾期里程碑
- **批量完成**：任务完成时自动完成所有里程碑

### 📝 任务回执系统
- **回执记录**：任务完成时必填回执内容
- **时间记录**：精确记录提交时间（本地时间）
- **历史查看**：支持查看任务的所有回执记录
- **滚动显示**：长文本回执支持滚动查看

### ⏰ 时间管理
- **本地时间**：所有时间记录使用本地时间（北京时间）
- **逾期判断**：实时对比当前时间与计划完成时间
- **逾期标记**：逾期任务和里程碑自动红色标记
- **完成时间**：记录实际完成时间，支持逾期完成标记

### 🔐 权限控制
- **基于角色**：不同角色看到不同的任务范围
- **数据隔离**：生产所领导只看负责任务，职员只看分配任务
- **操作限制**：严格控制各角色的操作权限
- **安全认证**：JWT token认证，自动登录状态管理

### 📈 数据统计与排序
- **智能排序**：已逾期 > 待处理 > 进行中 > 已完成
- **状态统计**：实时统计各状态任务数量
- **里程碑统计**：显示任务里程碑完成情况
- **时间统计**：显示任务耗时和逾期情况

## 🛠️ 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- Windows/Linux/macOS

### 安装运行

#### 方式一：一键启动（推荐）
```bash
# 克隆项目
git clone https://github.com/qingshiqianmo/ProdSync.git
cd ProdSync

# 安装依赖并启动
npm install
npm start
```

#### 方式二：分别启动
```bash
# 安装根目录依赖
npm install

# 启动后端服务器（端口5001）
cd server
npm install
npm start

# 启动前端开发服务器（端口5000）
cd client
npm install
npm start
```

### 访问系统
- 前端地址：http://localhost:5000
- 后端地址：http://localhost:5001
- 健康检查：http://localhost:5001/health

### 默认账户
| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 系统管理员 | `admin` | `admin123` | 系统管理，用户管理 |
| 生产调度员 | `scheduler01` | `test123` | 创建和管理任务 |
| 生产所领导 | `leader01` | `test123` | 分配和确认任务 |
| 职员 | `staff01` | `test123` | 执行具体任务 |

## 🏗️ 项目结构

```
ProdSync/
├── client/                     # React前端应用
│   ├── src/
│   │   ├── components/         # React组件
│   │   │   ├── Dashboard.tsx   # 仪表板
│   │   │   ├── TaskManagement.tsx  # 任务管理主页
│   │   │   ├── TaskTable.tsx   # 任务列表
│   │   │   ├── TaskModal.tsx   # 任务创建/编辑
│   │   │   ├── TaskDetailModal.tsx  # 任务详情
│   │   │   ├── AssignTaskModal.tsx  # 分配任务
│   │   │   ├── CompleteTaskModal.tsx  # 完成任务
│   │   │   └── UserManagement.tsx   # 用户管理
│   │   ├── contexts/           # React上下文
│   │   │   └── AuthContext.tsx # 认证上下文
│   │   ├── services/           # API服务
│   │   │   └── api.ts          # API接口
│   │   └── types/              # TypeScript类型
│   │       └── index.ts        # 类型定义
├── server/                     # Node.js后端应用
│   ├── src/
│   │   ├── database-v3.js      # 数据库配置和迁移
│   │   └── simple-server-v3.js # 主服务器文件
│   └── data/                   # SQLite数据库文件
├── deploy/                     # 部署脚本和文档
├── scripts/                    # 辅助脚本
└── README.md                   # 项目文档
```

## 🔧 主要API接口

### 认证相关
- `POST /api/login` - 用户登录
- `GET /api/user` - 获取当前用户信息

### 任务管理
- `GET /api/tasks` - 获取任务列表（基于角色过滤）
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `GET /api/tasks/:id` - 获取任务详情

### 任务操作
- `PUT /api/tasks/:id/assign` - 分配任务执行人
- `POST /api/tasks/:id/complete` - 职员完成任务
- `POST /api/tasks/:id/complete-by-leader` - 领导确认完成

### 里程碑管理
- `POST /api/tasks/:id/milestones` - 添加里程碑
- `PUT /api/milestones/:id/status` - 更新里程碑状态
- `PUT /api/milestones/:id` - 更新里程碑信息
- `DELETE /api/milestones/:id` - 删除里程碑

### 用户管理
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

## 🎯 使用场景

### 典型工作流程

1. **生产调度员**创建新的生产任务
   - 填写任务名称、描述、类型
   - 选择负责的生产所领导
   - 设置计划完成时间
   - 添加关键里程碑节点

2. **生产所领导**接收并分配任务
   - 查看分配给自己的任务
   - 选择合适的执行人员
   - 任务状态自动变为"进行中"

3. **职员**执行任务
   - 查看分配给自己的任务
   - 按里程碑完成各阶段工作
   - 完成里程碑时点击确认

4. **任务完成**
   - 职员填写完成回执提交
   - 或生产所领导直接确认完成
   - 系统自动判断是否逾期

## 🔍 特色功能

### 智能时间管理
- 自动使用本地时间记录，避免时区问题
- 实时逾期判断和提醒
- 逾期任务和里程碑红色标记

### 灵活的权限控制
- 基于角色的数据过滤
- 不同角色看到不同的操作按钮
- 严格的API权限验证

### 直观的进度跟踪
- 里程碑进度实时显示（2/5）
- 任务状态优先级排序
- 逾期任务优先显示

### 完整的记录追踪
- 任务回执永久保存
- 操作时间精确记录
- 支持历史记录查看

## 🚀 部署说明

### 开发环境
```bash
npm start  # 同时启动前后端
```

### 生产环境
```bash
# 构建前端
cd client && npm run build

# 启动生产服务器
cd server && npm start
```

详细部署说明请参考 `deploy/` 目录下的文档。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -m '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建 Pull Request

## 📝 开发说明

### 数据库
- 使用SQLite作为数据库，文件位于 `server/prodsync.db`
- 支持自动迁移和初始化
- 包含用户、任务、里程碑、回执等表

### 前端架构
- 基于React + TypeScript
- 使用Ant Design组件库
- Context API管理全局状态
- Axios处理API请求

### 后端架构
- Express.js框架
- JWT认证
- RESTful API设计
- SQLite数据库操作

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

**ProdSync** - 让生产任务管理更简单、更高效！ 