# ProdSync 生产项目管理系统

## 项目简介
ProdSync是一个现代化的生产项目管理系统，专为工业生产环境设计，支持多角色协作和任务管理。

## 技术栈
- **前端**: React 18 + TypeScript + Ant Design
- **后端**: Node.js + Express 
- **数据库**: SQLite
- **认证**: JWT

## 用户角色
- **管理员 (admin)**: 系统管理员，拥有所有权限
- **生产调度 (production_scheduler)**: 创建和分配生产任务
- **生产所领导 (production_leader)**: 接收任务，分配执行人，确认完成
- **职员 (staff)**: 执行具体任务

## 功能特性

### ✅ 已完成功能
- 用户管理（增删改查、密码重置）
- 项目管理（创建、编辑、状态跟踪）
- 任务管理基础功能
- 里程碑管理
- 多角色权限控制
- 用户认证和授权

### 🔄 任务管理重构进展（进行中）

#### 第一阶段：数据库结构调整 ✅
- 更新 `tasks_v3` 表结构
  - 新增 `parent_task_id` 字段（支持子任务）
  - 新增 `completed_by_leader_at` 字段（生产所领导确认完成时间）
  - 新增 `is_copied_from` 字段（任务复制来源）
  - 修改 `executor` 字段为可选（生产调度创建时不指定执行人）
- 创建 `task_receipts` 表（任务回执）
- 实现数据库迁移函数

#### 第二阶段：后端API重构 ✅
- 修改任务创建逻辑
  - 任务创建时自动设置开始时间和IN_PROGRESS状态
  - 生产调度创建任务时只指定生产所领导，不指定执行人
- 更新权限控制逻辑
  - 生产调度不能完成任务，只有执行人或生产所领导可以完成
- 新增API接口：
  - `POST /api/tasks/:id/subtasks` - 创建子任务
  - `PUT /api/tasks/:id/assign` - 分配任务执行人
  - `POST /api/tasks/:id/receipt` - 提交任务回执
  - `GET /api/tasks/:id/receipts` - 获取任务回执
  - `POST /api/tasks/:id/copy` - 复制任务
  - `PUT /api/tasks/:id/complete-by-leader` - 生产所领导确认完成
  - `GET /api/tasks/:id/subtasks` - 获取子任务列表
  - `GET /api/users/production-leaders` - 获取生产所领导列表

#### 第三阶段：前端界面重构 🔄
- 更新类型定义 ✅
  - 扩展Task接口，添加新字段
  - 新增TaskReceipt、CreateSubtaskRequest等接口
- 更新API服务 ✅
  - 添加新的API方法到taskAPI
- 修改任务创建表单 ✅
  - 生产所领导字段改为必选
  - 移除执行人字段选择
- 重构操作按钮 🔄（进行中）
  - 移除"开始任务"按钮
  - 添加角色相关的操作按钮
  - 待完成：模态框实现和完整功能

### 📋 重构需求详情
1. ✅ 取消"开始任务"功能，任务创建时自动记录开始时间
2. ✅ 生产调度只能创建任务，不能完成任务
3. ✅ 生产调度创建的任务只下发给生产所领导，不指定执行人
4. 🔄 生产所领导可以整体转发或拆分成多个子任务下发给执行人
5. 🔄 任务完成逻辑：生产所领导确认完成 OR 所有子任务完成
6. 🔄 执行人完成任务时需要填写回执并记录到数据库
7. 🔄 生产调度增加复制任务功能

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装和运行
```bash
# 安装依赖
npm install

# 启动后端服务器
npm run dev

# 启动前端开发服务器
cd client && npm start
```

### 默认登录账户
- 管理员: admin / admin123
- 生产调度: scheduler / scheduler123
- 生产所领导: leader / leader123
- 职员: staff / staff123

## 项目结构
```
ProdSync/
├── client/                 # 前端React应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── contexts/       # React上下文
│   │   ├── services/       # API服务
│   │   └── types/          # TypeScript类型定义
├── server/                 # 后端Node.js应用
│   ├── src/
│   │   ├── database-v3.js  # 数据库配置和迁移
│   │   ├── simple-server-v3.js  # 主服务器文件
│   │   └── new-apis.js     # 新增API实现
│   └── data/               # SQLite数据库文件
├── deploy/                 # 部署相关脚本
└── scripts/                # 辅助脚本
```

## 当前开发状态
- 主要功能已完成
- 任务管理重构进行中（70%完成）
- 前端界面重构待完善
- 需要添加完整的子任务管理功能
- 需要添加任务回执系统
- 需要添加任务复制功能

## 下一步计划
1. 完成前端模态框实现
2. 实现子任务管理界面
3. 实现任务回执填写界面
4. 实现任务复制功能
5. 完善用户界面和交互体验
6. 添加单元测试
7. 优化性能和用户体验

## 📚 API文档

### 新增API接口

#### 子任务管理
- `POST /api/tasks/:id/subtasks` - 创建子任务
- `GET /api/tasks/:id/subtasks` - 获取子任务列表
- `PUT /api/tasks/:id/assign` - 分配任务执行人

#### 任务回执
- `POST /api/tasks/:id/receipt` - 提交任务回执
- `GET /api/tasks/:id/receipts` - 获取任务回执

#### 任务操作
- `POST /api/tasks/:id/copy` - 复制任务
- `PUT /api/tasks/:id/complete-by-leader` - 生产所领导确认完成

## 🏗️ 项目结构

```
ProdSync/
├── client/                 # React前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── contexts/       # React上下文
│   │   ├── services/       # API服务
│   │   └── types/          # TypeScript类型定义
├── server/                 # Node.js后端应用
│   ├── src/
│   │   ├── database-v3.js  # 数据库设置
│   │   └── simple-server-v3.js # 服务器主文件
├── deploy/                 # 部署脚本和配置
└── scripts/                # 辅助脚本
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。 