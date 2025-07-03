import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Card, 
  Button, 
  Tag, 
  Statistic, 
  Row, 
  Col,
  Typography,
  Avatar,
  Dropdown,
  message,
  Modal,
  Descriptions,
  MenuProps,
  Form,
  Input,
  Divider,
  List
} from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  UserOutlined,
  LogoutOutlined,
  EyeOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI, authAPI } from '../services/api';
import { Task, User, UserIdentity, TaskType, TaskStatus, Milestone, MilestoneStatus } from '../types';
import dayjs from 'dayjs';
import TaskManagement from './TaskManagement';
import UserManagement from './UserManagement';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // 当切换到仪表板时重新加载数据
    if (currentView === 'dashboard') {
      loadData();
    }
  }, [currentView]);

  const loadData = async () => {
    try {
      const [tasksData, usersData] = await Promise.all([
        taskAPI.getTasks(),
        authAPI.getUsers().catch(() => []) // 如果没有权限就返回空数组
      ]);
      setTasks(tasksData);
      setUsers(usersData);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeColor = (type: TaskType) => {
    switch (type) {
      case TaskType.MEETING: return 'blue';
      case TaskType.PROJECT: return 'green';
      case TaskType.MISCELLANEOUS: return 'orange';
      default: return 'default';
    }
  };

  const getTaskStatusColor = (status: TaskStatus, isOverdue: boolean = false) => {
    if (isOverdue && status !== TaskStatus.COMPLETED) {
      return 'error'; // 逾期显示红色
    }
    switch (status) {
      case TaskStatus.COMPLETED: return 'success';
      case TaskStatus.IN_PROGRESS: return 'processing';
      case TaskStatus.PENDING: return 'default';
      default: return 'default';
    }
  };

  const getTaskTypeText = (type: TaskType) => {
    switch (type) {
      case TaskType.MEETING: return '会议';
      case TaskType.PROJECT: return '项目';
      case TaskType.MISCELLANEOUS: return '零星任务';
      default: return type;
    }
  };

  const getTaskStatusText = (status: TaskStatus, isOverdue: boolean = false) => {
    if (isOverdue && status !== TaskStatus.COMPLETED) {
      return '已逾期';
    }
    switch (status) {
      case TaskStatus.COMPLETED: return '已完成';
      case TaskStatus.IN_PROGRESS: return '进行中';
      case TaskStatus.PENDING: return '待处理';
      default: return status;
    }
  };

  // 检查任务是否逾期
  const isTaskOverdue = (task: Task) => {
    if (task.status === TaskStatus.COMPLETED) return false;
    const today = dayjs().format('YYYY-MM-DD');
    return dayjs(today).isAfter(dayjs(task.planned_end_date));
  };

  // 检查里程碑是否逾期
  const isMilestoneOverdue = (milestone: Milestone) => {
    if (milestone.status === MilestoneStatus.COMPLETED) return false;
    const today = dayjs().format('YYYY-MM-DD');
    return dayjs(today).isAfter(dayjs(milestone.planned_date));
  };

  const getMilestoneStatusColor = (status: MilestoneStatus, isOverdue: boolean = false) => {
    if (isOverdue && status !== MilestoneStatus.COMPLETED) {
      return 'error'; // 逾期显示红色
    }
    switch (status) {
      case MilestoneStatus.PENDING: return 'default';
      case MilestoneStatus.IN_PROGRESS: return 'processing';
      case MilestoneStatus.COMPLETED: return 'success';
      case MilestoneStatus.DELAYED: return 'error';
      default: return 'default';
    }
  };

  const getMilestoneStatusText = (status: MilestoneStatus, isOverdue: boolean = false) => {
    if (isOverdue && status !== MilestoneStatus.COMPLETED) {
      return '已逾期';
    }
    switch (status) {
      case MilestoneStatus.PENDING: return '待开始';
      case MilestoneStatus.IN_PROGRESS: return '进行中';
      case MilestoneStatus.COMPLETED: return '已完成';
      case MilestoneStatus.DELAYED: return '延期';
      default: return status;
    }
  };

  const openTaskDetail = async (task: Task) => {
    try {
      const taskDetail = await taskAPI.getTask(task.id);
      setSelectedTask(taskDetail);
      setIsDetailModalVisible(true);
    } catch (error) {
      message.error('获取任务详情失败');
    }
  };

  // 打开个人信息编辑
  const openProfileModal = () => {
    profileForm.setFieldsValue({
      name: user?.name,
      department: user?.department || '',
      email: user?.email || ''
    });
    setIsProfileModalVisible(true);
  };

  // 更新个人信息
  const handleUpdateProfile = async (values: any) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('个人信息更新成功');
        setIsProfileModalVisible(false);
        profileForm.resetFields();
        // 重新获取用户信息
        const updatedUser = await authAPI.getCurrentUser();
        // 这里需要更新上下文中的用户信息，但由于useAuth的限制，我们暂时只显示成功消息
      } else {
        const error = await response.json();
        message.error(error.message || '更新失败');
      }
    } catch (error) {
      message.error('更新个人信息失败');
    }
  };

  // 修改密码
  const handleChangePassword = async (values: any) => {
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('密码修改成功');
        setIsPasswordModalVisible(false);
        passwordForm.resetFields();
      } else {
        const error = await response.json();
        message.error(error.message || '修改失败');
      }
    } catch (error) {
      message.error('修改密码失败');
    }
  };

  const getDataScopeDescription = () => {
    if (user?.identity === UserIdentity.ADMIN || user?.identity === UserIdentity.PRODUCTION_SCHEDULER) {
      return "显示所有数据的统计信息";
    } else {
      return "显示与您相关数据的统计信息";
    }
  };

  const recentTasks = tasks.slice(0, 5);

  const taskColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Task) => (
        <a onClick={() => openTaskDetail(record)}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: TaskType) => (
        <Tag color={getTaskTypeColor(type)}>
          {getTaskTypeText(type)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TaskStatus) => (
        <Tag color={getTaskStatusColor(status)}>
          {getTaskStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '执行人',
      dataIndex: 'executor_name',
      key: 'executor_name',
    },
    {
      title: '计划结束',
      dataIndex: 'planned_end_date',
      key: 'planned_end_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: Task) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => openTaskDetail(record)}
          size="small"
        >
          查看
        </Button>
      ),
    },
  ];

  // 计算里程碑统计
  const getAllMilestones = () => {
    const allMilestones: Milestone[] = [];
    tasks.forEach(task => {
      if (task.milestones && task.milestones.length > 0) {
        allMilestones.push(...task.milestones);
      }
    });
    return allMilestones;
  };

  const allMilestones = getAllMilestones();

  const statistics = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    overdue: tasks.filter(t => isTaskOverdue(t)).length,
    
    // 里程碑统计
    milestones: {
      total: allMilestones.length,
      completed: allMilestones.filter(m => m.status === MilestoneStatus.COMPLETED).length,
      overdue: allMilestones.filter(m => isMilestoneOverdue(m)).length,
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: openProfileModal
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout
    }
  ];

  const sideMenuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板'
    },
    {
      key: 'tasks',
      icon: <ProjectOutlined />,
      label: '任务管理'
    },
    ...(user?.identity === UserIdentity.ADMIN ? [{
      key: 'users',
      icon: <TeamOutlined />,
      label: '用户管理'
    }] : [])
  ];

  const getIdentityText = (identity: UserIdentity) => {
    switch (identity) {
      case UserIdentity.ADMIN: return '系统管理员';
      case UserIdentity.PRODUCTION_SCHEDULER: return '生产调度员';
      case UserIdentity.PRODUCTION_LEADER: return '生产所领导';
      case UserIdentity.STAFF: return '职员';
      default: return identity;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            中铁二院电化院生产管理系统
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            测试版
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentView]}
          items={sideMenuItems}
          onClick={({ key }) => setCurrentView(key)}
          style={{ height: 'calc(100% - 80px)', borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={3} style={{ margin: 0 }}>
            {currentView === 'dashboard' && '仪表板'}
            {currentView === 'tasks' && '任务管理'}
            {currentView === 'users' && '用户管理'}
          </Title>
          
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar icon={<UserOutlined />} />
              <div style={{ minWidth: '80px' }}>
                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{user?.name}</div>
                <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                  {user?.identity && getIdentityText(user.identity)}
                </div>
              </div>
            </div>
          </Dropdown>
        </Header>
        
        <Content style={{ margin: '24px', background: '#f0f2f5' }}>
          {currentView === 'dashboard' && (
            <>
              {/* 权限提示 */}
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff', borderRadius: 6, border: '1px solid #d9d9d9' }}>
                <Text type="secondary">
                  📊 数据范围：{getDataScopeDescription()}
                </Text>
              </div>
              
              {/* 任务统计卡片 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="任务总数"
                      value={statistics.total}
                      prefix={<ProjectOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="已完成"
                      value={statistics.completed}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="进行中"
                      value={statistics.inProgress}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="任务逾期"
                      value={statistics.overdue}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 里程碑统计卡片 */}
              {statistics.milestones.total > 0 && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="里程碑总数"
                        value={statistics.milestones.total}
                        prefix="🎯"
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="已完成里程碑"
                        value={statistics.milestones.completed}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="里程碑逾期"
                        value={statistics.milestones.overdue}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="完成率"
                        value={statistics.milestones.total > 0 ? Math.round((statistics.milestones.completed / statistics.milestones.total) * 100) : 0}
                        suffix="%"
                        valueStyle={{ color: statistics.milestones.total > 0 && (statistics.milestones.completed / statistics.milestones.total) >= 0.8 ? '#3f8600' : '#666' }}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              <Row gutter={16}>
                <Col span={24}>
                  <Card title="最近任务" extra={<a onClick={() => setCurrentView('tasks')}>查看全部</a>}>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {recentTasks.map(task => (
                        <div key={task.id} style={{ 
                          padding: '12px 0', 
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                              <a onClick={() => openTaskDetail(task)}>{task.name}</a>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              <Tag color={getTaskTypeColor(task.type)}>
                                {getTaskTypeText(task.type)}
                              </Tag>
                              <span style={{ marginLeft: 8 }}>
                                执行人：{task.executor_name}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Tag color={getTaskStatusColor(task.status, isTaskOverdue(task))}>
                              {getTaskStatusText(task.status, isTaskOverdue(task))}
                            </Tag>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                              {dayjs(task.planned_end_date).format('MM-DD')}
                            </div>
                          </div>
                        </div>
                      ))}
                      {recentTasks.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          暂无任务数据
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>
            </>
          )}

          {currentView === 'tasks' && (
            <TaskManagement />
          )}

          {currentView === 'users' && user?.identity === UserIdentity.ADMIN && (
            <UserManagement />
          )}
        </Content>
      </Layout>

      {/* 任务详情Modal */}
      <Modal
        title="任务详情"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedTask(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsDetailModalVisible(false);
            setSelectedTask(null);
          }}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedTask && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="任务名称" span={2}>
                {selectedTask.name}
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                <Tag color={getTaskTypeColor(selectedTask.type)}>
                  {getTaskTypeText(selectedTask.type)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="任务状态">
                <Tag color={getTaskStatusColor(selectedTask.status, isTaskOverdue(selectedTask))}>
                  {getTaskStatusText(selectedTask.status, isTaskOverdue(selectedTask))}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建者">
                {selectedTask.created_by_name}
              </Descriptions.Item>
              <Descriptions.Item label="生产所负责人">
                {selectedTask.production_leader_name || '未指定'}
              </Descriptions.Item>
              <Descriptions.Item label="执行人">
                {selectedTask.executor_name}
              </Descriptions.Item>
              <Descriptions.Item label="计划开始">
                {dayjs(selectedTask.planned_start_date).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="计划结束">
                {dayjs(selectedTask.planned_end_date).format('YYYY-MM-DD')}
              </Descriptions.Item>
              {selectedTask.actual_start_date && (
                <Descriptions.Item label="实际开始">
                  {dayjs(selectedTask.actual_start_date).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
              {selectedTask.actual_end_date && (
                <Descriptions.Item label="实际结束">
                  {dayjs(selectedTask.actual_end_date).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(selectedTask.updated_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {selectedTask.description && (
                <Descriptions.Item label="任务描述" span={2}>
                  {selectedTask.description}
                </Descriptions.Item>
              )}
            </Descriptions>
            
            {/* 里程碑列表 */}
            {selectedTask.milestones && selectedTask.milestones.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Divider orientation="left">里程碑节点</Divider>
                <List
                  dataSource={selectedTask.milestones}
                  renderItem={(milestone: Milestone) => (
                    <List.Item
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                    >
                      <List.Item.Meta
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{milestone.name}</span>
                            <Tag color={getMilestoneStatusColor(milestone.status, isMilestoneOverdue(milestone))}>
                              {getMilestoneStatusText(milestone.status, isMilestoneOverdue(milestone))}
                            </Tag>
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <Text type="secondary">
                                计划完成：{dayjs(milestone.planned_date).format('YYYY-MM-DD')}
                              </Text>
                            </div>
                            {milestone.actual_completion_date && (
                              <div style={{ marginBottom: 4 }}>
                                <Text type="secondary">
                                  实际完成：{dayjs(milestone.actual_completion_date).format('YYYY-MM-DD')}
                                </Text>
                              </div>
                            )}
                            {milestone.description && (
                              <div>
                                <Text type="secondary">{milestone.description}</Text>
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 个人信息Modal */}
      <Modal
        title="个人信息"
        open={isProfileModalVisible}
        onCancel={() => {
          setIsProfileModalVisible(false);
          profileForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          
          <Form.Item
            name="department"
            label="部门"
          >
            <Input placeholder="请输入部门" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button 
              style={{ marginRight: 8 }}
              onClick={() => {
                setIsProfileModalVisible(false);
                profileForm.resetFields();
              }}
            >
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
            <Button 
              style={{ marginLeft: 8 }}
              onClick={() => {
                setIsProfileModalVisible(false);
                setIsPasswordModalVisible(true);
              }}
            >
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码Modal */}
      <Modal
        title="修改密码"
        open={isPasswordModalVisible}
        onCancel={() => {
          setIsPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请确认新密码" />
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button 
              style={{ marginRight: 8 }}
              onClick={() => {
                setIsPasswordModalVisible(false);
                passwordForm.resetFields();
              }}
            >
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Dashboard; 