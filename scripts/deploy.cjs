#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 读取部署配置
const configPath = path.resolve(__dirname, '../deploy.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const { server, local } = config;
const { host, username, remotePath } = server;
const { distPath } = local;

console.log('开始部署到服务器...');

try {
  // 1. 确保代码是最新的（如果使用 Git）
  console.log('1. 检查代码更新...');
  // execSync('git pull origin main', { stdio: 'inherit' });

  // 2. 安装依赖
  console.log('2. 安装依赖...');
  execSync('npm install', { stdio: 'inherit' });

  // 3. 构建项目
  console.log('3. 构建项目...');
  execSync('npm run build', { stdio: 'inherit' });

  // 4. 部署到服务器
  console.log('4. 部署到服务器...');
  
  // 检查本地构建目录是否存在
  if (!fs.existsSync(distPath)) {
    throw new Error(`构建目录 ${distPath} 不存在，请先构建项目`);
  }
  
  // 创建远程目录（如果不存在）
  console.log(`  创建远程目录 ${remotePath}...`);
  execSync(`ssh ${username}@${host} "mkdir -p ${remotePath}"`, { stdio: 'inherit' });
  
  // 清空远程目录中的旧文件
  console.log(`  清空远程目录 ${remotePath}...`);
  execSync(`ssh ${username}@${host} "rm -rf ${remotePath}/*"`, { stdio: 'inherit' });
  
  // 使用 scp 上传文件到服务器
  console.log(`  上传文件到 ${username}@${host}:${remotePath}/...`);
  execSync(`scp -r ${distPath}/* ${username}@${host}:${remotePath}/`, { stdio: 'inherit' });
  
  console.log('部署完成！');
  console.log(`应用已部署到 http://${host}/`);
} catch (error) {
  console.error('部署失败:', error.message);
  process.exit(1);
}