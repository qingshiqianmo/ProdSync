const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../prodsync.db');
const db = new Database(dbPath);

console.log('数据库连接成功:', dbPath);

// 身份常量
const IDENTITIES = {
  ADMIN: 'admin',
  PRODUCTION_SCHEDULER: 'production_scheduler',
  PRODUCTION_LEADER: 'production_leader',
  STAFF: 'staff'
};

// 任务类型常量
const TASK_TYPES = {
  MEETING: 'meeting',
  PROJECT: 'project', 
  MISCELLANEOUS: 'miscellaneous'
};

// 任务状态常量
const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
  // DELAYED can be a computed status rather than a stored one
};

// 里程碑状态常量
const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DELAYED: 'delayed' // Explicitly storing delayed for milestones if needed for specific queries or UI
};

// 数据库初始化V3版本
const initDatabaseV3 = () => {
  console.log('开始数据库迁移到V3版本...');
  
  // 创建用户表V3 - 只包含身份信息
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      identity TEXT NOT NULL CHECK (identity IN ('admin', 'production_scheduler', 'production_leader', 'staff')),
      department TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建任务表V3 - 重构支持新的工作流程
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('meeting', 'project', 'miscellaneous')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      created_by INTEGER NOT NULL,
      production_leader INTEGER,
      executor INTEGER, -- 可以为空，生产调度创建任务时不指定执行人
      parent_task_id INTEGER, -- 支持子任务，指向父任务ID
      planned_start_date DATE NOT NULL,
      planned_end_date DATE NOT NULL,
      actual_start_date DATE, -- 任务创建时自动设置
      actual_end_date DATE,
      completed_overdue BOOLEAN DEFAULT 0, -- 记录是否逾期完成
      acknowledged_by_leader_at DATETIME, -- 生产所领导确认收到时间
      completed_by_leader_at DATETIME, -- 生产所领导确认完成时间
      is_copied_from INTEGER, -- 记录是否从其他任务复制而来
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users_v3(id),
      FOREIGN KEY (production_leader) REFERENCES users_v3(id),
      FOREIGN KEY (executor) REFERENCES users_v3(id),
      FOREIGN KEY (parent_task_id) REFERENCES tasks_v3(id),
      FOREIGN KEY (is_copied_from) REFERENCES tasks_v3(id)
    )
  `);

  // 创建任务回执表
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      executor_id INTEGER NOT NULL,
      receipt_content TEXT NOT NULL, -- 回执内容
      completion_notes TEXT, -- 完成说明
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks_v3(id) ON DELETE CASCADE,
      FOREIGN KEY (executor_id) REFERENCES users_v3(id)
    )
  `);

  // 创建里程碑表 (Milestones Table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      planned_date DATE NOT NULL,
      actual_completion_date DATE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
      order_index INTEGER, -- To maintain order of milestones for a task
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks_v3(id) ON DELETE CASCADE
    )
  `);
  console.log('数据库V3表结构创建/验证完成');
};

// 插入初始数据V3
const insertInitialDataV3 = async () => {
  console.log('插入初始用户数据（V3版本）...');
  
  // 检查管理员账户是否存在
  const existingAdmin = db.prepare('SELECT id, username, name FROM users_v3 WHERE username = ?').get('admin');
  
  if (existingAdmin) {
    console.log('==========================================');
    console.log('🔐 管理员账户信息');
    console.log('==========================================');
    console.log(`👤 用户名: admin`);
    console.log(`📛 姓名: ${existingAdmin.name}`);
    console.log(`💡 提示: 管理员账户已存在，密码已保留您的修改`);
    console.log(`🔧 如需重置密码，请在用户管理中操作`);
    console.log(`⚠️  注意: 密码已加密存储，无法直接显示明文`);
    console.log('==========================================');
  } else {
    // 创建新的管理员账户
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    try {
      db.prepare(`
        INSERT INTO users_v3 (id, username, password, name, identity, department, email)
        VALUES (1, 'admin', ?, '系统管理员', 'admin', '管理部', 'admin@company.com')
      `).run(hashedPassword);
      
      console.log('==========================================');
      console.log('🎉 管理员账户创建成功');
      console.log('==========================================');
      console.log(`👤 用户名: admin`);
      console.log(`🔑 密码: ${defaultPassword}`);
      console.log(`📛 姓名: 系统管理员`);
      console.log(`💡 提示: 请及时修改默认密码`);
      console.log('==========================================');
    } catch (error) {
      console.error('创建管理员账户失败:', error);
    }
  }

  // 插入一些示例任务数据 - 已注释掉，以防止每次重启都添加
  // console.log('插入初始任务数据...');
  // try {
  //   const sampleTasks = [
  //     {
  //       name: '周例会',
  //       description: '每周定期工作汇报会议',
  //       type: 'meeting',
  //       created_by: 1,
  //       executor: 1,
  //       planned_start_date: '2024-01-15',
  //       planned_end_date: '2024-01-15'
  //     },
  //     {
  //       name: '新产品设计项目',
  //       description: '开发新一代产品的设计工作',
  //       type: 'project',
  //       created_by: 1,
  //       executor: 1,
  //       planned_start_date: '2024-01-10',
  //       planned_end_date: '2024-03-10'
  //     },
  //     {
  //       name: '办公设备维护',
  //       description: '定期检查和维护办公设备',
  //       type: 'miscellaneous',
  //       created_by: 1,
  //       executor: 1,
  //       planned_start_date: '2024-01-08',
  //       planned_end_date: '2024-01-12'
  //     }
  //   ];

  //   for (const task of sampleTasks) {
  //     db.prepare(`
  //       INSERT OR IGNORE INTO tasks_v3 (name, description, type, created_by, executor, planned_start_date, planned_end_date)
  //       VALUES (?, ?, ?, ?, ?, ?, ?)
  //     `).run(task.name, task.description, task.type, task.created_by, task.executor, task.planned_start_date, task.planned_end_date);
  //   }
    
  //   console.log('初始任务数据插入完成');
  // } catch (error) {
  //   console.error('插入任务数据错误:', error);
  // }

  console.log('初始数据插入完成（V3版本），示例任务已禁用自动插入。');
};

// 添加新字段的迁移
const addCompletedOverdueField = () => {
  try {
    // 检查字段是否已存在
    const tableInfo = db.prepare("PRAGMA table_info(tasks_v3)").all();
    const hasCompletedOverdueField = tableInfo.some(column => column.name === 'completed_overdue');
    
    if (!hasCompletedOverdueField) {
      console.log('添加completed_overdue字段到tasks_v3表...');
      db.exec(`ALTER TABLE tasks_v3 ADD COLUMN completed_overdue BOOLEAN DEFAULT 0`);
      console.log('completed_overdue字段添加成功');
    }
  } catch (error) {
    console.error('添加completed_overdue字段失败:', error);
  }
};

// 添加任务管理重构相关的新字段和表
const addTaskRefactorFields = () => {
  try {
    console.log('开始任务管理重构相关的数据库迁移...');
    
    // 检查tasks_v3表的字段
    const tableInfo = db.prepare("PRAGMA table_info(tasks_v3)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    // 添加parent_task_id字段（支持子任务）
    if (!existingColumns.includes('parent_task_id')) {
      console.log('添加parent_task_id字段...');
      db.exec(`ALTER TABLE tasks_v3 ADD COLUMN parent_task_id INTEGER REFERENCES tasks_v3(id)`);
    }
    
    // 添加completed_by_leader_at字段（生产所领导确认完成时间）
    if (!existingColumns.includes('completed_by_leader_at')) {
      console.log('添加completed_by_leader_at字段...');
      db.exec(`ALTER TABLE tasks_v3 ADD COLUMN completed_by_leader_at DATETIME`);
    }
    
    // 添加is_copied_from字段（记录任务复制来源）
    if (!existingColumns.includes('is_copied_from')) {
      console.log('添加is_copied_from字段...');
      db.exec(`ALTER TABLE tasks_v3 ADD COLUMN is_copied_from INTEGER REFERENCES tasks_v3(id)`);
    }
    
    // 修改executor字段允许为空（需要重建表，因为SQLite不支持修改约束）
    // 这里我们检查是否已经允许为空，如果不是，我们需要重建表
    const executorColumn = tableInfo.find(col => col.name === 'executor');
    if (executorColumn && executorColumn.notnull === 1) {
      console.log('修改executor字段允许为空...');
      // 由于SQLite的限制，这里只是警告，实际部署时可能需要手动处理
      console.warn('警告：executor字段仍为NOT NULL，新建任务时请确保生产调度指定生产所领导');
    }
    
    // 创建任务回执表
    console.log('创建task_receipts表...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        executor_id INTEGER NOT NULL,
        receipt_content TEXT NOT NULL,
        completion_notes TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks_v3(id) ON DELETE CASCADE,
        FOREIGN KEY (executor_id) REFERENCES users_v3(id)
      )
    `);
    
    console.log('任务管理重构数据库迁移完成');
  } catch (error) {
    console.error('任务管理重构数据库迁移失败:', error);
  }
};

// 数据库迁移到V3
const migrateToV3 = async () => {
  try {
    initDatabaseV3();
    addCompletedOverdueField(); // 添加新字段迁移
    addTaskRefactorFields(); // 添加任务管理重构相关的新字段和表
    await insertInitialDataV3();
    console.log('数据库V3迁移完成！');
  } catch (error) {
    console.error('数据库V3迁移失败:', error);
    throw error;
  }
};

// 数据库操作辅助函数
const dbGet = (query, params = []) => {
  return db.prepare(query).get(params);
};

const dbAll = (query, params = []) => {
  return db.prepare(query).all(params);
};

const dbRun = (query, params = []) => {
  return db.prepare(query).run(params);
};

module.exports = {
  db,
  migrateToV3,
  dbGet,
  dbAll,
  dbRun,
  IDENTITIES,
  TASK_TYPES,
  TASK_STATUS,
  MILESTONE_STATUS
}; 