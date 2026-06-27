# 民兰校途 - 部署指南

## 架构说明

```
用户浏览器 → 云服务器 (server.js)
                 ├── 静态文件 (index.html, share.html)
                 ├── API 接口 (/api/auth/*, /api/trips/*, /api/contacts/*)
                 └── SQLite 数据库 (minlan.db)
```

## 方案一：腾讯云轻量应用服务器（推荐，9.9元/月学生优惠）

### 1. 购买服务器
- 登录腾讯云控制台 → 轻量应用服务器
- 选择"学生优惠"套餐（2核2G，约9.9元/月）
- 操作系统选择 Ubuntu 22.04

### 2. 连接服务器
```bash
# 用SSH连接（替换为你的服务器IP）
ssh ubuntu@你的服务器IP
```

### 3. 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # 确认安装成功
```

### 4. 上传项目
```bash
# 在服务器上创建目录
mkdir -p ~/minlan-xiaotu
cd ~/minlan-xiaotu

# 方法1：用 scp 上传（在你的电脑上执行）
scp -r D:/民兰校途-deploy/* ubuntu@你的服务器IP:~/minlan-xiaotu/

# 方法2：用 GitHub 克隆（如果已推送到GitHub）
git clone 你的仓库地址 ~/minlan-xiaotu
```

### 5. 安装依赖并启动
```bash
cd ~/minlan-xiaotu
npm install
# 测试启动
node server.js
# 看到"民兰校途服务器启动"说明成功
# Ctrl+C 停止
```

### 6. 用 PM2 保持后台运行
```bash
sudo npm install -g pm2
pm2 start server.js --name minlan-xiaotu
pm2 save
pm2 startup  # 开机自启
```

### 7. 开放端口
- 腾讯云控制台 → 轻量应用服务器 → 防火墙
- 添加规则：TCP 端口 3456，来源 0.0.0.0/0

### 8. 访问
```
http://你的服务器IP:3456
```

---

## 方案二：阿里云ECS学生优惠

流程类似，在阿里云"飞天加速计划"申请免费ECS。

---

## 方案三：免费方案（Render.com）

### 限制
- 免费版15分钟无访问会休眠
- SQLite数据在休眠后丢失（需升级付费版获得持久存储）

### 步骤
1. 将代码推送到 GitHub
2. 登录 render.com，创建新的 Web Service
3. 连接 GitHub 仓库
4. 配置：
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. 部署完成后获得 URL: `https://minlan-xiaotu.onrender.com`

---

## 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3456 |
| DB_PATH | 数据库文件路径 | :memory: (内存) |
| JWT_SECRET | JWT签名密钥 | minlan-xiaotu-secret-2024 |
| SMS_API_ID | 互亿无线API ID | 48441034 |
| SMS_API_KEY | 互亿无线API Key | 124bcb20b889635d2a9d12ea0e855383 |

### 生产环境必须修改
```bash
# 设置持久化数据库路径
export DB_PATH=/home/ubuntu/minlan-xiaotu/minlan.db

# 设置安全的JWT密钥
export JWT_SECRET=你的随机密钥字符串

# 重启服务
pm2 restart minlan-xiaotu
```

---

## 常见问题

### Q: 别人访问不了？
1. 检查防火墙是否开放3456端口
2. 检查服务器安全组规则
3. 确认 server.js 正在运行：`pm2 status`

### Q: 数据丢失？
- 确认 `DB_PATH` 设置为持久路径（不是 :memory:）
- 重启服务器不会丢数据，只有重新部署代码时注意不要删除 minlan.db

### Q: 短信验证码收不到？
- 互亿无线API凭据可能无效（错误码4053）
- 临时方案：使用演示验证码 666666
- 长期方案：更换为腾讯云短信或阿里云短信
