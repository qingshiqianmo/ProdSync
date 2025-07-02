const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { migrateToV3, dbGet, dbAll, dbRun, IDENTITIES, TASK_TYPES, TASK_STATUS, MILESTONE_STATUS } = require('./database-v3');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS配置 - 云端部署优化
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的域名
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000', 
      'http://localhost:5001',
      process.env.CLIENT_URL,
      process.env.RENDER_EXTERNAL_URL,
      process.env.RAILWAY_STATIC_URL
    ].filter(Boolean);

    // 生产环境允许同源请求，开发环境允许所有
    if (NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(null, true); // 暂时允许所有来源，便于云端部署测试
    }
  },
  credentials: true
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());

// 云端部署：提供静态文件服务
if (NODE_ENV === 'production') {
  // 静态文件服务 (React构建文件)
  app.use(express.static(path.join(__dirname, '../../client/build')));
}

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
    const { status, actual_start_date, actual_end_date } = req.body;
    const taskId = req.params.id;
    const userId = req.user.userId;

    if (!Object.values(TASK_STATUS).includes(status)) {
      return res.status(400).json({ message: '无效的任务状态' });
    }

    // 权限检查：确保操作者是任务的执行人、生产所领导或管理员/调度员
    const task = await dbGet('SELECT executor, production_leader, created_by FROM tasks_v3 WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    const currentUser = await dbGet('SELECT identity FROM users_v3 WHERE id = ?', [userId]);

    // Permission Check:
    if (currentUser.identity === IDENTITIES.ADMIN || currentUser.identity === IDENTITIES.PRODUCTION_SCHEDULER) {
        // Admins and Schedulers can set any valid status.
    } else if (task.executor === userId) {
        // Executors can only set status to IN_PROGRESS or COMPLETED
        if (status !== TASK_STATUS.IN_PROGRESS && status !== TASK_STATUS.COMPLETED) {
            return res.status(403).json({ message: '执行人只能将任务标记为进行中或已完成' });
        }
    } else {
        // Others (like production_leader if not executor) cannot change status
        return res.status(403).json({ message: '权限不足，无法更新此任务状态' });
    }

    let updateFields = 'status = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [status];

    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    if (status === TASK_STATUS.IN_PROGRESS) {
      // 如果提供了 actual_start_date，则使用它，否则检查是否已存在，不存在则设为当前日期
      if (actual_start_date) {
        updateFields += ', actual_start_date = ?';
        params.push(actual_start_date);
      } else {
        const existingTask = await dbGet('SELECT actual_start_date FROM tasks_v3 WHERE id = ?', [taskId]);
        if (!existingTask.actual_start_date) {
          updateFields += ', actual_start_date = ?';
          params.push(now);
        }
      }
    } else if (status === TASK_STATUS.COMPLETED) {
      // 如果提供了 actual_end_date，则使用它，否则设为当前日期
      updateFields += ', actual_end_date = ?';
      params.push(actual_end_date || now);

      // 如果任务完成时还没有实际开始时间，也一并记录
      const existingTask = await dbGet('SELECT actual_start_date FROM tasks_v3 WHERE id = ?', [taskId]);
      if (!existingTask.actual_start_date) {
          updateFields += ', actual_start_date = ?';
          params.push(actual_start_date || now); // if completed, start is also now or provided
      }
    }

    params.push(taskId);
    
    await dbRun(`UPDATE tasks_v3 SET ${updateFields} WHERE id = ?`, params);
    
    // 获取更新后的任务信息返回
    const updatedTask = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);
    res.json({ message: '任务状态更新成功', task: updatedTask });

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
    const { status, actual_completion_date } = req.body; // Renamed actual_date to actual_completion_date
    const milestoneId = req.params.id;
    const userId = req.user.userId;

    if (!Object.values(MILESTONE_STATUS).includes(status)) {
      return res.status(400).json({ message: '无效的里程碑状态' });
    }

    // 权限检查：获取里程碑关联的任务，然后检查用户是否有权限操作该任务
    const milestone = await dbGet('SELECT task_id FROM milestones WHERE id = ?', [milestoneId]);
    if (!milestone) {
      return res.status(404).json({ message: '里程碑不存在' });
    }

    const task = await dbGet('SELECT executor, production_leader, created_by FROM tasks_v3 WHERE id = ?', [milestone.task_id]);
    if (!task) {
      return res.status(404).json({ message: '关联的任务不存在' });
    }
    const currentUser = await dbGet('SELECT id, identity FROM users_v3 WHERE id = ?', [userId]);
    console.log(`[UPD MS] Current user for permission check: ${JSON.stringify(currentUser)}`);
    console.log(`[UPD MS] Task details for permission check: ${JSON.stringify(task)}`);


    // New Permission Logic: Only executor of the task or admin/scheduler can complete a milestone
    if (currentUser.identity === IDENTITIES.ADMIN || currentUser.identity === IDENTITIES.PRODUCTION_SCHEDULER) {
        // Admins and Schedulers can update milestone status
        console.log(`[UPD MS] Authorized as Admin/Scheduler. User ID: ${userId}`);
    } else if (task.executor === userId) {
        // Executor can update status (typically to COMPLETED or other valid execution states)
        console.log(`[UPD MS] Authorized as Task Executor. User ID: ${userId}, Task Executor ID: ${task.executor}`);
        if (!Object.values(MILESTONE_STATUS).includes(status)) {
             console.log(`[UPD MS] Executor ${userId} attempted to set invalid status: ${status} for milestone ${milestoneId}`);
             return res.status(403).json({ message: '执行人设置的里程碑状态无效' });
        }
    } else {
        console.log(`[UPD MS] Permission Denied. User ${userId} (Identity: ${currentUser.identity}) is not Admin, Scheduler, or Executor (${task.executor}) for task ${task.id} of milestone ${milestoneId}.`);
        return res.status(403).json({ message: '权限不足，无法更新此里程碑状态' });
    }
    
    let updateQuery = 'UPDATE milestones SET status = ?, updated_at = CURRENT_TIMESTAMP';
    let queryParams = [status];
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (status === MILESTONE_STATUS.COMPLETED) {
      updateQuery += ', actual_completion_date = ?';
      queryParams.push(actual_completion_date || now); // Use provided date or now if completed
    } else {
      // If status is changed to something else from completed, clear actual_completion_date
      // updateQuery += ', actual_completion_date = NULL';
      // Or, let it remain, depending on desired logic. For now, only set on completion.
    }
    
    updateQuery += ' WHERE id = ?';
    queryParams.push(milestoneId);
    
    await dbRun(updateQuery, queryParams);

    const updatedMilestone = await dbGet('SELECT * FROM milestones WHERE id = ?', [milestoneId]);
    res.json({ message: '里程碑状态更新成功', milestone: updatedMilestone });

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

// 生产所领导确认收到任务
app.put('/api/tasks/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;
    console.log(`[ACK TASK /api/tasks/${taskId}/acknowledge] User ID: ${userId} attempting to acknowledge.`);

    const task = await dbGet('SELECT id, production_leader FROM tasks_v3 WHERE id = ?', [taskId]);
    if (!task) {
      console.log(`[ACK TASK] Task not found for ID: ${taskId}`);
      return res.status(404).json({ message: '任务不存在' });
    }
    console.log(`[ACK TASK] Task found: ${JSON.stringify(task)}. Expected leader ID: ${task.production_leader}`);

    if (task.production_leader !== userId) {
      console.log(`[ACK TASK] Permission denied. Task leader ID ${task.production_leader} does not match user ID ${userId}.`);
      return res.status(403).json({ message: '权限不足，只有指定的生产所领导可以确认收到任务' });
    }

    const now = new Date().toISOString();
    console.log(`[ACK TASK] Attempting to update task ${taskId} with acknowledged_by_leader_at = ${now}`);
    await dbRun('UPDATE tasks_v3 SET acknowledged_by_leader_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [now, taskId]);

    const updatedTask = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);
    console.log(`[ACK TASK] Task ${taskId} acknowledged successfully. Updated task: ${JSON.stringify(updatedTask)}`);
    res.json({ message: '任务已成功确认为收到', task: updatedTask });

  } catch (error) {
    console.error(`[ACK TASK ERROR /api/tasks/${req.params.id}/acknowledge]`, error);
    res.status(500).json({ message: '确认收到任务失败' });
  }
});

// 云端部署：为前端SPA提供路由支持
if (NODE_ENV === 'production') {
  // 所有非API路由都返回React应用的index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}


// 初始化数据库并启动服务器
const startServer = async () => {
  try {
    console.log('🔧 初始化数据库V3...');
    await migrateToV3();
    console.log('✅ 数据库V3初始化完成！');

    // 云端部署优化：监听所有网络接口
    const host = NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    const server = app.listen(PORT, host, () => {
      console.log('=================================');
      console.log('🚀 ProdSync 系统启动成功! (V3-Cloud)');
      console.log(`📍 端口: ${PORT}`);
      console.log(`🌐 环境: ${NODE_ENV}`);
      console.log(`🔗 健康检查: http://${host === '0.0.0.0' ? 'your-domain' : 'localhost'}:${PORT}/health`);
      if (NODE_ENV === 'production') {
        console.log('☁️  云端部署模式');
      } else {
        console.log('💻 本地开发模式');
      }
      console.log('=================================');
    });

    // 优雅关闭处理
    const gracefulShutdown = (signal) => {
      console.log(`\n收到 ${signal} 信号，正在优雅关闭服务器...`);
      server.close((err) => {
        if (err) {
          console.error('关闭服务器时出错:', err);
          process.exit(1);
        }
        console.log('✅ 服务器已安全关闭');
        process.exit(0);
      });
      
      // 强制关闭超时
      setTimeout(() => {
        console.error('❌ 强制关闭服务器 (超时)');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    process.exit(1);
  }
};

// 启动服务器
startServer();

// 导出app以供其他文件使用
module.exports = app; 