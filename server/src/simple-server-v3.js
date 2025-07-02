const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { migrateToV3, dbGet, dbAll, dbRun, IDENTITIES, TASK_TYPES, TASK_STATUS } = require('./database-v3');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 中间件
app.use(cors());
app.use(express.json());

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'SQLite',
    version: 'V3'
  });
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const user = await dbGet('SELECT * FROM users_v3 WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, identity: user.identity },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        identity: user.identity,
        department: user.department,
        email: user.email
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '登录失败' });
  }
});

// 获取当前用户信息
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, name, identity, department, email FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

// 获取用户列表 - 只包含身份信息
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN) {
      return res.status(403).json({ message: '权限不足' });
    }

    const users = await dbAll(`
      SELECT id, username, name, identity, department, email, created_at
      FROM users_v3 
      ORDER BY created_at DESC
    `);
    
    res.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
});

// 创建用户 - 只创建身份信息
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { username, password, name, identity, department, email } = req.body;
    
    if (!username || !password || !name || !identity) {
      return res.status(400).json({ message: '用户名、密码、姓名和身份不能为空' });
    }

    if (!Object.values(IDENTITIES).includes(identity)) {
      return res.status(400).json({ message: '无效的身份类型' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await dbRun(`
      INSERT INTO users_v3 (username, password, name, identity, department, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, hashedPassword, name, identity, department, email]);

    res.json({ message: '用户创建成功', userId: result.lastInsertRowid });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: '用户名已存在' });
    }
    console.error('创建用户错误:', error);
    res.status(500).json({ message: '创建用户失败' });
  }
});

// 快速创建测试账号
app.post('/api/users/create-test-accounts', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN) {
      return res.status(403).json({ message: '权限不足' });
    }

    const testUsers = [
      { username: 'scheduler_test', name: '测试调度员', identity: IDENTITIES.PRODUCTION_SCHEDULER, department: '生产调度部' },
      { username: 'leader_test', name: '测试生产领导', identity: IDENTITIES.PRODUCTION_LEADER, department: '生产部' },
      { username: 'staff_test1', name: '测试职员1', identity: IDENTITIES.STAFF, department: '项目部' },
      { username: 'staff_test2', name: '测试职员2', identity: IDENTITIES.STAFF, department: '设计部' }
    ];

    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    let createdCount = 0;

    for (const user of testUsers) {
      try {
        await dbRun(`
          INSERT INTO users_v3 (username, password, name, identity, department, email)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [user.username, hashedPassword, user.name, user.identity, user.department, `${user.username}@company.com`]);
        createdCount++;
      } catch (error) {
        if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
          throw error;
        }
      }
    }

    res.json({ message: `成功创建 ${createdCount} 个测试账号，密码统一为: ${password}` });
  } catch (error) {
    console.error('创建测试账号错误:', error);
    res.status(500).json({ message: '创建测试账号失败' });
  }
});

// 获取任务列表
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    let whereClause = '';
    let params = [];
    
    // 根据用户身份过滤任务
    if (currentUser.identity === IDENTITIES.ADMIN || currentUser.identity === IDENTITIES.PRODUCTION_SCHEDULER) {
      // 管理员和生产调度员可以看到所有任务
      whereClause = '';
    } else {
      // 其他身份只能看到相关的任务（创建的、负责的、执行的、转发给自己的）
      whereClause = `WHERE (t.created_by = ? OR t.production_leader = ? OR t.executor = ? OR t.forwarded_to = ?)`;
      params = [currentUser.id, currentUser.id, currentUser.id, currentUser.id];
    }
    
    const query = `
      SELECT 
        t.*,
        u1.name as created_by_name,
        u2.name as production_leader_name,
        u3.name as executor_name,
        u4.name as forwarded_to_name,
        (SELECT COUNT(*) FROM milestones WHERE task_id = t.id) as milestone_count,
        (SELECT COUNT(*) FROM milestones WHERE task_id = t.id AND status = 'completed') as completed_milestone_count
      FROM tasks_v3 t
      LEFT JOIN users_v3 u1 ON t.created_by = u1.id
      LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
      LEFT JOIN users_v3 u3 ON t.executor = u3.id
      LEFT JOIN users_v3 u4 ON t.forwarded_to = u4.id
      ${whereClause}
      ORDER BY t.created_at DESC
    `;
    
    const tasks = await dbAll(query, params);
    res.json(tasks);
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ message: '获取任务列表失败' });
  }
});

// 创建任务 - 支持两级分配和可选里程碑
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN && currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER) {
      return res.status(403).json({ message: '只有管理员和生产调度员可以创建任务' });
    }

    const { name, description, type, production_leader, executor, planned_start_date, planned_end_date, milestones } = req.body;
    
    if (!name || !type || !executor || !planned_start_date || !planned_end_date) {
      return res.status(400).json({ message: '任务名称、类型、执行人和计划时间不能为空' });
    }

    if (!Object.values(TASK_TYPES).includes(type)) {
      return res.status(400).json({ message: '无效的任务类型' });
    }

    // 创建任务
    const result = await dbRun(`
      INSERT INTO tasks_v3 (name, description, type, created_by, production_leader, executor, planned_start_date, planned_end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, description, type, currentUser.id, production_leader, executor, planned_start_date, planned_end_date]);

    const taskId = result.lastInsertRowid;

    // 如果有里程碑，创建里程碑
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        if (milestone.name && milestone.planned_date) {
          await dbRun(`
            INSERT INTO milestones (task_id, name, description, planned_date, order_index)
            VALUES (?, ?, ?, ?, ?)
          `, [taskId, milestone.name, milestone.description || '', milestone.planned_date, i + 1]);
        }
      }
    }

    res.json({ message: '任务创建成功', taskId: taskId });
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({ message: '创建任务失败' });
  }
});

// 获取任务详情（包含里程碑）
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // 获取任务基本信息
    const task = await dbGet(`
      SELECT 
        t.*,
        u1.name as created_by_name,
        u2.name as production_leader_name,
        u3.name as executor_name,
        u4.name as forwarded_to_name
      FROM tasks_v3 t
      LEFT JOIN users_v3 u1 ON t.created_by = u1.id
      LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
      LEFT JOIN users_v3 u3 ON t.executor = u3.id
      LEFT JOIN users_v3 u4 ON t.forwarded_to = u4.id
      WHERE t.id = ?
    `, [taskId]);
    
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 获取任务的里程碑
    const milestones = await dbAll(`
      SELECT * FROM milestones 
      WHERE task_id = ? 
      ORDER BY order_index
    `, [taskId]);
    
    task.milestones = milestones;
    
    res.json(task);
  } catch (error) {
    console.error('获取任务详情错误:', error);
    res.status(500).json({ message: '获取任务详情失败' });
  }
});

// 更新任务状态
app.put('/api/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const taskId = req.params.id;
    
    if (!Object.values(TASK_STATUS).includes(status)) {
      return res.status(400).json({ message: '无效的任务状态' });
    }
    
    await dbRun('UPDATE tasks_v3 SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, taskId]);
    
    res.json({ message: '任务状态更新成功' });
  } catch (error) {
    console.error('更新任务状态错误:', error);
    res.status(500).json({ message: '更新任务状态失败' });
  }
});

// 删除任务
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN && currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER) {
      return res.status(403).json({ message: '只有管理员和生产调度员可以删除任务' });
    }

    const taskId = req.params.id;
    await dbRun('DELETE FROM tasks_v3 WHERE id = ?', [taskId]);
    
    res.json({ message: '任务删除成功' });
  } catch (error) {
    console.error('删除任务错误:', error);
    res.status(500).json({ message: '删除任务失败' });
  }
});

// 获取可分配的用户列表 - 排除管理员
app.get('/api/users/assignable', authenticateToken, async (req, res) => {
  try {
    const users = await dbAll(`
      SELECT id, username, name, identity, department, email
      FROM users_v3 
      WHERE identity != 'admin'
      ORDER BY 
        CASE identity 
          WHEN 'production_leader' THEN 1 
          WHEN 'production_scheduler' THEN 2 
          WHEN 'staff' THEN 3 
          ELSE 4 
        END, name
    `);
    
    res.json(users);
  } catch (error) {
    console.error('获取可分配用户列表错误:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
});

// 删除用户时检查关联任务
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN) {
      return res.status(403).json({ message: '权限不足' });
    }

    const userId = req.params.id;
    
    if (userId == currentUser.id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }

    // 检查用户是否有关联的任务
    const relatedTasks = await dbAll(`
      SELECT COUNT(*) as count FROM tasks_v3 
      WHERE created_by = ? OR production_leader = ? OR executor = ? OR forwarded_to = ?
    `, [userId, userId, userId, userId]);

    if (relatedTasks[0].count > 0) {
      return res.status(400).json({ 
        message: `无法删除用户：该用户有 ${relatedTasks[0].count} 个相关任务，请先处理相关任务后再删除` 
      });
    }

    // 删除用户
    await dbRun('DELETE FROM users_v3 WHERE id = ?', [userId]);
    
    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ message: '删除用户失败' });
  }
});

// 更新里程碑状态
app.put('/api/milestones/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, actual_date } = req.body;
    const milestoneId = req.params.id;
    
    const validStatuses = ['pending', 'in_progress', 'completed', 'delayed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的里程碑状态' });
    }
    
    let updateQuery = 'UPDATE milestones SET status = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [status];
    
    if (status === 'completed' && actual_date) {
      updateQuery += ', actual_date = ?';
      params.push(actual_date);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(milestoneId);
    
    await dbRun(updateQuery, params);
    
    res.json({ message: '里程碑状态更新成功' });
  } catch (error) {
    console.error('更新里程碑状态错误:', error);
    res.status(500).json({ message: '更新里程碑状态失败' });
  }
});

// 为任务添加里程碑
app.post('/api/tasks/:id/milestones', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN && currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER) {
      return res.status(403).json({ message: '只有管理员和生产调度员可以添加里程碑' });
    }

    const taskId = req.params.id;
    const { name, description, planned_date } = req.body;
    
    if (!name || !planned_date) {
      return res.status(400).json({ message: '里程碑名称和计划时间不能为空' });
    }

    // 获取当前任务的里程碑数量，用于确定顺序
    const milestoneCount = await dbGet('SELECT COUNT(*) as count FROM milestones WHERE task_id = ?', [taskId]);
    const orderIndex = milestoneCount.count + 1;

    const result = await dbRun(`
      INSERT INTO milestones (task_id, name, description, planned_date, order_index)
      VALUES (?, ?, ?, ?, ?)
    `, [taskId, name, description || '', planned_date, orderIndex]);

    res.json({ message: '里程碑添加成功', milestoneId: result.lastInsertRowid });
  } catch (error) {
    console.error('添加里程碑错误:', error);
    res.status(500).json({ message: '添加里程碑失败' });
  }
});

// 删除里程碑
app.delete('/api/milestones/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN && currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER) {
      return res.status(403).json({ message: '只有管理员和生产调度员可以删除里程碑' });
    }

    const milestoneId = req.params.id;
    await dbRun('DELETE FROM milestones WHERE id = ?', [milestoneId]);
    
    res.json({ message: '里程碑删除成功' });
  } catch (error) {
    console.error('删除里程碑错误:', error);
    res.status(500).json({ message: '删除里程碑失败' });
  }
});

// 初始化数据库并启动服务器
const startServer = async () => {
  try {
    console.log('初始化数据库V3...');
    await migrateToV3();
    console.log('数据库V3初始化完成！');

    app.listen(PORT, () => {
      console.log('=================================');
      console.log('🚀 生产项目管理系统服务器已启动 (V3)');
      console.log(`📍 端口: ${PORT}`);
      console.log(`🌐 健康检查: http://localhost:${PORT}/health`);
      console.log('新功能: 纯任务管理系统（无项目层级）');
      console.log('=================================');
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

startServer(); 