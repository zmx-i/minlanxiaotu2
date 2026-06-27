const express = require('express');
const path = require('path');
const os = require('os');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3456;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'minlan.db');
const JWT_SECRET = process.env.JWT_SECRET || 'minlan-xiaotu-secret-2024';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== 数据库初始化 ==========
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('数据库连接失败:', err.message);
  else console.log('数据库连接成功:', DB_PATH);
});

db.on('error', (err) => {
  console.error('数据库错误:', err.message);
});

db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    school TEXT DEFAULT '',
    student_id TEXT DEFAULT '',
    user_type TEXT DEFAULT 'student',
    car_plate TEXT DEFAULT '',
    verified INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);

  // 行程表
  db.run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_id INTEGER NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    from_lat REAL,
    from_lng REAL,
    to_lat REAL,
    to_lng REAL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    price REAL NOT NULL,
    seats INTEGER NOT NULL,
    note TEXT DEFAULT '',
    car_type TEXT DEFAULT '',
    car_color TEXT DEFAULT '',
    car_plate TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (publisher_id) REFERENCES users(id)
  )`);

  // 订单表
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER,
    passenger_id INTEGER NOT NULL,
    driver_id INTEGER,
    from_address TEXT DEFAULT '',
    to_address TEXT DEFAULT '',
    departure_time TEXT,
    price INTEGER DEFAULT 0,
    passengers INTEGER DEFAULT 1,
    type TEXT DEFAULT 'single',
    status TEXT DEFAULT 'pending',
    rating INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (passenger_id) REFERENCES users(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`);

  // 紧急联系人表
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // 验证码表
  db.run(`CREATE TABLE IF NOT EXISTS sms_codes (
    phone TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`);

  // 初始化体验账号
  const hash = bcrypt.hashSync('123456', 10);
  db.run(`INSERT OR IGNORE INTO users (phone, password, nickname, user_type, car_plate, school) VALUES 
    ('13800001111', '${hash}', '杨同学', 'student', '', '西北民族大学'),
    ('13800002222', '${hash}', '李同学', 'student', '', '兰州大学'),
    ('13800003333', '${hash}', '王师傅', 'driver', '甘A·8K632', '')
  `);
});

// ========== 工具函数 ==========
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: '请先登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: '登录已过期' });
  }
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
  });
}

// ========== 短信验证码（互亿无线） ==========
const IHUYI_API_ID = process.env.SMS_API_ID || 'C47521534';
const IHUYI_API_KEY = process.env.SMS_API_KEY || '30c204e77cc2bc6dd5728bfc789d08de';

const https = require('https');

function sendSmsViaIhuyi(phone, code) {
  return new Promise((resolve) => {
    const content = `您的验证码是：${code}。请不要把验证码泄露给其他人。`;
    const postData = new URLSearchParams({
      account: IHUYI_API_ID, password: IHUYI_API_KEY,
      mobile: phone, content, format: 'json',
    }).toString();
    const options = {
      hostname: 'api.ihuyi.com', port: 443,
      path: '/sms/Submit.json', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      }, timeout: 8000,
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        console.log('[SMS] 响应:', body);
        try { resolve(JSON.parse(body)); }
        catch {
          const cm = body.match(/<code>(\d+)<\/code>/);
          const mm = body.match(/<msg>([^<]+)<\/msg>/);
          resolve(cm ? { code: parseInt(cm[1]), msg: mm ? mm[1] : '' } : { code: -1, msg: '解析失败' });
        }
      });
    });
    req.on('error', (e) => {
      console.error('[SMS] HTTP错误:', e.message);
      resolve({ code: -1, msg: '网络错误' });
    });
    req.on('timeout', () => { req.destroy(); resolve({ code: -1, msg: '超时' }); });
    req.write(postData);
    req.end();
  });
}

// ========== API 路由 ==========

// —— 发送验证码 —
app.post('/api/sms/send', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.json({ success: false, message: '请输入正确的11位手机号' });
  }
  // 60秒防刷
  const existing = await dbGet('SELECT expires_at FROM sms_codes WHERE phone = ?', [phone]);
  if (existing && existing.expires_at > Date.now() - 54000) {
    return res.json({ success: false, message: '验证码已发送，请60秒后再试' });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`[SMS] 发送验证码: ${phone} → ${code}`);
  const result = await sendSmsViaIhuyi(phone, code);
  console.log(`[SMS] 互亿无线返回:`, result);
  const ihuyiSuccess = result.success === true || result.code === 2;
  if (ihuyiSuccess || (result.message && result.message.includes('已发送'))) {
    await dbRun('INSERT OR REPLACE INTO sms_codes (phone, code, expires_at) VALUES (?,?,?)',
      [phone, code, Date.now() + 300000]);
    res.json({ success: true, message: '验证码已发送' });
  } else {
    console.error('[SMS] 发送失败:', result);
    res.json({ success: false, message: result.message || result.msg || '发送失败，请重试' });
  }
});

// —— 校验验证码 —
app.post('/api/sms/verify', async (req, res) => {
  const { phone, code } = req.body;
  const record = await dbGet('SELECT code, expires_at FROM sms_codes WHERE phone = ?', [phone]);
  if (!record) return res.json({ success: false, message: '请先获取验证码' });
  if (Date.now() > record.expires_at) {
    await dbRun('DELETE FROM sms_codes WHERE phone = ?', [phone]);
    return res.json({ success: false, message: '验证码已过期' });
  }
  if (record.code !== String(code)) return res.json({ success: false, message: '验证码错误' });
  await dbRun('DELETE FROM sms_codes WHERE phone = ?', [phone]);
  res.json({ success: true });
});

// —— 注册 —
app.post('/api/auth/register', async (req, res) => {
  const { phone, password, nickname, user_type, car_plate, code } = req.body;
  if (!phone || !/^1\d{10}$/.test(phone)) return res.json({ success: false, message: '手机号格式错误' });
  if (!password || password.length < 6) return res.json({ success: false, message: '密码至少6位' });
  if (!code || code.length !== 6) return res.json({ success: false, message: '请输入6位验证码' });
  
  const smsRecord = await dbGet('SELECT code, expires_at FROM sms_codes WHERE phone = ?', [phone]);
  if (!smsRecord) return res.json({ success: false, message: '请先获取验证码' });
  if (Date.now() > smsRecord.expires_at) {
    await dbRun('DELETE FROM sms_codes WHERE phone = ?', [phone]);
    return res.json({ success: false, message: '验证码已过期' });
  }
  if (smsRecord.code !== String(code)) return res.json({ success: false, message: '验证码错误' });
  await dbRun('DELETE FROM sms_codes WHERE phone = ?', [phone]);
  
  const exists = await dbGet('SELECT id FROM users WHERE phone = ?', [phone]);
  if (exists) return res.json({ success: false, message: '该手机号已注册' });
  const hash = bcrypt.hashSync(password, 10);
  const type = user_type || 'student';
  const sql = `INSERT INTO users (phone, password, nickname, user_type, car_plate) VALUES (?, ?, ?, ?, ?)`;
  const params = [phone, hash, nickname || '', type, car_plate || ''];
  const result = await dbRun(sql, params);
  const token = jwt.sign({ userId: result.lastID, phone, userType: type }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, token, user: { id: result.lastID, phone, nickname: nickname || '', user_type: type, car_plate: car_plate || '' } });
});

// —— 密码登录 —
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  const user = await dbGet('SELECT * FROM users WHERE phone = ?', [phone]);
  if (!user) return res.json({ success: false, message: '用户不存在' });
  if (!bcrypt.compareSync(password, user.password)) return res.json({ success: false, message: '密码错误' });
  const token = jwt.sign({ userId: user.id, phone: user.phone, userType: user.user_type }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, token, user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar: user.avatar, school: user.school, verified: user.verified, user_type: user.user_type, car_plate: user.car_plate } });
});

// —— 短信验证码登录 —
app.post('/api/auth/login-sms', async (req, res) => {
  const { phone, code, user_type } = req.body;
  const record = await dbGet('SELECT code, expires_at FROM sms_codes WHERE phone = ?', [phone]);
  if (!record) return res.json({ success: false, message: '请先获取验证码' });
  if (Date.now() > record.expires_at) return res.json({ success: false, message: '验证码已过期' });
  if (record.code !== String(code)) return res.json({ success: false, message: '验证码错误' });
  await dbRun('DELETE FROM sms_codes WHERE phone = ?', [phone]);
  let user = await dbGet('SELECT * FROM users WHERE phone = ?', [phone]);
  if (!user) {
    // 自动注册
    const type = user_type || 'student';
    const result = await dbRun('INSERT INTO users (phone, password, user_type) VALUES (?, ?, ?)', [phone, bcrypt.hashSync('default123', 10), type]);
    user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
  }
  const token = jwt.sign({ userId: user.id, phone: user.phone, userType: user.user_type }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, token, user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar: user.avatar, school: user.school, verified: user.verified, user_type: user.user_type, car_plate: user.car_plate } });
});

// —— 获取当前用户信息 —
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  const user = await dbGet('SELECT id, phone, nickname, avatar, school, student_id, user_type, car_plate, verified, created_at FROM users WHERE id = ?', [req.user.userId]);
  if (!user) return res.json({ success: false, message: '用户不存在' });
  res.json({ success: true, user });
});

// —— 更新用户信息 —
app.post('/api/user/update', authMiddleware, async (req, res) => {
  const { nickname, avatar, school, student_id, user_type, car_plate } = req.body;
  const fields = [];
  const params = [];
  if (nickname !== undefined) { fields.push('nickname = ?'); params.push(nickname); }
  if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar); }
  if (school !== undefined) { fields.push('school = ?'); params.push(school); }
  if (student_id !== undefined) { fields.push('student_id = ?'); params.push(student_id); }
  if (user_type !== undefined) { fields.push('user_type = ?'); params.push(user_type); }
  if (car_plate !== undefined) { fields.push('car_plate = ?'); params.push(car_plate); }
  if (!fields.length) return res.json({ success: false, message: '没有要更新的字段' });
  params.push(req.user.userId);
  await dbRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ success: true });
});

// —— 绑定/更新车牌号 —
app.post('/api/user/carplate', authMiddleware, async (req, res) => {
  const { car_plate } = req.body;
  if (!car_plate || car_plate.length < 6) {
    return res.json({ success: false, message: '请输入有效的车牌号码' });
  }
  await dbRun('UPDATE users SET car_plate = ? WHERE id = ?', [car_plate, req.user.userId]);
  res.json({ success: true });
});

// —— 修改密码 —
app.post('/api/user/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.user.userId]);
  if (!bcrypt.compareSync(oldPassword, user.password)) return res.json({ success: false, message: '原密码错误' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await dbRun('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.userId]);
  res.json({ success: true });
});

// —— 发布行程 —
app.post('/api/trips/create', authMiddleware, async (req, res) => {
  const { from_address, to_address, from_lat, from_lng, to_lat, to_lng, date, time, price, seats, note, car_type, car_color, car_plate } = req.body;
  if (!from_address || !to_address || !date || !time) return res.json({ success: false, message: '请填写完整行程信息' });
  const result = await dbRun(`INSERT INTO trips
    (publisher_id, from_address, to_address, from_lat, from_lng, to_lat, to_lng, date, time, price, seats, note, car_type, car_color, car_plate)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.user.userId, from_address, to_address, from_lat||null, from_lng||null, to_lat||null, to_lng||null, date, time, price||0, seats||1, note||'', car_type||'', car_color||'', car_plate||'']);
  res.json({ success: true, tripId: result.lastID });
});

// —— 查询行程列表 —
app.get('/api/trips', async (req, res) => {
  const { from, to, date, status } = req.query;
  let sql = `SELECT t.*, u.nickname as publisher_name, u.phone as publisher_phone, u.avatar as publisher_avatar, u.verified as publisher_verified
    FROM trips t JOIN users u ON t.publisher_id = u.id WHERE t.status = 'active'`;
  const params = [];
  if (from) { sql += ' AND t.from_address LIKE ?'; params.push(`%${from}%`); }
  if (to) { sql += ' AND t.to_address LIKE ?'; params.push(`%${to}%`); }
  if (date) { sql += ' AND t.date = ?'; params.push(date); }
  sql += ' ORDER BY t.date ASC, t.time ASC LIMIT 200';
  const trips = await dbAll(sql, params);
  res.json({ success: true, trips });
});

// —— 查询我的行程（我发布的）—
app.get('/api/trips/my', authMiddleware, async (req, res) => {
  const trips = await dbAll(`SELECT t.*,
    (SELECT COUNT(*) FROM orders WHERE trip_id = t.id AND status != 'cancelled') as order_count
    FROM trips t WHERE t.publisher_id = ? ORDER BY t.created_at DESC`, [req.user.userId]);
  res.json({ success: true, trips });
});

// —— 查询我的订单（我预定的）—
app.get('/api/orders/my', authMiddleware, async (req, res) => {
  const orders = await dbAll(`SELECT o.*, t.*, u.nickname as publisher_name, u.phone as publisher_phone
    FROM orders o JOIN trips t ON o.trip_id = t.id JOIN users u ON t.publisher_id = u.id
    WHERE o.passenger_id = ? ORDER BY o.created_at DESC`, [req.user.userId]);
  res.json({ success: true, orders });
});

// —— 行程详情 —
app.get('/api/trips/:id', async (req, res) => {
  const trip = await dbGet(`SELECT t.*, u.nickname as publisher_name, u.phone as publisher_phone, u.avatar as publisher_avatar, u.verified as publisher_verified, u.school as publisher_school
    FROM trips t JOIN users u ON t.publisher_id = u.id WHERE t.id = ?`, [req.params.id]);
  if (!trip) return res.json({ success: false, message: '行程不存在' });
  const orders = await dbAll('SELECT * FROM orders WHERE trip_id = ? AND status != "cancelled"', [req.params.id]);
  res.json({ success: true, trip, orderCount: orders.length });
});

// —— 下单 —
app.post('/api/orders/create', authMiddleware, async (req, res) => {
  const { trip_id } = req.body;
  const trip = await dbGet('SELECT * FROM trips WHERE id = ?', [trip_id]);
  if (!trip) return res.json({ success: false, message: '行程不存在' });
  if (trip.publisher_id === req.user.userId) return res.json({ success: false, message: '不能预定自己的行程' });
  const existing = await dbGet('SELECT id FROM orders WHERE trip_id = ? AND passenger_id = ? AND status != "cancelled"', [trip_id, req.user.userId]);
  if (existing) return res.json({ success: false, message: '您已预定过此行程' });
  const orderCount = await dbGet('SELECT COUNT(*) as cnt FROM orders WHERE trip_id = ? AND status != "cancelled"', [trip_id]);
  if (orderCount.cnt >= trip.seats) return res.json({ success: false, message: '座位已满' });
  const result = await dbRun('INSERT INTO orders (trip_id, passenger_id, status) VALUES (?,?,?)', [trip_id, req.user.userId, 'confirmed']);
  res.json({ success: true, orderId: result.lastID });
});

// —— 取消订单 —
app.post('/api/orders/cancel', authMiddleware, async (req, res) => {
  const { order_id } = req.body;
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order || (order.passenger_id !== req.user.userId && !(await dbGet('SELECT id FROM trips WHERE id = ? AND publisher_id = ?', [order.trip_id, req.user.userId])))) {
    return res.json({ success: false, message: '无权操作' });
  }
  await dbRun('UPDATE orders SET status = "cancelled" WHERE id = ?', [order_id]);
  res.json({ success: true });
});

// —— 取消行程 —
app.post('/api/trips/cancel', authMiddleware, async (req, res) => {
  const { trip_id } = req.body;
  const trip = await dbGet('SELECT * FROM trips WHERE id = ? AND publisher_id = ?', [trip_id, req.user.userId]);
  if (!trip) return res.json({ success: false, message: '行程不存在或无权限' });
  await dbRun('UPDATE trips SET status = "cancelled" WHERE id = ?', [trip_id]);
  res.json({ success: true });
});

// —— 紧急联系人：列表 —
app.get('/api/contacts', authMiddleware, async (req, res) => {
  const contacts = await dbAll('SELECT * FROM contacts WHERE user_id = ? ORDER BY id ASC', [req.user.userId]);
  res.json({ success: true, contacts });
});

// —— 紧急联系人：添加 —
app.post('/api/contacts/add', authMiddleware, async (req, res) => {
  const { name, phone, relationship } = req.body;
  if (!name || !phone) return res.json({ success: false, message: '姓名和手机号为必填项' });
  const count = await dbGet('SELECT COUNT(*) as cnt FROM contacts WHERE user_id = ?', [req.user.userId]);
  if (count.cnt >= 10) return res.json({ success: false, message: '最多添加10个紧急联系人' });
  const result = await dbRun('INSERT INTO contacts (user_id, name, phone, relationship) VALUES (?,?,?,?)',
    [req.user.userId, name, phone, relationship || '']);
  res.json({ success: true, contactId: result.lastID });
});

// —— 紧急联系人：删除 —
app.post('/api/contacts/delete', authMiddleware, async (req, res) => {
  const { contact_id } = req.body;
  await dbRun('DELETE FROM contacts WHERE id = ? AND user_id = ?', [contact_id, req.user.userId]);
  res.json({ success: true });
});

// ========== 司机端API ==========

// —— 司机工作台数据 —
app.get('/api/driver/dashboard', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'driver') return res.json({ success: false, message: '无权访问' });
  
  const today = new Date().toISOString().split('T')[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().split('T')[0];
  
  const todayOrders = await dbGet('SELECT COUNT(*) as cnt FROM orders WHERE driver_id = ? AND DATE(created_at) = ?', [req.user.userId, today]);
  const todayEarnings = await dbGet('SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE driver_id = ? AND DATE(created_at) = ? AND status = "completed"', [req.user.userId, today]);
  const weekEarnings = await dbGet('SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE driver_id = ? AND DATE(created_at) >= ? AND status = "completed"', [req.user.userId, weekStart]);
  const totalOrders = await dbGet('SELECT COUNT(*) as cnt FROM orders WHERE driver_id = ? AND status = "completed"', [req.user.userId]);
  const rating = await dbGet('SELECT COALESCE(AVG(rating), 5) as avg FROM orders WHERE driver_id = ? AND rating IS NOT NULL', [req.user.userId]);
  
  const newOrders = await dbAll('SELECT o.*, u.name as passenger_name, u.phone as passenger_phone, u.school FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.driver_id IS NULL AND o.status = "pending" ORDER BY o.created_at DESC LIMIT 10');
  const activeOrders = await dbAll('SELECT o.*, u.name as passenger_name, u.phone as passenger_phone, u.school FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.driver_id = ? AND o.status = "accepted" ORDER BY o.created_at DESC', [req.user.userId]);
  const recentEarnings = await dbAll('SELECT o.price as amount, o.from_address || " → " || o.to_address as route, DATE(o.created_at) as date, u.name as passenger FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.driver_id = ? AND o.status = "completed" ORDER BY o.created_at DESC LIMIT 10', [req.user.userId]);
  
  res.json({
    success: true,
    stats: {
      today_orders: todayOrders.cnt,
      today_earnings: todayEarnings.total,
      week_earnings: weekEarnings.total,
      total_completed: totalOrders.cnt,
      rating: rating.avg.toFixed(1),
      completion_rate: totalOrders.cnt > 0 ? 100 : 0
    },
    new_orders: newOrders.map(o => ({
      id: o.id,
      from_address: o.from_address,
      to_address: o.to_address,
      departure_time: o.departure_time,
      price: o.price,
      passengers: o.passengers,
      type: o.type,
      status: o.status,
      passenger_name: o.passenger_name,
      passenger_phone: o.passenger_phone,
      school: o.school
    })),
    active_orders: activeOrders.map(o => ({
      id: o.id,
      from_address: o.from_address,
      to_address: o.to_address,
      departure_time: o.departure_time,
      price: o.price,
      passengers: o.passengers,
      type: o.type,
      status: o.status,
      passenger_name: o.passenger_name,
      passenger_phone: o.passenger_phone,
      school: o.school
    })),
    recent_earnings: recentEarnings.map(e => ({
      amount: e.amount,
      route: e.route,
      date: e.date,
      passenger: e.passenger
    }))
  });
});

// —— 司机订单列表 —
app.get('/api/driver/orders', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'driver') return res.json({ success: false, message: '无权访问' });
  
  const { status } = req.query;
  let whereClause = 'driver_id = ?';
  let params = [req.user.userId];
  
  if (status && status !== 'all') {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  
  const orders = await dbAll(`SELECT o.*, u.name as passenger_name, u.phone as passenger_phone FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE ${whereClause} ORDER BY o.created_at DESC`, params);
  
  res.json({
    success: true,
    orders: orders.map(o => ({
      id: o.id,
      from_address: o.from_address,
      to_address: o.to_address,
      departure_time: o.departure_time,
      price: o.price,
      passengers: o.passengers,
      type: o.type,
      status: o.status,
      passenger_name: o.passenger_name,
      passenger_phone: o.passenger_phone,
      created_at: o.created_at
    }))
  });
});

// —— 接单 —
app.post('/api/driver/orders/:id/accept', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'driver') return res.json({ success: false, message: '无权访问' });
  
  const orderId = req.params.id;
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
  
  if (!order) return res.json({ success: false, message: '订单不存在' });
  if (order.status !== 'pending') return res.json({ success: false, message: '订单状态错误' });
  if (order.driver_id) return res.json({ success: false, message: '订单已被接单' });
  
  await dbRun('UPDATE orders SET driver_id = ?, status = "accepted" WHERE id = ?', [req.user.userId, orderId]);
  res.json({ success: true });
});

// —— 拒绝订单 —
app.post('/api/driver/orders/:id/decline', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'driver') return res.json({ success: false, message: '无权访问' });
  
  const orderId = req.params.id;
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
  
  if (!order) return res.json({ success: false, message: '订单不存在' });
  if (order.status !== 'pending') return res.json({ success: false, message: '订单状态错误' });
  
  res.json({ success: true });
});

// —— 完成订单 —
app.post('/api/driver/orders/:id/complete', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'driver') return res.json({ success: false, message: '无权访问' });
  
  const orderId = req.params.id;
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
  
  if (!order) return res.json({ success: false, message: '订单不存在' });
  if (order.driver_id !== req.user.userId) return res.json({ success: false, message: '不是您的订单' });
  if (order.status !== 'accepted') return res.json({ success: false, message: '订单状态错误' });
  
  await dbRun('UPDATE orders SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId]);
  res.json({ success: true });
});

// —— 司机收入统计 —
app.get('/api/driver/earnings', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'driver') return res.json({ success: false, message: '无权访问' });
  
  const { period } = req.query;
  let dateFilter = '';
  
  if (period === 'today') {
    const today = new Date().toISOString().split('T')[0];
    dateFilter = `AND DATE(created_at) = "${today}"`;
  } else if (period === 'week') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];
    dateFilter = `AND DATE(created_at) >= "${weekStart}"`;
  } else if (period === 'month') {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    dateFilter = `AND DATE(created_at) >= "${monthStart}"`;
  }
  
  const earnings = await dbAll(`SELECT o.price as amount, o.from_address || " → " || o.to_address as route, DATE(o.created_at) as date, u.name as passenger FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.driver_id = ? AND o.status = "completed" ${dateFilter} ORDER BY o.created_at DESC`, [req.user.userId]);
  
  const total = earnings.reduce((sum, e) => sum + e.amount, 0);
  const count = earnings.length;
  
  res.json({
    success: true,
    summary: {
      total,
      count,
      avg: count > 0 ? Math.round(total / count) : 0
    },
    details: earnings.map(e => ({
      amount: e.amount,
      route: e.route,
      date: e.date,
      passenger: e.passenger
    }))
  });
});

// ========== 静态文件服务 ==========
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: '接口不存在' });
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== 启动 ==========
const server = app.listen(PORT, () => {
  console.log(`民兰校途服务器启动: http://localhost:${PORT}`);
  console.log(`SQLite数据库: ${DB_PATH}`);
});

server.on('error', (err) => {
  console.error('服务器启动失败:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});
