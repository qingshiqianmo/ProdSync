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

  // 创建任务表V3 - 支持两级分配：生产所负责人和执行人
  // actual_start_date and actual_end_date already exist.
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('meeting', 'project', 'miscellaneous')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      created_by INTEGER NOT NULL,
      production_leader INTEGER,
      executor INTEGER NOT NULL,
      forwarded_to INTEGER,
      planned_start_date DATE NOT NULL,
      planned_end_date DATE NOT NULL,
      actual_start_date DATE,
      actual_end_date DATE,
      completed_overdue BOOLEAN DEFAULT 0, -- 记录是否逾期完成
      acknowledged_by_leader_at DATETIME, -- New field for leader acknowledgement
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users_v3(id),
      FOREIGN KEY (production_leader) REFERENCES users_v3(id),
      FOREIGN KEY (executor) REFERENCES users_v3(id),
      FOREIGN KEY (forwarded_to) REFERENCES users_v3(id)
    )
  `);

  // 创建里程碑表 (Milestones Table) - if not already present from other scripts
  // Assuming 'milestones' table might be created by 'create-milestone-table.js' or similar.
  // For safety, we define it here with IF NOT EXISTS, including new fields.
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

// 数据库迁移到V3
const migrateToV3 = async () => {
  try {
    initDatabaseV3();
    addCompletedOverdueField(); // 添加新字段迁移
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