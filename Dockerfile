# ProdSync Docker 生产环境镜像
FROM node:lts-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5001

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 复制package文件
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装依赖
RUN npm ci --only=production
RUN cd server && npm ci --only=production
RUN cd client && npm ci

# 复制源代码（排除node_modules）
COPY . .

# 复制并设置启动脚本权限
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 确保删除任何可能复制的node_modules
RUN rm -rf server/node_modules client/node_modules node_modules

# 重新安装依赖（在Linux环境中）
RUN cd server && npm ci --only=production
RUN cd client && npm ci

# 构建前端
RUN cd client && npm run build

# 创建必要目录
RUN mkdir -p server/data logs

# 初始化数据库（在容器启动时执行，而不是构建时）
# RUN cd server && node src/database-v3.js

# 暴露端口
EXPOSE 5001

# 设置启动用户
RUN groupadd -g 1001 nodejs
RUN useradd -r -u 1001 -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# 启动命令
CMD ["docker-entrypoint.sh"]