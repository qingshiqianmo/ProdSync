#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ProdSyncInstaller {
  constructor() {
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';
    this.rootDir = path.join(__dirname, '..');
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

  async runCommand(command, args, cwd, description) {
    return new Promise((resolve, reject) => {
      this.log(`${description}...`);
      
      const process = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        shell: this.isWindows
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.log(`${description} 完成`, 'success');
          resolve();
        } else {
          this.log(`${description} 失败`, 'error');
          reject(new Error(`${description} 失败，退出代码: ${code}`));
        }
      });

      process.on('error', (error) => {
        this.log(`${description} 错误: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async checkNodeVersion() {
    return new Promise((resolve, reject) => {
      const nodeProcess = spawn('node', ['--version'], { 
        stdio: 'pipe',
        shell: this.isWindows
      });

      let output = '';
      nodeProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      nodeProcess.on('close', (code) => {
        if (code === 0) {
          const version = output.trim().substring(1); // 去掉 'v' 前缀
          const major = parseInt(version.split('.')[0]);
          
          if (major >= 16) {
            this.log(`Node.js 版本: ${version}`, 'success');
            resolve(version);
          } else {
            this.log(`Node.js 版本过低: ${version}，需要 16.0.0 或更高版本`, 'error');
            reject(new Error('Node.js 版本不兼容'));
          }
        } else {
          this.log('无法检查Node.js版本', 'error');
          reject(new Error('Node.js 检查失败'));
        }
      });
    });
  }

  async install() {
    try {
      console.log('\n' + '='.repeat(50));
      console.log('📦 ProdSync 安装程序');
      console.log('='.repeat(50));

      // 检查Node.js版本
      await this.checkNodeVersion();

      // 检查项目结构
      this.log('检查项目结构...');
      const serverPath = path.join(this.rootDir, 'server');
      const clientPath = path.join(this.rootDir, 'client');

      if (!fs.existsSync(serverPath)) {
        throw new Error('未找到server目录');
      }

      if (!fs.existsSync(clientPath)) {
        throw new Error('未找到client目录');
      }

      // 安装根目录依赖
      await this.runCommand('npm', ['install'], this.rootDir, '安装根目录依赖');

      // 安装服务器依赖
      await this.runCommand('npm', ['install'], serverPath, '安装服务器依赖');

      // 安装客户端依赖
      await this.runCommand('npm', ['install'], clientPath, '安装客户端依赖');

      console.log('\n' + '='.repeat(50));
      console.log('✅ 安装完成！');
      console.log('='.repeat(50));
      console.log('🚀 使用以下命令启动：');
      console.log('   npm start                 # 使用npm启动');
      console.log('   node scripts/start.js     # 直接使用Node.js启动');
      
      if (this.isWindows) {
        console.log('   scripts\\start.bat         # Windows批处理脚本');
      } else {
        console.log('   ./scripts/start.sh        # Unix/Linux/Mac脚本');
      }
      
      console.log('\n🛑 停止服务：');
      console.log('   node scripts/stop.js      # 停止所有服务');
      console.log('='.repeat(50) + '\n');

    } catch (error) {
      this.log(`安装失败: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 主程序
if (require.main === module) {
  const installer = new ProdSyncInstaller();
  installer.install();
}

module.exports = ProdSyncInstaller; 