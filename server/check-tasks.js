const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prodsync.db');
console.log('数据库路径:', dbPath);

try {
  const db = new Database(dbPath);
  console.log('数据库连接成功');
  
  const tasks = db.prepare(`
    SELECT 
      t.*,
      u1.name as created_by_name,
      u2.name as production_leader_name,
      u3.name as executor_name
    FROM tasks_v3 t
    LEFT JOIN users_v3 u1 ON t.created_by = u1.id
    LEFT JOIN users_v3 u2 ON t.production_leader = u2.id
    LEFT JOIN users_v3 u3 ON t.executor = u3.id
    ORDER BY t.created_at DESC
  `).all();
  
  console.log(`找到 ${tasks.length} 个任务:`);
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.name} (${task.type})`);
    console.log(`   状态: ${task.status}`);
    console.log(`   创建者: ${task.created_by_name}`);
    console.log(`   生产所负责人: ${task.production_leader_name || '未指定'}`);
    console.log(`   执行人: ${task.executor_name}`);
    console.log(`   创建时间: ${task.created_at}`);
    console.log('---');
  });
  
  db.close();
} catch (error) {
  console.error('数据库操作失败:', error);
} 