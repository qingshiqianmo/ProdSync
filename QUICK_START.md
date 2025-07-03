# 🚀 ProdSync 快速启动指南

## 一键启动

### Windows 用户
```cmd
# 方式1：使用npm（推荐）
npm start

# 方式2：使用批处理脚本
scripts\start.bat

# 方式3：直接使用Node.js
node scripts/start.js
```

### macOS/Linux 用户
```bash
# 方式1：使用npm（推荐）
npm start

# 方式2：使用shell脚本
chmod +x scripts/start.sh
./scripts/start.sh

# 方式3：直接使用Node.js
node scripts/start.js
```

## 首次使用

1. **确保已安装Node.js 16+**
   ```bash
   node --version  # 应该显示 v16.0.0 或更高版本
   ```

2. **安装所有依赖**
   ```bash
   npm run install-all
   ```

3. **启动系统**
   ```bash
   npm start
   ```

4. **访问应用**
   - 前端：http://localhost:5000
   - 后端：http://localhost:5001

5. **登录系统**
   - 用户名：admin
   - 密码：admin123

## 停止服务

```bash
# 停止所有服务
npm run stop

# 或者按 Ctrl+C 停止
```

## 常见问题

### Q: 端口被占用怎么办？
A: 脚本会自动清理端口，也可以手动执行：
```bash
npm run stop
```

### Q: 依赖安装失败？
A: 确保Node.js版本正确，然后重新安装：
```bash
npm run install-all
```

### Q: 如何重置数据库？
A: 删除 `server/data/prod_sync.db` 文件，然后重新启动。

## 更多帮助

查看完整文档：[README.md](README.md) 