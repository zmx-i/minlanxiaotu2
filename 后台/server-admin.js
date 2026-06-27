// server-admin.js - 民兰校途 后台管理系统服务器（完整版）
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3456;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== 数据文件持久化 ==========
const DATA_FILE = path.join(__dirname, 'database.json');

function loadDatabase() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('加载数据文件失败，使用默认数据:', err.message);
    }
    return null;
}

function saveDatabase() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 2), 'utf8');
    } catch (err) {
        console.error('保存数据文件失败:', err.message);
    }
}

// ========== 数据存储 ==========
let database = loadDatabase() || {
    drivers: [
        { id: 1, name: '王师傅', plate: '甘A·8K632', phone: '13800000001', status: 'online', rating: 4.9, orders: 128, earnings: 5860, joinDate: '2024-01-15', auth: true, violations: 0, email: 'wang@example.com' },
        { id: 2, name: '张师傅', plate: '甘A·5L891', phone: '13800000002', status: 'online', rating: 4.8, orders: 96, earnings: 4230, joinDate: '2024-02-01', auth: true, violations: 1, email: 'zhang@example.com' },
        { id: 3, name: '刘师傅', plate: '甘A·3M456', phone: '13800000003', status: 'offline', rating: 4.7, orders: 72, earnings: 3120, joinDate: '2024-03-10', auth: true, violations: 0, email: 'liu@example.com' },
        { id: 4, name: '赵师傅', plate: '甘A·9K123', phone: '13800000004', status: 'online', rating: 4.6, orders: 54, earnings: 2450, joinDate: '2024-04-01', auth: false, violations: 2, email: 'zhao@example.com' },
        { id: 5, name: '陈师傅', plate: '甘A·2M777', phone: '13800000005', status: 'offline', rating: 4.5, orders: 31, earnings: 1580, joinDate: '2024-05-20', auth: true, violations: 0, email: 'chen@example.com' }
    ],
    passengers: [
        { id: 1, name: '杨同学', school: '西北民族大学', phone: '13800001111', trips: 28, rating: 4.9, joinDate: '2024-01-10', auth: true, status: 'active', email: 'yang@student.com' },
        { id: 2, name: '李同学', school: '兰州大学', phone: '13800002222', trips: 15, rating: 4.8, joinDate: '2024-02-15', auth: true, status: 'active', email: 'li@student.com' },
        { id: 3, name: '张同学', school: '西北民族大学', phone: '13800003333', trips: 8, rating: 4.5, joinDate: '2024-03-20', auth: false, status: 'pending', email: 'zhang@student.com' },
        { id: 4, name: '赵同学', school: '兰州理工大学', phone: '13800004444', trips: 22, rating: 4.7, joinDate: '2024-01-25', auth: true, status: 'active', email: 'zhao@student.com' },
        { id: 5, name: '王同学', school: '兰州大学', phone: '13800005555', trips: 5, rating: 4.2, joinDate: '2024-06-01', auth: false, status: 'blocked', email: 'wang@student.com' }
    ],
    orders: [
        { id: 'ORD-2024001', passenger: '杨同学', route: '榆中校区 → 中川机场', driver: '王师傅', amount: 60, status: 'active', time: '2024-06-27T14:30', type: '拼车', passengers: 3 },
        { id: 'ORD-2024002', passenger: '李同学', route: '榆中校区 → 兰州西站', driver: '张师傅', amount: 35, status: 'pending', time: '2024-06-27T15:00', type: '拼车', passengers: 2 },
        { id: 'ORD-2024003', passenger: '张同学', route: '榆中校区 → 兰州火车站', driver: '刘师傅', amount: 28, status: 'completed', time: '2024-06-27T13:00', type: '独立约车', passengers: 1 },
        { id: 'ORD-2024004', passenger: '赵同学', route: '榆中校区 → 中川机场', driver: '王师傅', amount: 55, status: 'active', time: '2024-06-27T16:00', type: '拼车', passengers: 4 },
        { id: 'ORD-2024005', passenger: '王同学', route: '榆中校区 → 兰州西站', driver: null, amount: 30, status: 'pending', time: '2024-06-27T17:00', type: '拼车', passengers: 2 }
    ],
    securityLogs: [
        { id: 1, type: '投诉', content: '司机态度不好', reporter: '杨同学', target: '王师傅', time: '2024-06-26T14:00', status: 'resolved' },
        { id: 2, type: '警告', content: '超速行驶', reporter: '系统', target: '张师傅', time: '2024-06-25T09:30', status: 'pending' },
        { id: 3, type: '投诉', content: '未按路线行驶', reporter: '李同学', target: '赵师傅', time: '2024-06-24T11:00', status: 'pending' },
        { id: 4, type: '警告', content: '未实名认证', reporter: '系统', target: '赵师傅', time: '2024-06-23T15:00', status: 'resolved' }
    ],
    payments: [
        { id: 'PAY-001', orderId: 'ORD-2024001', amount: 60, method: '微信支付', status: 'completed', time: '2024-06-27T14:35' },
        { id: 'PAY-002', orderId: 'ORD-2024003', amount: 28, method: '支付宝', status: 'completed', time: '2024-06-27T13:05' }
    ],
    system: {
        version: '1.0.0',
        apiCalls: 0,
        lastUpdate: new Date().toISOString()
    },
    nextId: { driver: 6, passenger: 6, order: 2024006, security: 5 }
};

// 定时自动保存
setInterval(saveDatabase, 60000); // 每分钟保存一次

// ========== 中间件：请求日志 ==========
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        database.system.apiCalls++;
    });
    next();
});

// ========== 安全中间件 ==========
app.use('/api', (req, res, next) => {
    // 简单的API密钥验证（生产环境应使用JWT）
    const apiKey = req.headers['x-api-key'];
    if (req.path === '/api/health' || req.path === '/api/public') {
        return next();
    }
    // 这里可以添加实际的认证逻辑
    next();
});

// ========== Helper 函数 ==========
function getStats() {
    const onlineDrivers = database.drivers.filter(d => d.status === 'online').length;
    const activePassengers = database.passengers.filter(p => p.status === 'active').length;
    const activeOrders = database.orders.filter(o => o.status === 'active').length;
    const pendingOrders = database.orders.filter(o => o.status === 'pending').length;
    const completedOrders = database.orders.filter(o => o.status === 'completed').length;
    const totalEarnings = database.drivers.reduce((sum, d) => sum + (d.earnings || 0), 0);
    const avgRating = database.drivers.length > 0 
        ? (database.drivers.reduce((sum, d) => sum + d.rating, 0) / database.drivers.length).toFixed(1)
        : '0.0';
    const pendingReviews = database.securityLogs.filter(l => l.status === 'pending').length;

    return {
        totalDrivers: database.drivers.length,
        onlineDrivers,
        offlineDrivers: database.drivers.length - onlineDrivers,
        totalPassengers: database.passengers.length,
        activePassengers,
        pendingPassengers: database.passengers.filter(p => p.status === 'pending').length,
        blockedPassengers: database.passengers.filter(p => p.status === 'blocked').length,
        totalOrders: database.orders.length,
        activeOrders,
        pendingOrders,
        completedOrders,
        totalEarnings,
        avgRating: parseFloat(avgRating),
        pendingReviews,
        totalRevenue: database.payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        orderStats: { active: activeOrders, pending: pendingOrders, completed: completedOrders }
    };
}

function validateDriverData(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push('司机姓名至少2个字符');
    if (!data.plate || !/^[\u4e00-\u9fa5][A-Z]·[A-Z0-9]{4,5}$/.test(data.plate)) errors.push('车牌号格式不正确（示例：甘A·8K632）');
    if (!data.phone || !/^1[3-9]\d{9}$/.test(data.phone)) errors.push('手机号格式不正确');
    return errors;
}

function validatePassengerData(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push('乘客姓名至少2个字符');
    if (!data.school || data.school.trim().length < 2) errors.push('学校名称至少2个字符');
    if (!data.phone || !/^1[3-9]\d{9}$/.test(data.phone)) errors.push('手机号格式不正确');
    return errors;
}

// ========== API 路由 ==========

// 仪表盘
app.get('/api/admin/dashboard', (req, res) => {
    try {
        const stats = getStats();
        res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取仪表盘数据失败', error: err.message });
    }
});

// ===== 司机管理 CRUD =====
app.get('/api/admin/drivers', (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        let result = [...database.drivers];

        if (status) {
            result = result.filter(d => d.status === status);
        }
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(d => 
                d.name.toLowerCase().includes(q) ||
                d.plate.toLowerCase().includes(q) ||
                d.phone.includes(q) ||
                (d.email && d.email.toLowerCase().includes(q))
            );
        }

        const total = result.length;
        const paginated = result.slice((page - 1) * limit, page * limit);

        res.json({ 
            success: true, 
            data: paginated, 
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取司机列表失败', error: err.message });
    }
});

app.get('/api/admin/drivers/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const driver = database.drivers.find(d => d.id === id);
        if (!driver) {
            return res.status(404).json({ success: false, message: '司机不存在' });
        }
        // 获取该司机的订单
        const driverOrders = database.orders.filter(o => o.driver === driver.name);
        res.json({ success: true, data: { ...driver, orders: driverOrders } });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取司机详情失败', error: err.message });
    }
});

app.post('/api/admin/drivers', (req, res) => {
    try {
        const errors = validateDriverData(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: '数据验证失败', errors });
        }

        const { name, plate, phone, email } = req.body;
        
        // 检查重复
        if (database.drivers.some(d => d.plate === plate)) {
            return res.status(400).json({ success: false, message: '车牌号已存在' });
        }
        if (database.drivers.some(d => d.phone === phone)) {
            return res.status(400).json({ success: false, message: '手机号已存在' });
        }

        const newDriver = {
            id: database.nextId.driver++,
            name: name.trim(),
            plate: plate.trim(),
            phone,
            email: email || '',
            status: 'offline',
            rating: 5.0,
            orders: 0,
            earnings: 0,
            joinDate: new Date().toISOString().split('T')[0],
            auth: false,
            violations: 0
        };
        database.drivers.push(newDriver);
        saveDatabase();
        res.status(201).json({ success: true, message: '司机添加成功', data: newDriver });
    } catch (err) {
        res.status(500).json({ success: false, message: '添加司机失败', error: err.message });
    }
});

app.put('/api/admin/drivers/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = database.drivers.findIndex(d => d.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '司机不存在' });
        }

        const driver = database.drivers[index];
        const { name, plate, phone, email, status, auth, violations } = req.body;

        if (name) driver.name = name.trim();
        if (plate) {
            if (database.drivers.some(d => d.plate === plate && d.id !== id)) {
                return res.status(400).json({ success: false, message: '车牌号已被其他司机使用' });
            }
            driver.plate = plate.trim();
        }
        if (phone) {
            if (database.drivers.some(d => d.phone === phone && d.id !== id)) {
                return res.status(400).json({ success: false, message: '手机号已被其他司机使用' });
            }
            driver.phone = phone;
        }
        if (email !== undefined) driver.email = email;
        if (status) driver.status = status;
        if (auth !== undefined) driver.auth = auth;
        if (violations !== undefined) driver.violations = violations;

        saveDatabase();
        res.json({ success: true, message: '司机信息已更新', data: driver });
    } catch (err) {
        res.status(500).json({ success: false, message: '更新司机信息失败', error: err.message });
    }
});

app.delete('/api/admin/drivers/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = database.drivers.findIndex(d => d.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '司机不存在' });
        }

        const deleted = database.drivers.splice(index, 1)[0];
        saveDatabase();
        res.json({ success: true, message: '司机已删除', data: deleted });
    } catch (err) {
        res.status(500).json({ success: false, message: '删除司机失败', error: err.message });
    }
});

app.put('/api/admin/drivers/:id/status', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        
        if (!['online', 'offline'].includes(status)) {
            return res.status(400).json({ success: false, message: '状态值无效，只能为 online 或 offline' });
        }

        const driver = database.drivers.find(d => d.id === id);
        if (!driver) {
            return res.status(404).json({ success: false, message: '司机不存在' });
        }

        driver.status = status;
        saveDatabase();
        res.json({ success: true, message: `司机状态已改为${status === 'online' ? '在线' : '离线'}`, data: driver });
    } catch (err) {
        res.status(500).json({ success: false, message: '更新状态失败', error: err.message });
    }
});

// ===== 乘客管理 CRUD =====
app.get('/api/admin/passengers', (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        let result = [...database.passengers];

        if (status) {
            result = result.filter(p => p.status === status);
        }
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(q) ||
                p.school.toLowerCase().includes(q) ||
                p.phone.includes(q) ||
                (p.email && p.email.toLowerCase().includes(q))
            );
        }

        const total = result.length;
        const paginated = result.slice((page - 1) * limit, page * limit);

        res.json({ 
            success: true, 
            data: paginated, 
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取乘客列表失败', error: err.message });
    }
});

app.get('/api/admin/passengers/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const passenger = database.passengers.find(p => p.id === id);
        if (!passenger) {
            return res.status(404).json({ success: false, message: '乘客不存在' });
        }
        const passengerOrders = database.orders.filter(o => o.passenger === passenger.name);
        res.json({ success: true, data: { ...passenger, orders: passengerOrders } });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取乘客详情失败', error: err.message });
    }
});

app.post('/api/admin/passengers', (req, res) => {
    try {
        const errors = validatePassengerData(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: '数据验证失败', errors });
        }

        const { name, school, phone, email } = req.body;

        if (database.passengers.some(p => p.phone === phone)) {
            return res.status(400).json({ success: false, message: '手机号已存在' });
        }

        const newPassenger = {
            id: database.nextId.passenger++,
            name: name.trim(),
            school: school.trim(),
            phone,
            email: email || '',
            trips: 0,
            rating: 5.0,
            joinDate: new Date().toISOString().split('T')[0],
            auth: false,
            status: 'pending'
        };
        database.passengers.push(newPassenger);
        saveDatabase();
        res.status(201).json({ success: true, message: '乘客添加成功', data: newPassenger });
    } catch (err) {
        res.status(500).json({ success: false, message: '添加乘客失败', error: err.message });
    }
});

app.put('/api/admin/passengers/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = database.passengers.findIndex(p => p.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '乘客不存在' });
        }

        const passenger = database.passengers[index];
        const { name, school, phone, email, status, auth } = req.body;

        if (name) passenger.name = name.trim();
        if (school) passenger.school = school.trim();
        if (phone) {
            if (database.passengers.some(p => p.phone === phone && p.id !== id)) {
                return res.status(400).json({ success: false, message: '手机号已被其他乘客使用' });
            }
            passenger.phone = phone;
        }
        if (email !== undefined) passenger.email = email;
        if (status) passenger.status = status;
        if (auth !== undefined) passenger.auth = auth;

        saveDatabase();
        res.json({ success: true, message: '乘客信息已更新', data: passenger });
    } catch (err) {
        res.status(500).json({ success: false, message: '更新乘客信息失败', error: err.message });
    }
});

app.delete('/api/admin/passengers/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = database.passengers.findIndex(p => p.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '乘客不存在' });
        }

        const deleted = database.passengers.splice(index, 1)[0];
        saveDatabase();
        res.json({ success: true, message: '乘客已删除', data: deleted });
    } catch (err) {
        res.status(500).json({ success: false, message: '删除乘客失败', error: err.message });
    }
});

// ===== 订单管理 CRUD =====
app.get('/api/admin/orders', (req, res) => {
    try {
        const { status, driver, passenger, page = 1, limit = 20 } = req.query;
        let result = [...database.orders];

        if (status) result = result.filter(o => o.status === status);
        if (driver) result = result.filter(o => o.driver === driver);
        if (passenger) result = result.filter(o => o.passenger === passenger);

        // 按时间排序（最新的在前）
        result.sort((a, b) => new Date(b.time) - new Date(a.time));

        const total = result.length;
        const paginated = result.slice((page - 1) * limit, page * limit);

        res.json({ 
            success: true, 
            data: paginated, 
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取订单列表失败', error: err.message });
    }
});

app.get('/api/admin/orders/:id', (req, res) => {
    try {
        const order = database.orders.find(o => o.id === req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }
        // 获取相关支付信息
        const payment = database.payments.find(p => p.orderId === order.id);
        res.json({ success: true, data: { ...order, payment: payment || null } });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取订单详情失败', error: err.message });
    }
});

app.put('/api/admin/orders/:id', (req, res) => {
    try {
        const order = database.orders.find(o => o.id === req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }

        const { status, driver, amount, passengers: pax } = req.body;
        
        if (status) {
            if (!['pending', 'active', 'completed', 'cancelled'].includes(status)) {
                return res.status(400).json({ success: false, message: '订单状态无效' });
            }
            order.status = status;
        }
        if (driver !== undefined) order.driver = driver;
        if (amount) {
            if (amount < 0 || amount > 10000) {
                return res.status(400).json({ success: false, message: '金额无效' });
            }
            order.amount = amount;
        }
        if (pax) order.passengers = pax;

        saveDatabase();
        res.json({ success: true, message: '订单已更新', data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: '更新订单失败', error: err.message });
    }
});

app.delete('/api/admin/orders/:id', (req, res) => {
    try {
        const index = database.orders.findIndex(o => o.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }

        const deleted = database.orders.splice(index, 1)[0];
        saveDatabase();
        res.json({ success: true, message: '订单已删除', data: deleted });
    } catch (err) {
        res.status(500).json({ success: false, message: '删除订单失败', error: err.message });
    }
});

// ===== 安全中心 =====
app.get('/api/admin/security', (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;
        let logs = [...database.securityLogs];

        if (status) logs = logs.filter(l => l.status === status);
        if (type) logs = logs.filter(l => l.type === type);

        logs.sort((a, b) => new Date(b.time) - new Date(a.time));

        const total = logs.length;
        const paginated = logs.slice((page - 1) * limit, page * limit);

        res.json({ 
            success: true, 
            data: {
                totalAlerts: database.securityLogs.length,
                resolvedAlerts: database.securityLogs.filter(l => l.status === 'resolved').length,
                pendingReviews: database.securityLogs.filter(l => l.status === 'pending').length,
                logs: paginated
            },
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取安全数据失败', error: err.message });
    }
});

app.put('/api/admin/security/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const log = database.securityLogs.find(l => l.id === id);
        if (!log) {
            return res.status(404).json({ success: false, message: '记录不存在' });
        }

        const { status, resolution } = req.body;
        if (status) {
            if (!['pending', 'resolved', 'dismissed'].includes(status)) {
                return res.status(400).json({ success: false, message: '状态值无效' });
            }
            log.status = status;
        }
        if (resolution) log.resolution = resolution;
        if (status === 'resolved' && !log.resolvedTime) {
            log.resolvedTime = new Date().toISOString();
        }

        saveDatabase();
        res.json({ success: true, message: '处理状态已更新', data: log });
    } catch (err) {
        res.status(500).json({ success: false, message: '更新安全记录失败', error: err.message });
    }
});

app.post('/api/admin/security', (req, res) => {
    try {
        const { type, content, reporter, target } = req.body;
        if (!type || !content || !reporter || !target) {
            return res.status(400).json({ success: false, message: '请填写完整信息' });
        }

        const newLog = {
            id: database.nextId.security++,
            type,
            content,
            reporter,
            target,
            time: new Date().toISOString(),
            status: 'pending'
        };
        database.securityLogs.push(newLog);
        saveDatabase();
        res.status(201).json({ success: true, message: '安全记录已添加', data: newLog });
    } catch (err) {
        res.status(500).json({ success: false, message: '添加安全记录失败', error: err.message });
    }
});

// ===== 支付管理 =====
app.get('/api/admin/payments', (req, res) => {
    try {
        const { status, method, page = 1, limit = 20 } = req.query;
        let result = [...database.payments];

        if (status) result = result.filter(p => p.status === status);
        if (method) result = result.filter(p => p.method === method);

        result.sort((a, b) => new Date(b.time) - new Date(a.time));

        const total = result.length;
        const paginated = result.slice((page - 1) * limit, page * limit);

        res.json({ 
            success: true, 
            data: paginated, 
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取支付记录失败', error: err.message });
    }
});

// ===== 系统信息 =====
app.get('/api/admin/system', (req, res) => {
    try {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        res.json({
            success: true,
            data: {
                ...database.system,
                uptime: `${hours}小时${minutes}分钟${seconds}秒`,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                memoryUsage: {
                    heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
                    heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
                    rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`
                },
                cpuUsage: process.cpuUsage(),
                databaseSize: `${database.drivers.length} 司机, ${database.passengers.length} 乘客, ${database.orders.length} 订单`
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取系统信息失败', error: err.message });
    }
});

// ===== 搜索功能 =====
app.get('/api/admin/search', (req, res) => {
    try {
        const { q, type } = req.query;
        if (!q || q.trim().length === 0) {
            return res.json({ success: true, data: { drivers: [], passengers: [], orders: [] } });
        }

        const query = q.toLowerCase().trim();
        const searchType = type || 'all';

        const results = {};

        if (searchType === 'all' || searchType === 'drivers') {
            results.drivers = database.drivers.filter(d => 
                d.name.toLowerCase().includes(query) || 
                d.plate.toLowerCase().includes(query) || 
                d.phone.includes(query) ||
                (d.email && d.email.toLowerCase().includes(query))
            );
        }

        if (searchType === 'all' || searchType === 'passengers') {
            results.passengers = database.passengers.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.school.toLowerCase().includes(query) || 
                p.phone.includes(query) ||
                (p.email && p.email.toLowerCase().includes(query))
            );
        }

        if (searchType === 'all' || searchType === 'orders') {
            results.orders = database.orders.filter(o => 
                o.id.toLowerCase().includes(query) || 
                o.passenger.toLowerCase().includes(query) || 
                o.route.toLowerCase().includes(query) ||
                (o.driver && o.driver.toLowerCase().includes(query))
            );
        }

        res.json({ success: true, data: results, query });
    } catch (err) {
        res.status(500).json({ success: false, message: '搜索失败', error: err.message });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(), 
        version: database.system.version,
        stats: getStats()
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: '服务器内部错误', 
        error: process.env.NODE_ENV === 'development' ? err.message : '请联系管理员'
    });
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 启动
const startServer = () => {
    console.log('\n' + '='.repeat(50));
    console.log('  民兰校途 - 后台管理系统');
    console.log('  Management Console v1.0.0');
    console.log('='.repeat(50));
    console.log();
    console.log(`  📊 管理后台: http://localhost:${PORT}/admin.html`);
    console.log(`  🚗 司机端:   http://localhost:${PORT}/driver.html`);
    console.log(`  🔌 API 健康: http://localhost:${PORT}/api/health`);
    console.log();
    console.log('  可用 API 接口:');
    const routes = [
        'GET  /api/admin/dashboard',
        'GET  /api/admin/drivers',
        'POST /api/admin/drivers',
        'GET  /api/admin/drivers/:id',
        'PUT  /api/admin/drivers/:id',
        'DELETE /api/admin/drivers/:id',
        'PUT  /api/admin/drivers/:id/status',
        'GET  /api/admin/passengers',
        'POST /api/admin/passengers',
        'GET  /api/admin/passengers/:id',
        'PUT  /api/admin/passengers/:id',
        'DELETE /api/admin/passengers/:id',
        'GET  /api/admin/orders',
        'GET  /api/admin/orders/:id',
        'PUT  /api/admin/orders/:id',
        'DELETE /api/admin/orders/:id',
        'GET  /api/admin/security',
        'POST /api/admin/security',
        'PUT  /api/admin/security/:id',
        'GET  /api/admin/payments',
        'GET  /api/admin/system',
        'GET  /api/admin/search?q=关键词'
    ];
    routes.forEach(route => console.log(`  ${route}`));
    console.log();
    console.log('  📍 服务器已启动...');

    app.listen(PORT, () => {
        console.log(`  ✅ 服务运行在 http://localhost:${PORT}`);
        console.log(`  💾 数据文件: ${DATA_FILE}`);
    });
};

startServer();