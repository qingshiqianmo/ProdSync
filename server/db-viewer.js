const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prodsync.db');
const db = new sqlite3.Database(dbPath);

console.log('=== 生产项目管理系统数据库查看器 ===');
console.log('数据库路径:', dbPath);
console.log('');

// 查询用户数据
console.log('📋 用户列表:');
db.all('SELECT id, username, name, role, department, email FROM users', (err, rows) => {
  if (err) {
    console.error('查询用户失败:', err);
  } else {
    console.table(rows);
  }
  
  // 查询任务数据
  console.log('\n📋 任务列表:');
  db.all(`
    SELECT 
      t.id, 
      t.name, 
      t.type, 
      t.status, 
      u1.name as created_by_name,
      u2.name as assigned_to_name,
      t.planned_start_date,
      t.planned_end_date,
      t.created_at
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_to = u2.id
    ORDER BY t.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('查询任务失败:', err);
    } else {
      console.table(rows);
    }
    
    // 查询里程碑数据
    console.log('\n📋 里程碑列表:');
    db.all(`
      SELECT 
        m.id,
        m.name,
        t.name as task_name,
        m.status,
        m.planned_completion_date,
        m.actual_completion_date,
        u.name as created_by_name
      FROM milestones m
      LEFT JOIN tasks t ON m.task_id = t.id
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.planned_completion_date
    `, (err, rows) => {
      if (err) {
        console.error('查询里程碑失败:', err);
      } else {
        console.table(rows);
      }
      
      // 统计信息
      console.log('\n📊 统计信息:');
      db.get('SELECT COUNT(*) as total FROM users', (err, userCount) => {
        db.get('SELECT COUNT(*) as total FROM tasks', (err, taskCount) => {
          db.get('SELECT COUNT(*) as total FROM milestones', (err, milestoneCount) => {
            console.log(`用户总数: ${userCount.total}`);
            console.log(`任务总数: ${taskCount.total}`);
            console.log(`里程碑总数: ${milestoneCount.total}`);
            
            // 按状态统计任务
            db.all(`
              SELECT status, COUNT(*) as count 
              FROM tasks 
              GROUP BY status
            `, (err, statusCounts) => {
              console.log('\n任务状态分布:');
              statusCounts.forEach(row => {
                console.log(`  ${row.status}: ${row.count}个`);
              });
              
              db.close();
              console.log('\n=== 数据库查看完成 ===');
            });
          });
        });
      });
    });
  });
}); 