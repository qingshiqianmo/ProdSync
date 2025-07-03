#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ProdSyncLauncher {
  constructor() {
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';
    this.processes = [];
    this.serverPort = 5001;
    this.clientPort = 5000;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const command = this.isWindows
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port}`;
      
      exec(command, (error, stdout) => {
        resolve(stdout.trim().length > 0);
      });
    });
  }

  async killPortProcess(port) {
    return new Promise((resolve) => {
      if (this.isWindows) {
        exec(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /f /pid %a`, resolve);
      } else {
        exec(`lsof -ti:${port} | xargs kill -9`, resolve);
      }
    });
  }

  async checkDependencies() {
    this.log('检查依赖...');
    
    const serverPackageJson = path.join(__dirname, '..', 'server', 'package.json');
    const clientPackageJson = path.join(__dirname, '..', 'client', 'package.json');
    
    if (!fs.existsSync(serverPackageJson) || !fs.existsSync(clientPackageJson)) {
      this.log('找不到package.json文件，请确保项目结构正确', 'error');
      return false;
    }

    const serverNodeModules = path.join(__dirname, '..', 'server', 'node_modules');
    const clientNodeModules = path.join(__dirname, '..', 'client', 'node_modules');
    
    if (!fs.existsSync(serverNodeModules) || !fs.existsSync(clientNodeModules)) {
      this.log('依赖未安装，正在安装...', 'warning');
      await this.installDependencies();
    }

    return true;
  }

  async installDependencies() {
    return new Promise((resolve, reject) => {
      this.log('安装根目录依赖...');
      const rootInstall = spawn('npm', ['install'], { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });

      rootInstall.on('close', (code) => {
        if (code === 0) {
          this.log('安装服务器依赖...');
          const serverInstall = spawn('npm', ['install'], { 
            cwd: path.join(__dirname, '..', 'server'),
            stdio: 'inherit'
          });

          serverInstall.on('close', (code) => {
            if (code === 0) {
              this.log('安装客户端依赖...');
              const clientInstall = spawn('npm', ['install'], { 
                cwd: path.join(__dirname, '..', 'client'),
                stdio: 'inherit'
              });

              clientInstall.on('close', (code) => {
                if (code === 0) {
                  this.log('所有依赖安装完成', 'success');
                  resolve();
                } else {
                  reject(new Error('客户端依赖安装失败'));
                }
              });
            } else {
              reject(new Error('服务器依赖安装失败'));
            }
          });
        } else {
          reject(new Error('根目录依赖安装失败'));
        }
      });
    });
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.log('启动后端服务器...');
      
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..', 'server'),
        stdio: 'pipe',
        shell: this.isWindows
      });

      this.processes.push(serverProcess);

      serverProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          this.log(`[SERVER] ${message}`);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          this.log(`[SERVER] ${message}`, 'warning');
        }
      });

      // 等待服务器启动
      setTimeout(() => {
        this.checkPort(this.serverPort).then(isRunning => {
          if (isRunning) {
            this.log('后端服务器启动成功', 'success');
            resolve();
          } else {
            reject(new Error('后端服务器启动失败'));
          }
        });
      }, 5000);
    });
  }

  async startClient() {
    return new Promise((resolve, reject) => {
      this.log('启动前端应用...');
      
      const clientProcess = spawn('npm', ['start'], {
        cwd: path.join(__dirname, '..', 'client'),
        stdio: 'pipe',
        shell: this.isWindows,
        env: {
          ...process.env,
          PORT: this.clientPort.toString(),
          BROWSER: 'none'
        }
      });

      this.processes.push(clientProcess);

      clientProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          this.log(`[CLIENT] ${message}`);
        }
      });

      clientProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          this.log(`[CLIENT] ${message}`, 'warning');
        }
      });

      // 等待客户端启动
      setTimeout(() => {
        this.checkPort(this.clientPort).then(isRunning => {
          if (isRunning) {
            this.log('前端应用启动成功', 'success');
            resolve();
          } else {
            reject(new Error('前端应用启动失败'));
          }
        });
      }, 10000);
    });
  }

  async cleanup() {
    this.log('清理端口占用...');
    
    const serverRunning = await this.checkPort(this.serverPort);
    const clientRunning = await this.checkPort(this.clientPort);

    if (serverRunning) {
      this.log(`清理端口 ${this.serverPort}...`);
      await this.killPortProcess(this.serverPort);
    }

    if (clientRunning) {
      this.log(`清理端口 ${this.clientPort}...`);
      await this.killPortProcess(this.clientPort);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  setupSignalHandlers() {
    const cleanup = () => {
      this.log('正在关闭服务...', 'warning');
      
      this.processes.forEach(process => {
        if (process && !process.killed) {
          process.kill();
        }
      });

      setTimeout(() => {
        this.log('服务已关闭', 'success');
        process.exit(0);
      }, 2000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  showInfo() {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 ProdSync 生产项目管理系统');
    console.log('='.repeat(50));
    console.log(`📱 前端地址: http://localhost:${this.clientPort}`);
    console.log(`🔧 后端地址: http://localhost:${this.serverPort}`);
    console.log(`🏥 健康检查: http://localhost:${this.serverPort}/health`);
    console.log('='.repeat(50));
    console.log('📋 默认账户:');
    console.log('   管理员: admin / admin123');
    console.log('   调度员: scheduler01 / test123');
    console.log('   领导: leader01 / test123');
    console.log('='.repeat(50));
    console.log('⚡ 按 Ctrl+C 停止服务');
    console.log('='.repeat(50) + '\n');
  }

  async start() {
    try {
      this.log('ProdSync 启动中...', 'info');
      this.setupSignalHandlers();
      
      // 检查依赖
      const depsOk = await this.checkDependencies();
      if (!depsOk) {
        return;
      }

      // 清理端口
      await this.cleanup();

      // 启动服务器
      await this.startServer();

      // 启动客户端
      await this.startClient();

      // 显示启动信息
      this.showInfo();

      // 保持进程运行
      await new Promise(() => {});
      
    } catch (error) {
      this.log(`启动失败: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 主程序
if (require.main === module) {
  const launcher = new ProdSyncLauncher();
  launcher.start();
}

module.exports = ProdSyncLauncher; 