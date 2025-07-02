# ProdSync 生产管理系统 Docker 镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖 (SQLite和构建工具)
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

# 复制package.json文件
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装依赖
RUN npm ci --only=production && \
    cd server && npm ci --only=production && \
    cd ../client && npm ci

# 复制源代码
COPY . .

# 构建前端应用
RUN cd client && npm run build

# 创建数据库目录
RUN mkdir -p /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5001
ENV DATABASE_PATH=/app/data/prodsync.db

# 暴露端口
EXPOSE 5001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# 启动应用
CMD ["node", "server.js"]