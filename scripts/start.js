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
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // 没有找到端口占用，返回false
          resolve(false);
        } else {
          // 检查输出是否包含LISTENING状态
          const hasListening = stdout.includes('LISTENING');
          resolve(hasListening);
        }
      });
    });
  }

  async killPortProcess(port) {
    return new Promise((resolve) => {
      if (this.isWindows) {
        // Windows下先查找进程ID，然后终止
        exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
          if (error || !stdout.trim()) {
            resolve();
            return;
          }
          
          // 解析输出获取PID
          const lines = stdout.trim().split('\n');
          const pids = [];
          
          for (const line of lines) {
            if (line.includes('LISTENING')) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                pids.push(pid);
              }
            }
          }
          
          if (pids.length === 0) {
            resolve();
            return;
          }
          
          // 终止所有相关进程
          const killPromises = pids.map(pid => {
            return new Promise((killResolve) => {
              exec(`taskkill /F /PID ${pid}`, () => {
                killResolve();
              });
            });
          });
          
          Promise.all(killPromises).then(() => {
            resolve();
          });
        });
      } else {
        exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
          // 忽略错误，因为可能没有进程在运行
          resolve();
        });
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
        stdio: 'inherit',
        shell: this.isWindows
      });

      rootInstall.on('close', (code) => {
        if (code === 0) {
          this.log('根目录依赖安装完成', 'success');
          this.log('安装服务器依赖...');
          const serverInstall = spawn('npm', ['install'], { 
            cwd: path.join(__dirname, '..', 'server'),
            stdio: 'inherit',
            shell: this.isWindows
          });

          serverInstall.on('close', (code) => {
            if (code === 0) {
              this.log('服务器依赖安装完成', 'success');
              this.log('安装客户端依赖...');
              const clientInstall = spawn('npm', ['install'], { 
                cwd: path.join(__dirname, '..', 'client'),
                stdio: 'inherit',
                shell: this.isWindows
              });

              clientInstall.on('close', (code) => {
                if (code === 0) {
                  this.log('客户端依赖安装完成', 'success');
                  this.log('所有依赖安装完成', 'success');
                  resolve();
                } else {
                  this.log('客户端依赖安装失败', 'error');
                  reject(new Error('客户端依赖安装失败'));
                }
              });

              clientInstall.on('error', (error) => {
                this.log(`客户端依赖安装出错: ${error.message}`, 'error');
                reject(error);
              });
            } else {
              this.log('服务器依赖安装失败', 'error');
              reject(new Error('服务器依赖安装失败'));
            }
          });

          serverInstall.on('error', (error) => {
            this.log(`服务器依赖安装出错: ${error.message}`, 'error');
            reject(error);
          });
        } else {
          this.log('根目录依赖安装失败', 'error');
          reject(new Error('根目录依赖安装失败'));
        }
      });

      rootInstall.on('error', (error) => {
        this.log(`根目录依赖安装出错: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.log('启动后端服务器...');
      
      // Windows下使用start命令而不是dev命令，避免nodemon的问题
      const startCommand = this.isWindows ? 'start' : 'dev';
      
      const serverProcess = spawn('npm', ['run', startCommand], {
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

      serverProcess.on('error', (error) => {
        this.log(`[SERVER] 启动错误: ${error.message}`, 'error');
        reject(error);
      });

      // 等待服务器启动
      let checkCount = 0;
      const maxChecks = 15; // 最多检查15次，共1.5分钟
      
      const checkInterval = setInterval(async () => {
        checkCount++;
        const isRunning = await this.checkPort(this.serverPort);
        
        if (isRunning) {
          clearInterval(checkInterval);
          this.log('后端服务器启动成功', 'success');
          resolve();
        } else if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          this.log('后端服务器启动超时', 'error');
          reject(new Error('后端服务器启动超时'));
        } else {
          this.log(`[SERVER] 等待启动中... (${checkCount}/${maxChecks})`, 'info');
        }
      }, 6000); // 每6秒检查一次
    });
  }

  async startClient() {
    return new Promise((resolve, reject) => {
      this.log('启动前端应用...');
      
      // 根据平台选择启动命令
      const startCommand = this.isWindows ? 'start:windows' : 'start';
      
      const clientProcess = spawn('npm', ['run', startCommand], {
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

      clientProcess.on('error', (error) => {
        this.log(`[CLIENT] 启动错误: ${error.message}`, 'error');
        reject(error);
      });

      // 等待客户端启动
      let checkCount = 0;
      const maxChecks = 30; // 最多检查30次，共3分钟
      
      const checkInterval = setInterval(async () => {
        checkCount++;
        const isRunning = await this.checkPort(this.clientPort);
        
        if (isRunning) {
          clearInterval(checkInterval);
          this.log('前端应用启动成功', 'success');
          resolve();
        } else if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          this.log('前端应用启动超时', 'error');
          reject(new Error('前端应用启动超时'));
        } else {
          this.log(`[CLIENT] 等待启动中... (${checkCount}/${maxChecks})`, 'info');
        }
      }, 6000); // 每6秒检查一次
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
      this.log(`运行平台: ${this.platform}`, 'info');
      this.log(`Node.js版本: ${process.version}`, 'info');
      this.setupSignalHandlers();
      
      // 检查依赖
      this.log('检查项目依赖...', 'info');
      const depsOk = await this.checkDependencies();
      if (!depsOk) {
        this.log('依赖检查失败', 'error');
        return;
      }

      // 清理端口
      this.log('清理可能的端口占用...', 'info');
      await this.cleanup();

      // 启动服务器
      this.log('准备启动后端服务...', 'info');
      await this.startServer();

      // 启动客户端
      this.log('准备启动前端服务...', 'info');
      await this.startClient();

      // 显示启动信息
      this.showInfo();

      // 保持进程运行
      this.log('服务启动完成，按Ctrl+C停止服务', 'success');
      await new Promise(() => {});
      
    } catch (error) {
      this.log(`启动失败: ${error.message}`, 'error');
      this.log('错误详情:', 'error');
      console.error(error);
      
      // 清理已启动的进程
      this.log('清理已启动的进程...', 'warning');
      this.processes.forEach(process => {
        if (process && !process.killed) {
          process.kill();
        }
      });
      
      this.log('启动失败，请检查错误信息', 'error');
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