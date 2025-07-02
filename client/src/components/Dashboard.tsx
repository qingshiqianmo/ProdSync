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
  MenuProps
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
import { Task, User, UserIdentity, TaskType, TaskStatus } from '../types';
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

  const getTaskStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return 'success';
      case TaskStatus.IN_PROGRESS: return 'processing';
      case TaskStatus.CANCELLED: return 'error';
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

  const getTaskStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return '已完成';
      case TaskStatus.IN_PROGRESS: return '进行中';
      case TaskStatus.CANCELLED: return '已取消';
      case TaskStatus.PENDING: return '待处理';
      default: return status;
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalVisible(true);
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

  const statistics = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    cancelled: tasks.filter(t => t.status === TaskStatus.CANCELLED).length,
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => message.info('个人信息功能开发中')
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
            生产管理系统
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            V3.0 纯任务管理
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
              
              {/* 统计卡片 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
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
                      title="待处理"
                      value={statistics.pending}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
              </Row>

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
                            <Tag color={getTaskStatusColor(task.status)}>
                              {getTaskStatusText(task.status)}
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
              <Tag color={getTaskStatusColor(selectedTask.status)}>
                {getTaskStatusText(selectedTask.status)}
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
        )}
      </Modal>
    </Layout>
  );
};

export default Dashboard; 