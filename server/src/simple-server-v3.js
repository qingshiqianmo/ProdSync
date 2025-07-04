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

// 获取本地日期的辅助函数
const getLocalDate = () => {
  const now = new Date();
  return now.getFullYear() + '-' + 
         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
         String(now.getDate()).padStart(2, '0');
};

// 获取本地日期时间的辅助函数
const getLocalDateTime = () => {
  const now = new Date();
  // 直接使用本地时间格式化，不进行时区转换
  return now.getFullYear() + '-' + 
         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
         String(now.getDate()).padStart(2, '0') + ' ' +
         String(now.getHours()).padStart(2, '0') + ':' +
         String(now.getMinutes()).padStart(2, '0') + ':' +
         String(now.getSeconds()).padStart(2, '0');
};

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

    const { username, name, identity, department, email } = req.body;
    
    if (!username || !name || !identity) {
      return res.status(400).json({ message: '用户名、姓名和身份不能为空' });
    }

    if (!Object.values(IDENTITIES).includes(identity)) {
      return res.status(400).json({ message: '无效的身份类型' });
    }

    // 使用默认密码test123
    const defaultPassword = 'test123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const result = await dbRun(`
      INSERT INTO users_v3 (username, password, name, identity, department, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, hashedPassword, name, identity, department, email]);

    res.json({ 
      message: '用户创建成功，默认密码为：test123', 
      userId: result.lastInsertRowid,
      defaultPassword: 'test123'
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: '用户名已存在' });
    }
    console.error('创建用户错误:', error);
    res.status(500).json({ message: '创建用户失败' });
  }
});


// 获取任务列表
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    let query = `
      SELECT 
        t.*,
        u1.name as created_by_name,
        u2.name as production_leader_name,
        u3.name as executor_name,
        COALESCE(m.milestone_count, 0) as milestone_count,
        COALESCE(m.completed_milestone_count, 0) as completed_milestone_count
      FROM tasks_v3 t
      LEFT JOIN users_v3 u1 ON t.created_by = u1.id
      LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
      LEFT JOIN users_v3 u3 ON t.executor = u3.id
      LEFT JOIN (
        SELECT 
          task_id,
          COUNT(*) as milestone_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_milestone_count
        FROM milestones 
        GROUP BY task_id
      ) m ON t.id = m.task_id
    `;
    const params = [];

    // 根据用户身份过滤任务
    if (currentUser.identity === IDENTITIES.STAFF) {
      // 职员只能看到分配给自己的任务
      query += ' WHERE t.executor = ?';
      params.push(currentUser.id);
    } else if (currentUser.identity === IDENTITIES.PRODUCTION_LEADER) {
      // 生产所领导只能看到自己负责的任务
      query += ' WHERE t.production_leader = ?';
      params.push(currentUser.id);
    }
    // 管理员和生产调度员可以看到所有任务，不添加WHERE条件
    
    query += ' ORDER BY t.created_at DESC';

    const tasks = await dbAll(query, params);
    res.json(tasks);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({ message: '获取任务列表失败' });
  }
});

// 创建任务 - 支持新的工作流程
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN && currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER) {
      return res.status(403).json({ message: '只有管理员和生产调度员可以创建任务' });
    }

    const { name, description, type, production_leader, planned_start_date, planned_end_date, milestones } = req.body;
    
    if (!name || !type || !planned_start_date || !planned_end_date) {
      return res.status(400).json({ message: '任务名称、类型和计划时间不能为空' });
    }

    // 生产调度创建任务时必须指定生产所领导
    if (currentUser.identity === IDENTITIES.PRODUCTION_SCHEDULER && !production_leader) {
      return res.status(400).json({ message: '生产调度创建任务时必须指定生产所领导' });
    }

    if (!Object.values(TASK_TYPES).includes(type)) {
      return res.status(400).json({ message: '无效的任务类型' });
    }

    // 当前时间作为实际开始时间
    const now = getLocalDate();
    
    const result = await dbRun(`
      INSERT INTO tasks_v3 (
        name, description, type, created_by, production_leader, 
        planned_start_date, planned_end_date, actual_start_date, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, description, type, currentUser.id, production_leader, 
      planned_start_date, planned_end_date, now, TASK_STATUS.PENDING
    ]);

    const taskId = result.lastInsertRowid;

    // 如果有里程碑，创建里程碑
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      console.log('创建里程碑:', milestones);
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        console.log(`里程碑 ${i + 1}:`, milestone);
        if (milestone.name && milestone.planned_date) {
          const result = await dbRun(`
            INSERT INTO milestones (task_id, name, description, planned_date, order_index)
            VALUES (?, ?, ?, ?, ?)
          `, [taskId, milestone.name, milestone.description || '', milestone.planned_date, i + 1]);
          console.log(`里程碑 ${i + 1} 创建成功，ID:`, result.lastInsertRowid);
        } else {
          console.log(`里程碑 ${i + 1} 跳过：缺少名称或计划日期`);
        }
      }
    } else {
      console.log('没有里程碑数据或数据为空');
    }

    res.json({ message: '任务创建成功', taskId: taskId });
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({ message: '创建任务失败' });
  }
});

// 获取任务详情（包含里程碑和回执）
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // 获取任务基本信息
    const task = await dbGet(`
      SELECT 
        t.*,
        u1.name as created_by_name,
        u2.name as production_leader_name,
        u3.name as executor_name
      FROM tasks_v3 t
      LEFT JOIN users_v3 u1 ON t.created_by = u1.id
      LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
      LEFT JOIN users_v3 u3 ON t.executor = u3.id
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
    
    // 获取任务回执
    const receipts = await dbAll(`
      SELECT 
        tr.*,
        u.name as executor_name
      FROM task_receipts tr
      LEFT JOIN users_v3 u ON tr.executor_id = u.id
      WHERE tr.task_id = ?
      ORDER BY tr.submitted_at DESC
    `, [taskId]);
    
    task.milestones = milestones;
    task.receipts = receipts;
    
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

    // 获取任务和当前用户信息
    const task = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    const currentUser = await dbGet('SELECT identity FROM users_v3 WHERE id = ?', [userId]);

    // 新的权限检查逻辑
    if (status === TASK_STATUS.COMPLETED) {
      // 完成任务的权限：只有任务执行人或生产所领导可以完成任务
      if (currentUser.identity === IDENTITIES.ADMIN) {
        // 管理员可以完成任务
      } else if (task.executor === userId) {
        // 执行人可以完成任务（需要填写回执）
      } else if (task.production_leader === userId) {
        // 生产所领导可以直接确认任务完成
      } else {
        return res.status(403).json({ message: '只有任务执行人或生产所领导可以完成任务' });
      }
      
      // 生产调度不能完成任务
      if (currentUser.identity === IDENTITIES.PRODUCTION_SCHEDULER) {
        return res.status(403).json({ message: '生产调度不能完成任务，请由执行人或生产所领导完成' });
      }
    } else {
      // 其他状态的权限检查
      if (currentUser.identity === IDENTITIES.ADMIN || 
          task.executor === userId || 
          task.production_leader === userId ||
          task.created_by === userId) {
        // 允许这些角色修改状态
      } else {
        return res.status(403).json({ message: '权限不足，无法更新此任务状态' });
      }
    }

    let updateFields = 'status = ?, updated_at = ?';
    let params = [status];

    const now = getLocalDateTime();

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
      const existingTask = await dbGet('SELECT actual_start_date, planned_end_date FROM tasks_v3 WHERE id = ?', [taskId]);
      if (!existingTask.actual_start_date) {
          updateFields += ', actual_start_date = ?';
          params.push(actual_start_date || now); // if completed, start is also now or provided
      }

      // 检查是否逾期完成 - 使用本地日期比较
      const localDate = getLocalDate();
      const isOverdue = new Date(localDate) > new Date(task.planned_end_date);
      updateFields += ', completed_overdue = ?';
      params.push(isOverdue ? 1 : 0);
    }

    // 添加updated_at参数
    params.push(now);
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

// 更新任务基本信息
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN && currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER) {
      return res.status(403).json({ message: '只有管理员和生产调度员可以修改任务' });
    }

    const taskId = req.params.id;
    const { name, description, type, production_leader, planned_start_date, planned_end_date, milestones } = req.body;
    
    console.log('更新任务请求数据:', {
      taskId,
      name,
      description,
      type,
      production_leader,
      planned_start_date,
      planned_end_date,
      milestones: milestones ? milestones.length : 0
    });
    
    if (!name || !type || !planned_start_date || !planned_end_date) {
      console.log('验证失败 - 缺少必填字段:', { name, type, planned_start_date, planned_end_date });
      return res.status(400).json({ message: '任务名称、类型和计划时间不能为空' });
    }

    if (!Object.values(TASK_TYPES).includes(type)) {
      console.log('验证失败 - 无效的任务类型:', type, 'valid types:', Object.values(TASK_TYPES));
      return res.status(400).json({ message: '无效的任务类型' });
    }

    // 更新任务基本信息
    const updateTime = getLocalDateTime();
    await dbRun(`
      UPDATE tasks_v3 
      SET name = ?, description = ?, type = ?, production_leader = ?, 
          planned_start_date = ?, planned_end_date = ?, updated_at = ?
      WHERE id = ?
    `, [name, description, type, production_leader, planned_start_date, planned_end_date, updateTime, taskId]);

    // 处理里程碑更新：先删除旧的，再添加新的
    if (milestones && Array.isArray(milestones)) {
      // 删除现有里程碑
      await dbRun('DELETE FROM milestones WHERE task_id = ?', [taskId]);
      
      // 添加新里程碑
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

    res.json({ message: '任务更新成功' });
  } catch (error) {
    console.error('更新任务错误:', error);
    res.status(500).json({ message: '更新任务失败' });
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
      WHERE created_by = ? OR production_leader = ? OR executor = ?
    `, [userId, userId, userId]);

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
    
    let updateQuery = 'UPDATE milestones SET status = ?, updated_at = ?';
    let queryParams = [status];
    const now = getLocalDateTime();
    
    if (status === MILESTONE_STATUS.COMPLETED) {
      updateQuery += ', actual_completion_date = ?';
      queryParams.push(actual_completion_date || now); // Use provided date or now if completed
    } else {
      // If status is changed to something else from completed, clear actual_completion_date
      // updateQuery += ', actual_completion_date = NULL';
      // Or, let it remain, depending on desired logic. For now, only set on completion.
    }
    
    updateQuery += ' WHERE id = ?';
    queryParams.push(now); // 添加updated_at的值
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

// 更新里程碑基本信息
app.put('/api/milestones/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN && currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER) {
      return res.status(403).json({ message: '只有管理员和生产调度员可以修改里程碑' });
    }

    const milestoneId = req.params.id;
    const { name, description, planned_date } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: '里程碑名称不能为空' });
    }

    await dbRun(`
      UPDATE milestones 
      SET name = ?, description = ?, planned_date = ?, updated_at = ?
      WHERE id = ?
    `, [name, description || '', planned_date, getLocalDateTime(), milestoneId]);
    
    res.json({ message: '里程碑更新成功' });
  } catch (error) {
    console.error('更新里程碑错误:', error);
    res.status(500).json({ message: '更新里程碑失败' });
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

// 分配任务给执行人的API (V3)
app.put('/api/tasks/:id/assign', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { executor_id } = req.body;
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    const task = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);

    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }

    // 权限检查：只有管理员、生产调度员或该任务的"生产所领导"可以分配任务
    if (currentUser.identity === IDENTITIES.ADMIN || currentUser.identity === IDENTITIES.PRODUCTION_SCHEDULER || task.production_leader === currentUser.id) {
      if (task.status !== TASK_STATUS.PENDING) {
        return res.status(400).json({ message: '只能分配待处理状态的任务' });
      }

      if (!executor_id) {
        return res.status(400).json({ message: '执行人ID不能为空' });
      }

      // 检查执行人是否存在
      const executorUser = await dbGet('SELECT id, name FROM users_v3 WHERE id = ?', [executor_id]);
      if (!executorUser) {
        return res.status(400).json({ message: '指定的执行人用户不存在' });
      }

      // 更新任务的执行人、状态和更新时间
      await dbRun(
        'UPDATE tasks_v3 SET executor = ?, status = ?, updated_at = ? WHERE id = ?',
        [executor_id, TASK_STATUS.IN_PROGRESS, getLocalDateTime(), taskId]
      );

      // 获取更新后的任务信息返回
      const updatedTask = await dbGet(`
        SELECT 
          t.*,
          u1.name as created_by_name,
          u2.name as production_leader_name,
          u3.name as executor_name
        FROM tasks_v3 t
        LEFT JOIN users_v3 u1 ON t.created_by = u1.id
        LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
        LEFT JOIN users_v3 u3 ON t.executor = u3.id
        WHERE t.id = ?
      `, [taskId]);
      
      res.json({ message: '任务分配成功', task: updatedTask });
    } else {
      return res.status(403).json({ message: '只有管理员、生产调度员或该任务的"生产所领导"可以分配任务' });
    }

  } catch (error) {
    console.error('分配任务错误:', error);
    res.status(500).json({ message: '分配任务失败' });
  }
});

// 执行人完成任务的API (V3)
app.post('/api/tasks/:id/complete', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.userId;
  const { receipt_content } = req.body;

  if (!receipt_content) {
    return res.status(400).json({ message: '任务回执内容不能为空' });
  }

  try {
    const task = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    if (task.executor !== userId) {
      return res.status(403).json({ message: '您不是此任务的执行人' });
    }

    // 检查是否逾期完成 - 使用本地日期比较
    const localDate = getLocalDate();
    const isOverdue = new Date(localDate) > new Date(task.planned_end_date);

    console.log('完成任务逾期检查:', {
      taskId,
      localDate,
      plannedEndDate: task.planned_end_date,
      isOverdue
    });

    // 自动完成所有未完成的里程碑
    const currentTime = getLocalDateTime();
    await dbRun(`
      UPDATE milestones 
      SET status = 'completed', actual_completion_date = ?, updated_at = ?
      WHERE task_id = ? AND status != 'completed'
    `, [currentTime, currentTime, taskId]);

    // 更新任务状态为已完成
    await dbRun(`
      UPDATE tasks_v3 
      SET status = ?, actual_end_date = ?, completed_overdue = ?, updated_at = ?
      WHERE id = ?
    `, [TASK_STATUS.COMPLETED, currentTime, isOverdue ? 1 : 0, currentTime, taskId]);

    // 插入任务回执
    await dbRun(
      'INSERT INTO task_receipts (task_id, executor_id, receipt_content, submitted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [taskId, userId, receipt_content, currentTime, currentTime, currentTime]
    );
    
    const updatedTask = await dbGet(`
      SELECT 
        t.*,
        u1.name as created_by_name,
        u2.name as production_leader_name,
        u3.name as executor_name
      FROM tasks_v3 t
      LEFT JOIN users_v3 u1 ON t.created_by = u1.id
      LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
      LEFT JOIN users_v3 u3 ON t.executor = u3.id
      WHERE t.id = ?
    `, [taskId]);

    res.json({ message: '任务完成', task: updatedTask });
  } catch (error) {
    console.error('完成任务错误:', error);
    res.status(500).json({ message: '完成任务失败' });
  }
});

// 提交任务回执 - 执行人完成任务时填写回执
app.post('/api/tasks/:id/receipt', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;
    const { receipt_content, completion_notes } = req.body;

    if (!receipt_content) {
      return res.status(400).json({ message: '回执内容不能为空' });
    }

    // 获取任务信息
    const task = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }

    // 权限检查：只有任务执行人可以提交回执
    if (task.executor !== userId) {
      return res.status(403).json({ message: '只有任务执行人可以提交回执' });
    }

    // 创建回执记录
    const currentTime = getLocalDateTime();
    const result = await dbRun(`
      INSERT INTO task_receipts (task_id, executor_id, receipt_content, completion_notes, submitted_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [taskId, userId, receipt_content, completion_notes || '', currentTime, currentTime, currentTime]);

    // 自动完成所有未完成的里程碑
    await dbRun(`
      UPDATE milestones 
      SET status = 'completed', actual_completion_date = ?, updated_at = ?
      WHERE task_id = ? AND status != 'completed'
    `, [currentTime, currentTime, taskId]);

    // 同时将任务状态更新为已完成
    const localDate = getLocalDate();
    const isOverdue = new Date(localDate) > new Date(task.planned_end_date);
    
    await dbRun(`
      UPDATE tasks_v3 
      SET status = ?, actual_end_date = ?, completed_overdue = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [TASK_STATUS.COMPLETED, localDate, isOverdue ? 1 : 0, taskId]);

    res.json({ 
      message: '任务回执提交成功，任务已标记为完成', 
      receiptId: result.lastInsertRowid 
    });

  } catch (error) {
    console.error('提交任务回执错误:', error);
    res.status(500).json({ message: '提交任务回执失败' });
  }
});

// 获取任务回执
app.get('/api/tasks/:id/receipts', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;

    const receipts = await dbAll(`
      SELECT 
        tr.*,
        u.name as executor_name
      FROM task_receipts tr
      LEFT JOIN users_v3 u ON tr.executor_id = u.id
      WHERE tr.task_id = ?
      ORDER BY tr.submitted_at DESC
    `, [taskId]);

    res.json(receipts);

  } catch (error) {
    console.error('获取任务回执错误:', error);
    res.status(500).json({ message: '获取任务回执失败' });
  }
});

// 复制任务 - 生产调度复制已有任务创建新任务
app.post('/api/tasks/:id/copy', authenticateToken, async (req, res) => {
  try {
    const sourceTaskId = req.params.id;
    const userId = req.user.userId;
    const { name, planned_start_date, planned_end_date, production_leader } = req.body;

    // 权限检查：只有生产调度和管理员可以复制任务
    const currentUser = await dbGet('SELECT identity FROM users_v3 WHERE id = ?', [userId]);
    if (currentUser.identity !== IDENTITIES.PRODUCTION_SCHEDULER && currentUser.identity !== IDENTITIES.ADMIN) {
      return res.status(403).json({ message: '只有生产调度和管理员可以复制任务' });
    }

    // 获取源任务信息
    const sourceTask = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [sourceTaskId]);
    if (!sourceTask) {
      return res.status(404).json({ message: '源任务不存在' });
    }

    if (!name || !planned_start_date || !planned_end_date) {
      return res.status(400).json({ message: '任务名称和计划时间不能为空' });
    }

    const now = getLocalDateTime();

    // 创建新任务
    const result = await dbRun(`
      INSERT INTO tasks_v3 (
        name, description, type, created_by, production_leader, 
        planned_start_date, planned_end_date, actual_start_date, 
        status, is_copied_from
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, 
      sourceTask.description, 
      sourceTask.type, 
      userId, 
      production_leader || sourceTask.production_leader,
      planned_start_date, 
      planned_end_date, 
      now,
      TASK_STATUS.IN_PROGRESS, 
      sourceTaskId
    ]);

    const newTaskId = result.lastInsertRowid;

    // 复制里程碑
    const sourceMilestones = await dbAll('SELECT * FROM milestones WHERE task_id = ? ORDER BY order_index', [sourceTaskId]);
    for (const milestone of sourceMilestones) {
      await dbRun(`
        INSERT INTO milestones (task_id, name, description, planned_date, order_index)
        VALUES (?, ?, ?, ?, ?)
      `, [newTaskId, milestone.name, milestone.description, milestone.planned_date, milestone.order_index]);
    }

    res.json({ 
      message: '任务复制成功', 
      taskId: newTaskId,
      copiedMilestones: sourceMilestones.length
    });

  } catch (error) {
    console.error('复制任务错误:', error);
    res.status(500).json({ message: '复制任务失败' });
  }
});

// 生产所领导确认任务完成
app.post('/api/tasks/:id/complete-by-leader', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    const task = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);

    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }

    if (currentUser.id !== task.production_leader) {
      return res.status(403).json({ message: '只有生产所领导可以确认完成任务' });
    }

    if (task.status !== TASK_STATUS.IN_PROGRESS && task.status !== TASK_STATUS.PENDING) {
      return res.status(400).json({ message: '只能对待处理或进行中的任务进行确认完成' });
    }

    const now = getLocalDateTime();
    const localDate = getLocalDate();
    const isOverdue = new Date(localDate) > new Date(task.planned_end_date);
    const actualStartDate = task.actual_start_date ? task.actual_start_date : now;

    await dbRun(
      'UPDATE tasks_v3 SET status = ?, actual_start_date = ?, actual_end_date = ?, completed_overdue = ?, completed_by_leader_at = ?, updated_at = ? WHERE id = ?',
      [TASK_STATUS.COMPLETED, actualStartDate, localDate, isOverdue ? 1 : 0, now, now, taskId]
    );

    const updatedTask = await dbGet('SELECT * FROM tasks_v3 WHERE id = ?', [taskId]);
    res.json({ message: '任务已由所领导确认完成', task: updatedTask });
  } catch (error) {
    console.error('所领导确认任务完成错误:', error);
    res.status(500).json({ message: '所领导确认任务完成失败' });
  }
});

// 获取子任务列表
app.get('/api/tasks/:id/subtasks', authenticateToken, async (req, res) => {
  try {
    const parentTaskId = req.params.id;

    const subtasks = await dbAll(`
      SELECT 
        t.*,
        u1.name as created_by_name,
        u2.name as production_leader_name,
        u3.name as executor_name
      FROM tasks_v3 t
      LEFT JOIN users_v3 u1 ON t.created_by = u1.id
      LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
      LEFT JOIN users_v3 u3 ON t.executor = u3.id
      WHERE t.parent_task_id = ?
      ORDER BY t.created_at ASC
    `, [parentTaskId]);

    res.json(subtasks);

  } catch (error) {
    console.error('获取子任务列表错误:', error);
    res.status(500).json({ message: '获取子任务列表失败' });
  }
});

// 用户修改自己的信息
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, department, email } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: '姓名不能为空' });
    }

    await dbRun(`
      UPDATE users_v3 
      SET name = ?, department = ?, email = ?, updated_at = ?
      WHERE id = ?
    `, [name, department, email, getLocalDateTime(), req.user.userId]);

    res.json({ message: '个人信息更新成功' });
  } catch (error) {
    console.error('更新个人信息错误:', error);
    res.status(500).json({ message: '更新个人信息失败' });
  }
});

// 用户修改自己的密码
app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '当前密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度不能少于6位' });
    }

    // 验证当前密码
    const user = await dbGet('SELECT password FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidCurrentPassword) {
      return res.status(400).json({ message: '当前密码错误' });
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await dbRun(`
      UPDATE users_v3 
      SET password = ?, updated_at = ?
      WHERE id = ?
    `, [hashedNewPassword, getLocalDateTime(), req.user.userId]);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ message: '修改密码失败' });
  }
});

// 管理员重置用户密码
app.put('/api/users/:id/reset-password', authenticateToken, async (req, res) => {
  try {
    const currentUser = await dbGet('SELECT * FROM users_v3 WHERE id = ?', [req.user.userId]);
    
    if (currentUser.identity !== IDENTITIES.ADMIN) {
      return res.status(403).json({ message: '只有管理员可以重置用户密码' });
    }

    const targetUserId = req.params.id;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ message: '新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度不能少于6位' });
    }

    // 检查目标用户是否存在
    const targetUser = await dbGet('SELECT id, name FROM users_v3 WHERE id = ?', [targetUserId]);
    
    if (!targetUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await dbRun(`
      UPDATE users_v3 
      SET password = ?, updated_at = ?
      WHERE id = ?
    `, [hashedNewPassword, getLocalDateTime(), targetUserId]);

    res.json({ message: `用户 ${targetUser.name} 的密码重置成功` });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ message: '重置密码失败' });
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