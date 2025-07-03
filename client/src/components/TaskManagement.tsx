import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Row,
  Col,
  Popconfirm,
  Tabs,
  Typography,
  Divider,
  List
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI, authAPI } from '../services/api';
import { Task, User, UserIdentity, TaskType, TaskStatus, CreateTaskRequest, MilestoneStatus } from '../types'; // Added MilestoneStatus
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Text } = Typography;

// 里程碑类型定义 (与 types/index.ts 中的 Milestone 保持一致或类似)
interface Milestone {
  id?: number;
  name: string;
  description: string;
  planned_date: string;
  actual_completion_date?: string; // 与 types/index.ts 一致
  status: MilestoneStatus; // Changed to use MilestoneStatus enum
  order_index: number;
}

const TaskManagement: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('开始加载任务和用户数据...');
      const [tasksData, usersData] = await Promise.all([
        taskAPI.getTasks(),
        authAPI.getAssignableUsers()
      ]);
      console.log('任务数据:', tasksData);
      console.log('可分配用户数据:', usersData);
      setTasks(tasksData);
      setAssignableUsers(usersData);
      message.success('数据加载成功');
    } catch (error: any) {
      console.error('加载数据失败:', error);
      message.error(`加载数据失败: ${error.message || '未知错误'}`);
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
      case TaskStatus.PENDING: return 'default';
      case TaskStatus.IN_PROGRESS: return 'processing';
      case TaskStatus.COMPLETED: return 'success';
      default: return 'default';
    }
  };

  const getTaskTypeText = (type: TaskType) => {
    switch (type) {
      case TaskType.MEETING: return '会议';
      case TaskType.PROJECT: return '项目';
      case TaskType.MISCELLANEOUS: return '零星任务';
      default: return '未知';
    }
  };

  const getTaskStatusText = (status: TaskStatus, isOverdue: boolean = false) => {
    if (isOverdue && status !== TaskStatus.COMPLETED) {
      return '已逾期';
    }
    switch (status) {
      case TaskStatus.PENDING: return '待处理';
      case TaskStatus.IN_PROGRESS: return '进行中';
      case TaskStatus.COMPLETED: return '已完成';
      default: return '未知';
    }
  };

  const getIdentityText = (identity: UserIdentity) => {
    switch (identity) {
      case UserIdentity.PRODUCTION_SCHEDULER: return '生产调度员';
      case UserIdentity.PRODUCTION_LEADER: return '生产所领导';
      case UserIdentity.STAFF: return '职员';
      default: return identity;
    }
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

  const addMilestone = () => {
    const newMilestone: Milestone = {
      name: '',
      description: '',
      planned_date: '',
      status: MilestoneStatus.PENDING, // Use enum
      order_index: milestones.length + 1
    };
    setMilestones([...milestones, newMilestone]);
  };

  const removeMilestone = (index: number) => {
    const newMilestones = milestones.filter((_, i) => i !== index);
    setMilestones(newMilestones);
  };

  const updateMilestone = (index: number, field: string, value: any) => {
    const newMilestones = [...milestones];
    (newMilestones[index] as any)[field] = value;
    setMilestones(newMilestones);
  };

  const handleCreateTask = async (values: any) => {
    try {
      const createData: CreateTaskRequest = {
        name: values.name,
        description: values.description || '',
        type: values.type,
        production_leader: values.production_leader,
        executor: values.executor,
        planned_start_date: values.dateRange[0].format('YYYY-MM-DD'),
        planned_end_date: values.dateRange[1].format('YYYY-MM-DD'),
        milestones: milestones.filter(m => m.name && m.planned_date)
      };
      
      await taskAPI.createTask(createData);
      message.success('任务创建成功');
      setIsCreateModalVisible(false);
      form.resetFields();
      setMilestones([]);
      loadData();
    } catch (error) {
      message.error('任务创建失败');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await taskAPI.deleteTask(taskId);
      message.success('任务删除成功');
      loadData();
    } catch (error) {
      message.error('任务删除失败');
    }
  };

  const openDetailModal = async (task: Task) => {
    try {
      // 获取任务详情（包含里程碑）
      const taskDetail = await taskAPI.getTask(task.id);
      setSelectedTask(taskDetail);
      setIsDetailModalVisible(true);
    } catch (error) {
      message.error('获取任务详情失败');
    }
  };

  const canDeleteTask = (task: Task) => {
    if (user?.identity === UserIdentity.ADMIN) return true;
    if (user?.identity === UserIdentity.PRODUCTION_SCHEDULER) return true;
    return false;
  };

  const canEditTask = (task: Task) => {
    if (user?.identity === UserIdentity.ADMIN) return true;
    if (user?.identity === UserIdentity.PRODUCTION_SCHEDULER) return true;
    return false;
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    editForm.setFieldsValue({
      name: task.name,
      description: task.description,
      type: task.type,
      production_leader: task.production_leader,
      executor: task.executor,
      dateRange: [dayjs(task.planned_start_date), dayjs(task.planned_end_date)]
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateTask = async (values: any) => {
    if (!selectedTask) return;
    
    try {
      const updateData = {
        name: values.name,
        description: values.description || '',
        type: values.type,
        production_leader: values.production_leader,
        executor: values.executor,
        planned_start_date: values.dateRange[0].format('YYYY-MM-DD'),
        planned_end_date: values.dateRange[1].format('YYYY-MM-DD')
      };
      
      await taskAPI.updateTask(selectedTask.id, updateData);
      message.success('任务更新成功');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setSelectedTask(null);
      loadData();
    } catch (error) {
      message.error('任务更新失败');
    }
  };

  const columns: ColumnsType<Task> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Task) => (
        <a onClick={() => openDetailModal(record)}>{text}</a>
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
      title: '创建者',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
    },
    {
      title: '生产所负责人',
      dataIndex: 'production_leader_name',
      key: 'production_leader_name',
      render: (name: string) => name || '-',
    },
    {
      title: '执行人',
      dataIndex: 'executor_name',
      key: 'executor_name',
    },
    {
      title: '里程碑',
      key: 'milestones',
      render: (text: string, record: any) => {
        if (record.milestone_count > 0) {
          return (
            <span>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {record.completed_milestone_count}/{record.milestone_count}
            </span>
          );
        }
        return '-';
      },
    },
    {
      title: '计划开始',
      dataIndex: 'planned_start_date',
      key: 'planned_start_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '计划结束',
      dataIndex: 'planned_end_date',
      key: 'planned_end_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '实际开始',
      dataIndex: 'actual_start_date',
      key: 'actual_start_date',
      render: (date?: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '实际结束',
      dataIndex: 'actual_end_date',
      key: 'actual_end_date',
      render: (date?: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: Task) => {
        const isAdmin = user?.identity === UserIdentity.ADMIN;
        const isScheduler = user?.identity === UserIdentity.PRODUCTION_SCHEDULER;
        const isExecutor = user?.id === record.executor;
        const isProductionLeader = user?.id === record.production_leader;

        // Permissions
        const canStartOrCompleteTask = isAdmin || isScheduler || isExecutor;
        // const canAcknowledgeTask = isProductionLeader && !record.acknowledged_by_leader_at;
        // Deletion permission is handled by canDeleteTask function

        return (
          <Space size="small">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => openDetailModal(record)}
              size="small"
            >
              查看
            </Button>

            {/* Admin or Scheduler: Edit Task */}
            {canEditTask(record) && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
                size="small"
              >
                编辑
              </Button>
            )}

            {/* Production Leader: Acknowledge Task */}
            {isProductionLeader && !record.acknowledged_by_leader_at && (
              <Button
                type="link"
                size="small"
                style={{ color: 'green' }}
                onClick={async () => {
                  try {
                    await taskAPI.acknowledgeTask(record.id);
                    message.success('任务已确认收到');
                    loadData();
                  } catch (error) {
                    message.error('确认收到任务失败');
                  }
                }}
              >
                确认收到
              </Button>
            )}

            {/* Executor or Admin/Scheduler: Start Task */}
            {canStartOrCompleteTask && record.status === TaskStatus.PENDING && (
              <Popconfirm
                title="确定要开始这个任务吗？"
                onConfirm={async () => {
                  try {
                    await taskAPI.updateTaskStatus(record.id, TaskStatus.IN_PROGRESS);
                    message.success('任务已标记为进行中');
                    loadData();
                  } catch (error) {
                    message.error('操作失败');
                  }
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                >
                  开始任务
                </Button>
              </Popconfirm>
            )}

            {/* Executor or Admin/Scheduler: Complete Task */}
            {canStartOrCompleteTask && record.status === TaskStatus.IN_PROGRESS && (
              <Popconfirm
                title="确定要完成这个任务吗？"
                onConfirm={async () => {
                  try {
                    await taskAPI.updateTaskStatus(record.id, TaskStatus.COMPLETED);
                    message.success('任务已标记为完成');
                    loadData();
                  } catch (error) {
                    message.error('操作失败');
                  }
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                >
                  完成任务
                </Button>
              </Popconfirm>
            )}

            {/* Admin or Scheduler: Delete Task (using existing canDeleteTask) */}
            {canDeleteTask(record) && ( // canDeleteTask already checks for ADMIN or PRODUCTION_SCHEDULER
              <Popconfirm
                title="确定删除这个任务吗？"
                onConfirm={() => handleDeleteTask(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const filterTasks = (status?: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  // 检查任务是否逾期
  const isTaskOverdue = (task: Task) => {
    if (task.status === TaskStatus.COMPLETED) return false;
    const today = dayjs().format('YYYY-MM-DD');
    return dayjs(today).isAfter(dayjs(task.planned_end_date));
  };

  // 过滤逾期任务
  const filterOverdueTasks = () => {
    return tasks.filter(task => isTaskOverdue(task));
  };

  const renderTaskTable = (filteredTasks: Task[]) => (
    <Table
      columns={columns}
      dataSource={filteredTasks}
      rowKey="id"
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
      }}
    />
  );

  const getTaskScopeDescription = () => {
    if (user?.identity === UserIdentity.ADMIN || user?.identity === UserIdentity.PRODUCTION_SCHEDULER) {
      return "显示所有任务";
    } else {
      return "显示与您相关的任务（创建的、负责的、执行的、转发给您的）";
    }
  };

  return (
    <div>
      <Card
        title="任务管理"
        extra={
          (user?.identity === UserIdentity.PRODUCTION_SCHEDULER || user?.identity === UserIdentity.ADMIN) && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              新建任务
            </Button>
          )
        }
      >
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
          <Text type="secondary">
            📋 当前视图：{getTaskScopeDescription()}
          </Text>
        </div>
        <Tabs defaultActiveKey="all" size="large">
          <TabPane tab="全部任务" key="all">
            {renderTaskTable(tasks)}
          </TabPane>
          <TabPane tab="待处理" key="pending">
            {renderTaskTable(filterTasks(TaskStatus.PENDING))}
          </TabPane>
          <TabPane tab="进行中" key="in_progress">
            {renderTaskTable(filterTasks(TaskStatus.IN_PROGRESS))}
          </TabPane>
          <TabPane tab="已完成" key="completed">
            {renderTaskTable(filterTasks(TaskStatus.COMPLETED))}
          </TabPane>
          <TabPane tab="已逾期" key="overdue">
            {renderTaskTable(filterOverdueTasks())}
          </TabPane>
        </Tabs>
      </Card>

      {/* 新建任务Modal */}
      <Modal
        title="新建任务"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
          setMilestones([]);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select placeholder="请选择任务类型">
              <Option value={TaskType.MEETING}>会议</Option>
              <Option value={TaskType.PROJECT}>项目</Option>
              <Option value={TaskType.MISCELLANEOUS}>零星任务</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="production_leader"
            label="生产所负责人"
            extra="可选，指定生产所层面的负责人"
          >
            <Select placeholder="请选择生产所负责人（可选）" allowClear>
              {assignableUsers
                .filter(u => u.identity === UserIdentity.PRODUCTION_LEADER)
                .map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.name} ({getIdentityText(user.identity)})
                  </Option>
                ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="executor"
            label="执行人"
            rules={[{ required: true, message: '请选择执行人' }]}
            extra="必选，实际执行任务的人员"
          >
            <Select placeholder="请选择执行人">
              {assignableUsers.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.name} ({getIdentityText(user.identity)})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="dateRange"
            label="计划时间"
            rules={[{ required: true, message: '请选择计划时间' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="任务描述"
          >
            <TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>

          <Divider>里程碑节点（可选）</Divider>
          
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="dashed" 
              onClick={addMilestone}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              添加里程碑
            </Button>
          </div>

          {milestones.map((milestone, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ marginBottom: 12 }}
              title={`里程碑 ${index + 1}`}
              extra={
                <Button 
                  type="link" 
                  danger 
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeMilestone(index)}
                  size="small"
                >
                  删除
                </Button>
              }
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="里程碑名称" style={{ marginBottom: 12 }}>
                    <Input 
                      placeholder="请输入里程碑名称"
                      value={milestone.name}
                      onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="计划时间" style={{ marginBottom: 12 }}>
                    <DatePicker 
                      style={{ width: '100%' }}
                      placeholder="选择计划时间"
                      value={milestone.planned_date ? dayjs(milestone.planned_date) : null}
                      onChange={(date) => updateMilestone(index, 'planned_date', date ? date.format('YYYY-MM-DD') : '')}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="里程碑描述" style={{ marginBottom: 0 }}>
                <TextArea 
                  rows={2}
                  placeholder="请输入里程碑描述（可选）"
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                />
              </Form.Item>
            </Card>
          ))}
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                form.resetFields();
                setMilestones([]);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑任务Modal */}
      <Modal
        title="编辑任务"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateTask}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select placeholder="请选择任务类型">
              <Option value={TaskType.MEETING}>会议</Option>
              <Option value={TaskType.PROJECT}>项目</Option>
              <Option value={TaskType.MISCELLANEOUS}>零星任务</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="production_leader"
            label="生产所负责人"
            extra="可选，指定生产所层面的负责人"
          >
            <Select placeholder="请选择生产所负责人（可选）" allowClear>
              {assignableUsers
                .filter(u => u.identity === UserIdentity.PRODUCTION_LEADER)
                .map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.name} ({getIdentityText(user.identity)})
                  </Option>
                ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="executor"
            label="执行人"
            rules={[{ required: true, message: '请选择执行人' }]}
            extra="必选，实际执行任务的人员"
          >
            <Select placeholder="请选择执行人">
              {assignableUsers.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.name} ({getIdentityText(user.identity)})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="dateRange"
            label="计划时间"
            rules={[{ required: true, message: '请选择计划时间' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="任务描述"
          >
            <TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button onClick={() => {
                setIsEditModalVisible(false);
                editForm.resetFields();
                setSelectedTask(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

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
        width={900}
      >
        {selectedTask && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>任务名称：</strong>{selectedTask.name}
              </Col>
              <Col span={12}>
                <strong>类型：</strong>
                <Tag color={getTaskTypeColor(selectedTask.type)} style={{ marginLeft: 8 }}>
                  {getTaskTypeText(selectedTask.type)}
                </Tag>
                {selectedTask.acknowledged_by_leader_at && (
                  <Tag color="cyan" style={{ marginLeft: 8 }}>
                    所领导已确认: {dayjs(selectedTask.acknowledged_by_leader_at).format('YYYY-MM-DD HH:mm')}
                  </Tag>
                )}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <strong>状态：</strong>
                <Tag color={getTaskStatusColor(selectedTask.status)} style={{ marginLeft: 8 }}>
                  {getTaskStatusText(selectedTask.status)}
                </Tag>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>创建者：</strong>{selectedTask.created_by_name}
              </Col>
              <Col span={12}>
                <strong>生产所负责人：</strong>{selectedTask.production_leader_name || '未指定'}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>执行人：</strong>{selectedTask.executor_name}
              </Col>
              <Col span={12}>
                {selectedTask.forwarded_to_name && (
                  <>
                    <strong>转发给：</strong>{selectedTask.forwarded_to_name}
                  </>
                )}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>计划开始：</strong>{dayjs(selectedTask.planned_start_date).format('YYYY-MM-DD')}
              </Col>
              <Col span={12}>
                <strong>计划结束：</strong>{dayjs(selectedTask.planned_end_date).format('YYYY-MM-DD')}
              </Col>
            </Row>
            {selectedTask.actual_start_date && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <strong>实际开始：</strong>{dayjs(selectedTask.actual_start_date).format('YYYY-MM-DD')}
                </Col>
                {selectedTask.actual_end_date && (
                  <Col span={12}>
                    <strong>实际结束：</strong>{dayjs(selectedTask.actual_end_date).format('YYYY-MM-DD')}
                  </Col>
                )}
              </Row>
            )}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <strong>描述：</strong>
                <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  {selectedTask.description || '暂无描述'}
                </div>
              </Col>
            </Row>

            {/* 里程碑信息 */}
            {selectedTask.milestones && selectedTask.milestones.length > 0 && (
              <>
                <Divider>里程碑节点</Divider>
                <List
                  dataSource={selectedTask.milestones}
                  renderItem={(milestone: Milestone, index: number) => {
                    const isAdmin = user?.identity === UserIdentity.ADMIN;
                    const isScheduler = user?.identity === UserIdentity.PRODUCTION_SCHEDULER;
                    const isExecutorOfTask = user && selectedTask && user.id === selectedTask.executor;

                    // Permission to complete milestone: Admin, Scheduler, or Executor of the task
                    const canCompleteMilestone = isAdmin || isScheduler || isExecutorOfTask;

                    return (
                      <List.Item>
                        <Card size="small" style={{ width: '100%' }}>
                          <Row gutter={16} align="middle">
                            <Col flex="auto">
                              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                {index + 1}. {milestone.name}
                              </div>
                              {milestone.description && (
                                <div style={{ color: '#666', marginBottom: 8, fontSize: '12px' }}>
                                  {milestone.description}
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                计划时间：{dayjs(milestone.planned_date).format('YYYY-MM-DD')}
                                {milestone.actual_completion_date && (
                                  <span style={{ marginLeft: 16 }}>
                                    实际完成：{dayjs(milestone.actual_completion_date).format('YYYY-MM-DD')}
                                  </span>
                                )}
                              </div>
                            </Col>
                            <Col flex="120px" style={{ textAlign: 'right' }}>
                              <Tag color={getMilestoneStatusColor(milestone.status, isMilestoneOverdue(milestone))}>
                                {getMilestoneStatusText(milestone.status, isMilestoneOverdue(milestone))}
                              </Tag>
                              {canCompleteMilestone && milestone.status !== MilestoneStatus.COMPLETED && milestone.id && (
                                <Popconfirm
                                  title="确定要完成这个里程碑节点吗？"
                                  onConfirm={async () => {
                                    if (milestone.id) {
                                      try {
                                        await taskAPI.updateMilestoneStatus(milestone.id, {
                                          status: MilestoneStatus.COMPLETED,
                                          actual_completion_date: dayjs().format('YYYY-MM-DD'),
                                        });
                                        message.success('里程碑已标记为完成');
                                        const updatedTaskDetail = await taskAPI.getTask(selectedTask.id);
                                        setSelectedTask(updatedTaskDetail);
                                        loadData();
                                      } catch (error) {
                                        message.error('完成里程碑操作失败');
                                      }
                                    } else {
                                      message.error('无法更新里程碑：缺少里程碑ID');
                                      console.error("Attempted to update milestone without an ID", milestone);
                                    }
                                  }}
                                  okText="确定"
                                  cancelText="取消"
                                >
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{ marginTop: 4, display: 'block', marginLeft: 'auto' }}
                                  >
                                    完成节点
                                  </Button>
                                </Popconfirm>
                              )}
                            </Col>
                          </Row>
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              </>
            )}

            <Divider />
            {/* Task Action Buttons in Modal */}
            {user && selectedTask && (
              <Space style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                {/* Production Leader: Acknowledge Task */}
                {user.identity === UserIdentity.PRODUCTION_LEADER &&
                  user.id === selectedTask.production_leader &&
                  !selectedTask.acknowledged_by_leader_at && (
                  <Button
                    style={{ borderColor: 'green', color: 'green' }}
                    onClick={async () => {
                      try {
                        const updated = await taskAPI.acknowledgeTask(selectedTask.id);
                        setSelectedTask(updated.task);
                        message.success('任务已确认收到');
                        loadData(); // Refresh list
                      } catch (error) {
                        message.error('确认收到任务失败');
                      }
                    }}
                  >
                    确认收到任务
                  </Button>
                )}

                {/* Executor or Admin/Scheduler: Start Task */}
                {(user.identity === UserIdentity.ADMIN ||
                  user.identity === UserIdentity.PRODUCTION_SCHEDULER ||
                  user.id === selectedTask.executor) &&
                  selectedTask.status === TaskStatus.PENDING && (
                  <Popconfirm
                    title="确定要开始这个任务吗？"
                    onConfirm={async () => {
                      try {
                        const updated = await taskAPI.updateTaskStatus(selectedTask.id, TaskStatus.IN_PROGRESS);
                        setSelectedTask(updated.task);
                        message.success('任务已标记为进行中');
                        loadData();
                      } catch (error) { message.error('操作失败'); }
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button>
                      开始任务
                    </Button>
                  </Popconfirm>
                )}
                {/* Executor or Admin/Scheduler: Complete Task */}
                {(user.identity === UserIdentity.ADMIN ||
                  user.identity === UserIdentity.PRODUCTION_SCHEDULER ||
                  user.id === selectedTask.executor) &&
                  selectedTask.status === TaskStatus.IN_PROGRESS && (
                  <Popconfirm
                    title="确定要完成这个任务吗？"
                    onConfirm={async () => {
                      try {
                        const updated = await taskAPI.updateTaskStatus(selectedTask.id, TaskStatus.COMPLETED);
                        setSelectedTask(updated.task);
                        message.success('任务已标记为完成');
                        loadData();
                      } catch (error) { message.error('操作失败'); }
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="primary">
                      完成任务
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )}
            
            <Row gutter={16} style={{ marginTop: 24 }}>
              <Col span={12}>
                <strong>创建时间：</strong>{dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
              <Col span={12}>
                <strong>更新时间：</strong>{dayjs(selectedTask.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskManagement; 