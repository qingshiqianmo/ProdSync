const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prodsync.db');

const createMilestoneTable = () => {
  try {
    console.log('创建里程碑表...');
    const db = new Database(dbPath);
    
    // 创建里程碑表
    db.prepare(`
      CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        planned_date DATE NOT NULL,
        actual_date DATE,
        status TEXT DEFAULT 'pending',
        order_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks_v3 (id) ON DELETE CASCADE
      )
    `).run();
    
    // 创建索引
    db.prepare('CREATE INDEX IF NOT EXISTS idx_milestones_task_id ON milestones (task_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones (status)').run();
    
    console.log('✓ 里程碑表创建成功');
    
    // 显示表结构
    const columns = db.prepare("PRAGMA table_info(milestones)").all();
    console.log('\n里程碑表结构:');
    columns.forEach(col => {
      console.log(`  ${col.name} (${col.type})`);
    });
    
    db.close();
    console.log('\n数据库连接已关闭');
    
  } catch (error) {
    console.error('创建里程碑表失败:', error);
  }
};

createMilestoneTable(); 