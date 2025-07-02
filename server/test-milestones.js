const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 测试里程碑功能
const testMilestones = async () => {
  try {
    console.log('开始测试里程碑功能...');
    
    // 1. 登录获取token
    console.log('\n1. 登录调度员账号...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: 'scheduler01',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✓ 登录成功');
    
    // 2. 获取可分配用户列表
    console.log('\n2. 获取可分配用户列表...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users/assignable`, { headers });
    const users = usersResponse.data;
    
    const executor = users.find(u => u.identity === 'staff');
    const productionLeader = users.find(u => u.identity === 'production_leader');
    
    console.log(`✓ 找到执行人: ${executor.name}`);
    console.log(`✓ 找到生产所领导: ${productionLeader.name}`);
    
    // 3. 创建带里程碑的任务
    console.log('\n3. 创建带里程碑的任务...');
    const taskData = {
      name: '带里程碑的测试任务',
      description: '这是一个包含多个里程碑的测试任务',
      type: 'project',
      production_leader: productionLeader.id,
      executor: executor.id,
      planned_start_date: '2024-01-15',
      planned_end_date: '2024-02-15',
      milestones: [
        {
          name: '需求分析完成',
          description: '完成项目需求分析和设计',
          planned_date: '2024-01-20'
        },
        {
          name: '原型开发完成',
          description: '完成系统原型开发',
          planned_date: '2024-01-30'
        },
        {
          name: '测试完成',
          description: '完成系统测试和验收',
          planned_date: '2024-02-10'
        }
      ]
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/tasks`, taskData, { headers });
    const taskId = createResponse.data.taskId;
    console.log(`✓ 任务创建成功，ID: ${taskId}`);
    
    // 4. 获取任务详情（包含里程碑）
    console.log('\n4. 获取任务详情...');
    const taskDetailResponse = await axios.get(`${BASE_URL}/api/tasks/${taskId}`, { headers });
    const task = taskDetailResponse.data;
    
    console.log(`✓ 任务: ${task.name}`);
    console.log(`✓ 里程碑数量: ${task.milestones.length}`);
    
    task.milestones.forEach((milestone, index) => {
      console.log(`  ${index + 1}. ${milestone.name} (${milestone.planned_date}) - 状态: ${milestone.status}`);
    });
    
    // 5. 更新第一个里程碑状态
    if (task.milestones.length > 0) {
      console.log('\n5. 更新第一个里程碑状态...');
      const firstMilestone = task.milestones[0];
      
      await axios.put(`${BASE_URL}/api/milestones/${firstMilestone.id}/status`, {
        status: 'completed',
        actual_date: '2024-01-19'
      }, { headers });
      
      console.log(`✓ 里程碑"${firstMilestone.name}"状态更新为已完成`);
    }
    
    // 6. 为任务添加新里程碑
    console.log('\n6. 为任务添加新里程碑...');
    await axios.post(`${BASE_URL}/api/tasks/${taskId}/milestones`, {
      name: '部署完成',
      description: '系统部署到生产环境',
      planned_date: '2024-02-14'
    }, { headers });
    
    console.log('✓ 新里程碑添加成功');
    
    // 7. 再次获取任务详情查看更新
    console.log('\n7. 查看更新后的任务详情...');
    const updatedTaskResponse = await axios.get(`${BASE_URL}/api/tasks/${taskId}`, { headers });
    const updatedTask = updatedTaskResponse.data;
    
    console.log(`✓ 任务: ${updatedTask.name}`);
    console.log(`✓ 里程碑数量: ${updatedTask.milestones.length}`);
    
    updatedTask.milestones.forEach((milestone, index) => {
      console.log(`  ${index + 1}. ${milestone.name} (${milestone.planned_date}) - 状态: ${milestone.status}${milestone.actual_date ? ` (实际: ${milestone.actual_date})` : ''}`);
    });
    
    // 8. 获取任务列表查看里程碑统计
    console.log('\n8. 查看任务列表中的里程碑统计...');
    const tasksResponse = await axios.get(`${BASE_URL}/api/tasks`, { headers });
    const tasks = tasksResponse.data;
    
    const testTask = tasks.find(t => t.id === taskId);
    if (testTask) {
      console.log(`✓ 任务"${testTask.name}"`);
      console.log(`  总里程碑: ${testTask.milestone_count}`);
      console.log(`  已完成里程碑: ${testTask.completed_milestone_count}`);
    }
    
    console.log('\n✅ 里程碑功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
};

// 检查服务器是否运行
const checkServer = async () => {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✓ 服务器运行正常');
    return true;
  } catch (error) {
    console.log('❌ 服务器未运行，请先启动服务器: node src/simple-server-v3.js');
    return false;
  }
};

const run = async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testMilestones();
  }
};

run(); 