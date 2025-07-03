# ProdSync Docker 生产环境镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5001

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    wget

# 复制package文件
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装依赖
RUN npm ci --only=production
RUN cd server && npm ci --only=production
RUN cd client && npm ci

# 复制源代码
COPY . .

# 构建前端
RUN cd client && npm run build

# 创建必要目录
RUN mkdir -p server/data logs

# 初始化数据库
RUN cd server && node src/database-v3.js

# 暴露端口
EXPOSE 5001

# 设置启动用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# 启动命令
CMD ["node", "server/src/simple-server-v3.js"]