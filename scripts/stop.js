#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

class ProdSyncStopper {
  constructor() {
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';
    this.serverPort = 5001;
    this.clientPort = 5000;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
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
        const command = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /f /pid %a`;
        exec(command, (error) => {
          resolve(!error);
        });
      } else {
        const command = `lsof -ti:${port} | xargs kill -9`;
        exec(command, (error) => {
          resolve(!error);
        });
      }
    });
  }

  async stop() {
    console.log('\n' + '='.repeat(50));
    console.log('🛑 ProdSync 停止服务');
    console.log('='.repeat(50));

    this.log('正在检查运行中的服务...');

    const serverRunning = await this.checkPort(this.serverPort);
    const clientRunning = await this.checkPort(this.clientPort);

    if (!serverRunning && !clientRunning) {
      this.log('没有找到运行中的服务', 'warning');
      return;
    }

    if (serverRunning) {
      this.log(`正在停止后端服务 (端口 ${this.serverPort})...`);
      const serverStopped = await this.killPortProcess(this.serverPort);
      if (serverStopped) {
        this.log('后端服务已停止', 'success');
      } else {
        this.log('停止后端服务失败', 'error');
      }
    }

    if (clientRunning) {
      this.log(`正在停止前端服务 (端口 ${this.clientPort})...`);
      const clientStopped = await this.killPortProcess(this.clientPort);
      if (clientStopped) {
        this.log('前端服务已停止', 'success');
      } else {
        this.log('停止前端服务失败', 'error');
      }
    }

    // 等待进程完全关闭
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 再次检查
    const serverStillRunning = await this.checkPort(this.serverPort);
    const clientStillRunning = await this.checkPort(this.clientPort);

    if (!serverStillRunning && !clientStillRunning) {
      this.log('所有服务已成功停止', 'success');
    } else {
      this.log('部分服务可能仍在运行，请手动检查', 'warning');
    }

    console.log('='.repeat(50) + '\n');
  }
}

// 主程序
if (require.main === module) {
  const stopper = new ProdSyncStopper();
  stopper.stop();
}

module.exports = ProdSyncStopper; 