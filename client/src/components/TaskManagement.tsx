import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  message,
  Spin,
  Space,
  Row,
  Col,
  Typography
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI, authAPI } from '../services/api';
import { Task, User, UserIdentity } from '../types';
import TaskTable from './TaskTable';
import TaskModal from './TaskModal';
import TaskDetailModal from './TaskDetailModal';
import AssignTaskModal from './AssignTaskModal';
import CompleteTaskModal from './CompleteTaskModal';

const { Title } = Typography;

const TaskManagement: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // 获取任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await taskAPI.getTasks();
      setTasks(response);
    } catch (error: any) {
      message.error('获取任务列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await authAPI.getAssignableUsers();
      setUsers(response);
    } catch (error: any) {
      message.error('获取用户列表失败: ' + error.message);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const handleCreateTask = () => {
    setEditingTask(null);
    setModalVisible(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await taskAPI.deleteTask(taskId);
      message.success('任务删除成功');
      fetchTasks();
    } catch (error: any) {
      message.error('删除任务失败: ' + error.message);
    }
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
  };

  const handleAssignTaskClick = (task: Task) => {
    setSelectedTask(task);
    setAssignModalVisible(true);
  };

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setCompleteModalVisible(true);
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingTask(null);
    fetchTasks();
  };

  const handleAssignModalSuccess = () => {
    setAssignModalVisible(false);
    setSelectedTask(null);
    fetchTasks();
  };

  const handleAssignTask = async (taskId: number, executorId: number) => {
    try {
      await taskAPI.assignTask(taskId, executorId);
      message.success('任务分配成功');
      handleAssignModalSuccess();
    } catch (error: any) {
      message.error('任务分配失败: ' + error.message);
      throw error;
    }
  };

  const handleCompleteModalSuccess = () => {
    setCompleteModalVisible(false);
    setSelectedTask(null);
    fetchTasks();
  };

  const canCreateTask = () => {
    return user?.identity === UserIdentity.ADMIN || 
           user?.identity === UserIdentity.PRODUCTION_SCHEDULER;
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>任务管理</Title>
          </Col>
          <Col>
            <Space>
              {canCreateTask() && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
                  onClick={handleCreateTask}
                >
                  创建任务
                </Button>
              )}
            </Space>
              </Col>
            </Row>

        <Spin spinning={loading}>
          <TaskTable
            tasks={tasks}
            loading={loading}
            user={user}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onView={handleViewTask}
            onAssign={handleAssignTaskClick}
            onComplete={handleCompleteTask}
          />
        </Spin>
                        </Card>

      <TaskModal
        visible={modalVisible}
        title={editingTask ? '编辑任务' : '创建任务'}
        isEdit={!!editingTask}
        task={editingTask}
        onCancel={() => setModalVisible(false)}
        onOk={() => {}}
        onSuccess={handleModalSuccess}
        assignableUsers={users}
      />

      <TaskDetailModal
        visible={detailModalVisible}
        task={selectedTask}
        user={user}
        onCancel={() => setDetailModalVisible(false)}
      />

      <AssignTaskModal
        visible={assignModalVisible}
        task={selectedTask}
        assignableUsers={users}
        onCancel={() => setAssignModalVisible(false)}
        onAssignTask={handleAssignTask}
      />

      <CompleteTaskModal
        visible={completeModalVisible}
        task={selectedTask}
        onCancel={() => setCompleteModalVisible(false)}
        onSuccess={handleCompleteModalSuccess}
      />
    </div>
  );
};

export default TaskManagement; 