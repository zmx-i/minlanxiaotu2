// server-admin.js - 民兰校途 后台管理系统服务器
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3456;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== 数据存储 ==========
let database = {
    drivers: [
        { id: 1, name: '王师傅', plate: '甘A·8K632', phone: '13800000001', status: 'online', rating: 4.9, orders: 128, earnings: 5860, joinDate: '2024-01-15', auth: true, violations: 0 },
        { id: 2, name: '张师傅', plate: '甘A·5L891', phone: '13800000002', status: 'online', rating: 4.8, orders: 96, earnings: 4230, joinDate: '2024-02-01', auth: true, violations: 1 },
        { id: 3, name: '刘师傅', plate: '甘A·3M456', phone: '13800000003', status: 'offline', rating: 4.7, orders: 72, earnings: 3120, joinDate: '2024-03-10', auth: true, violations: 0 },
        { id: 4, name: '赵师傅', plate: '甘A·9K123', phone: '13800000004', status: 'online', rating: 4.6, orders: 54, earnings: 2450, joinDate: '2024-04-01', auth: false, violations: 2 },
        { id: 5, name: '陈师傅', plate: '甘A·2M777', phone: '13800000005', status: 'offline', rating: 4.5, orders: 31, earnings: 1580, joinDate: '2024-05-20', auth: true, violations: 0 }
    ],
    passengers: [
        { id: 1, name: '杨同学', school: '西北民族大学', phone: '13800001111', trips: 28, rating: 4.9, joinDate: '2024-01-10', auth: true, status: 'active' },
        { id: 2, name: '李同学', school: '兰州大学', phone: '13800002222', trips: 15, rating: 4.8, joinDate: '2024-02-15', auth: true, status: 'active' },
        { id: 3, name: '张同学', school: '西北民族大学', phone: '13800003333', trips: 8, rating: 4.5, joinDate: '2024-03-20', auth: false, status: 'pending' },
        { id: 4, name: '赵同学', school: '兰州理工大学', phone: '13800004444', trips: 22, rating: 4.7, joinDate: '2024-01-25', auth: true, status: 'active' },
        { id: 5, name: '王同学', school: '兰州大学', phone: '13800005555', trips: 5, rating: 4.2, joinDate: '2024-06-01', auth: false, status: 'blocked' }
    ],
    orders: [
        { id: '2024001', passenger: '杨同学', route: '榆中校区 → 中川机场', driver: '王师傅', amount: 60, status: 'active', time: '2024-06-27 14:30', type: '拼车', passengers: 3 },
        { id: '2024002', passenger: '李同学', route: '榆中校区 → 兰州西站', driver: '张师傅', amount: 35, status: 'pending', time: '2024-06-27 15:00', type: '拼车', passengers: 2 },
        { id: '2024003', passenger: '张同学', route: '榆中校区 → 兰州火车站', driver: '刘师傅', amount: 28, status: 'completed', time: '2024-06-27 13:00', type: '独立约车', passengers: 1 },
        { id: '2024004', passenger: '赵同学', route: '榆中校区 → 中川机场', driver: '王师傅', amount: 55, status: 'active', time: '2024-06-27 16:00', type: '拼车', passengers: 4 },
        { id: '2024005', passenger: '王同学', route: '榆中校区 → 兰州西站', driver: null, amount: 30, status: 'pending', time: '2024-06-27 17:00', type: '拼车', passengers: 2 }
    ],
    securityLogs: [
        { id: 1, type: '投诉', content: '司机态度不好', reporter: '杨同学', target: '王师傅', time: '2024-06-26 14:00', status: 'resolved' },
        { id: 2, type: '警告', content: '超速行驶', reporter: '系统', target: '张师傅', time: '2024-06-25 09:30', status: 'pending' },
        { id: 3, type: '投诉', content: '未按路线行驶', reporter: '李同学', target: '赵师傅', time: '2024-06-24 11:00', status: 'pending' },
        { id: 4, type: '警告', content: '未实名认证', reporter: '系统', target: '赵师傅', time: '2024-06-23 15:00', status: 'resolved' }
    ],
    nextId: { driver: 6, passenger: 6, order: 2024006, security: 5 }
};

// ========== Helper 函数 ==========
function getStats() {
    return {
        totalDrivers: database.drivers.length,
        onlineDrivers: database.drivers.filter(d => d.status === 'online').length,
        totalPassengers: database.passengers.length,
        activePassengers: database.passengers.filter(p => p.status === 'active').length,
        todayOrders: database.orders.length,
        activeOrders: database.orders.filter(o => o.status === 'active').length,
        totalEarnings: database.drivers.reduce((sum, d) => sum + d.earnings, 0),
        avgRating: (database.drivers.reduce((sum, d) => sum + d.rating, 0) / database.drivers.length).toFixed(1),
        pendingReviews: database.securityLogs.filter(l => l.status === 'pending').length,
        orderStats: {
            active: database.orders.filter(o => o.status === 'active').length,
            pending: database.orders.filter(o => o.status === 'pending').length,
            completed: database.orders.filter(o => o.status === 'completed').length
        }
    };
}

// ========== API 路由 ==========

// 仪表盘
app.get('/api/admin/dashboard', (req, res) => {
    res.json({ success: true, data: getStats() });
});

// 司机管理
app.get('/api/admin/drivers', (req, res) => {
    res.json({ success: true, data: database.drivers, total: database.drivers.length });
});

app.get('/api/admin/drivers/:id', (req, res) => {
    const driver = database.drivers.find(d => d.id === parseInt(req.params.id));
    if (!driver) return res.status(404).json({ success: false, message: '司机不存在' });
    res.json({ success: true, data: driver });
});

app.post('/api/admin/drivers', (req, res) => {
    const { name, plate, phone } = req.body;
    if (!name || !plate || !phone) {
        return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    const newDriver = {
        id: database.nextId.driver++,
        name, plate, phone,
        status: 'offline',
        rating: 5.0,
        orders: 0,
        earnings: 0,
        joinDate: new Date().toISOString().split('T')[0],
        auth: false,
        violations: 0
    };
    database.drivers.push(newDriver);
    res.json({ success: true, message: '司机添加成功', data: newDriver });
});

app.put('/api/admin/drivers/:id', (req, res) => {
    const driver = database.drivers.find(d => d.id === parseInt(req.params.id));
    if (!driver) return res.status(404).json({ success: false, message: '司机不存在' });
    
    const { name, plate, phone, status, auth } = req.body;
    if (name) driver.name = name;
    if (plate) driver.plate = plate;
    if (phone) driver.phone = phone;
    if (status) driver.status = status;
    if (auth !== undefined) driver.auth = auth;
    
    res.json({ success: true, message: '司机信息已更新', data: driver });
});

app.delete('/api/admin/drivers/:id', (req, res) => {
    const index = database.drivers.findIndex(d => d.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: '司机不存在' });
    
    database.drivers.splice(index, 1);
    res.json({ success: true, message: '司机已删除' });
});

app.put('/api/admin/drivers/:id/status', (req, res) => {
    const { status } = req.body;
    const driver = database.drivers.find(d => d.id === parseInt(req.params.id));
    if (!driver) return res.status(404).json({ success: false, message: '司机不存在' });
    
    driver.status = status;
    res.json({ success: true, message: '状态已更新', data: driver });
});

// 乘客管理
app.get('/api/admin/passengers', (req, res) => {
    res.json({ success: true, data: database.passengers, total: database.passengers.length });
});

app.get('/api/admin/passengers/:id', (req, res) => {
    const passenger = database.passengers.find(p => p.id === parseInt(req.params.id));
    if (!passenger) return res.status(404).json({ success: false, message: '乘客不存在' });
    res.json({ success: true, data: passenger });
});

app.post('/api/admin/passengers', (req, res) => {
    const { name, school, phone } = req.body;
    if (!name || !school || !phone) {
        return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    const newPassenger = {
        id: database.nextId.passenger++,
        name, school, phone,
        trips: 0,
        rating: 5.0,
        joinDate: new Date().toISOString().split('T')[0],
        auth: false,
        status: 'pending'
    };
    database.passengers.push(newPassenger);
    res.json({ success: true, message: '乘客添加成功', data: newPassenger });
});

app.put('/api/admin/passengers/:id', (req, res) => {
    const passenger = database.passengers.find(p => p.id === parseInt(req.params.id));
    if (!passenger) return res.status(404).json({ success: false, message: '乘客不存在' });
    
    const { name, school, phone, status, auth } = req.body;
    if (name) passenger.name = name;
    if (school) passenger.school = school;
    if (phone) passenger.phone = phone;
    if (status) passenger.status = status;
    if (auth !== undefined) passenger.auth = auth;
    
    res.json({ success: true, message: '乘客信息已更新', data: passenger });
});

app.delete('/api/admin/passengers/:id', (req, res) => {
    const index = database.passengers.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: '乘客不存在' });
    
    database.passengers.splice(index, 1);
    res.json({ success: true, message: '乘客已删除' });
});

// 订单管理
app.get('/api/admin/orders', (req, res) => {
    res.json({ success: true, data: database.orders, total: database.orders.length });
});

app.get('/api/admin/orders/:id', (req, res) => {
    const order = database.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    res.json({ success: true, data: order });
});

app.put('/api/admin/orders/:id', (req, res) => {
    const order = database.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    
    const { status, driver, amount } = req.body;
    if (status) order.status = status;
    if (driver) order.driver = driver;
    if (amount) order.amount = amount;
    
    res.json({ success: true, message: '订单已更新', data: order });
});

app.delete('/api/admin/orders/:id', (req, res) => {
    const index = database.orders.findIndex(o => o.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: '订单不存在' });
    
    database.orders.splice(index, 1);
    res.json({ success: true, message: '订单已删除' });
});

// 安全中心
app.get('/api/admin/security', (req, res) => {
    res.json({ 
        success: true, 
        data: {
            totalAlerts: database.securityLogs.length,
            resolvedAlerts: database.securityLogs.filter(l => l.status === 'resolved').length,
            pendingReviews: database.securityLogs.filter(l => l.status === 'pending').length,
            logs: database.securityLogs
        }
    });
});

app.put('/api/admin/security/:id', (req, res) => {
    const log = database.securityLogs.find(l => l.id === parseInt(req.params.id));
    if (!log) return res.status(404).json({ success: false, message: '记录不存在' });
    
    const { status } = req.body;
    if (status) log.status = status;
    
    res.json({ success: true, message: '处理状态已更新', data: log });
});

// 系统信息
app.get('/api/admin/system', (req, res) => {
    res.json({
        success: true,
        data: {
            version: '1.0.0',
            uptime: `${Math.floor(process.uptime() / 3600)}小时${Math.floor((process.uptime() % 3600) / 60)}分钟`,
            apiCalls: 12580,
            lastUpdate: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
        }
    });
});

// 搜索功能
app.get('/api/admin/search', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: { drivers: [], passengers: [], orders: [] } });
    
    const query = q.toLowerCase();
    const results = {
        drivers: database.drivers.filter(d => 
            d.name.toLowerCase().includes(query) || 
            d.plate.toLowerCase().includes(query) || 
            d.phone.includes(query)
        ),
        passengers: database.passengers.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.school.toLowerCase().includes(query) || 
            p.phone.includes(query)
        ),
        orders: database.orders.filter(o => 
            o.id.includes(query) || 
            o.passenger.toLowerCase().includes(query) || 
            o.route.toLowerCase().includes(query)
        )
    };
    res.json({ success: true, data: results });
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(), 
        version: '1.0.0',
        stats: getStats()
    });
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 启动
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
    'PUT  /api/admin/security/:id',
    'GET  /api/admin/system',
    'GET  /api/admin/search?q=关键词'
];
routes.forEach(route => console.log(`  ${route}`));
console.log();
console.log('  📍 服务器已启动...');

app.listen(PORT, () => {
    console.log(`  ✅ 服务运行在 http://localhost:${PORT}`);
});