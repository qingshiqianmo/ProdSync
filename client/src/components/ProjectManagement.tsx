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
  message,
  Row,
  Col,
  Typography,
  Descriptions,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { Project, User, UserIdentity, CreateProjectRequest } from '../types';
import { projectAPI, authAPI } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const ProjectManagement: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, usersData] = await Promise.all([
        projectAPI.getProjects(),
        authAPI.getUsers()
      ]);
      setProjects(projectsData);
      setUsers(usersData);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getProjectScopeDescription = () => {
    if (user?.identity === UserIdentity.ADMIN || user?.identity === UserIdentity.PRODUCTION_SCHEDULER) {
      return "显示所有项目";
    } else {
      return "显示您参与的项目（负责的或设计的）";
    }
  };

  const canCreateProject = () => {
    return user?.identity === UserIdentity.ADMIN || user?.identity === UserIdentity.PRODUCTION_SCHEDULER;
  };

  const handleCreateProject = async (values: CreateProjectRequest) => {
    try {
      await projectAPI.createProject(values);
      message.success('项目创建成功');
      setIsCreateModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('项目创建失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'default';
      case 'suspended': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'suspended': return '暂停';
      default: return status;
    }
  };

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <a onClick={() => {
          setSelectedProject(record);
          setIsDetailModalVisible(true);
        }}>
          {text}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '项目负责人',
      dataIndex: 'project_manager_name',
      key: 'project_manager_name',
      render: (name: string) => name || '未指定',
    },
    {
      title: '设计者',
      dataIndex: 'designers',
      key: 'designers',
      render: (designers: string) => designers || '未指定',
    },
    {
      title: '任务数量',
      dataIndex: 'task_count',
      key: 'task_count',
      render: (count: number) => count || 0,
    },
    {
      title: '创建者',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: Project) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedProject(record);
              setIsDetailModalVisible(true);
            }}
          >
            查看
          </Button>
          {canCreateProject() && (
            <>
              <Button 
                type="link" 
                icon={<EditOutlined />}
                onClick={() => {
                  // TODO: 实现编辑功能
                  message.info('编辑功能开发中');
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个项目吗？"
                onConfirm={() => {
                  // TODO: 实现删除功能
                  message.info('删除功能开发中');
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="项目管理"
        extra={
          canCreateProject() && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              新建项目
            </Button>
          )
        }
      >
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
          <Text type="secondary">
            📋 当前视图：{getProjectScopeDescription()}
          </Text>
        </div>

        <Table<Project>
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建项目Modal */}
      <Modal
        title="新建项目"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="项目描述"
          >
            <TextArea rows={4} placeholder="请输入项目描述（可选）" />
          </Form.Item>

          <Form.Item
            name="project_manager"
            label="项目负责人"
            rules={[{ required: true, message: '请选择项目负责人' }]}
          >
            <Select placeholder="请选择项目负责人">
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.name} ({user.department || '未知部门'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="designers"
            label="设计者"
          >
            <Select 
              mode="multiple" 
              placeholder="请选择设计者（可选，可多选）"
              allowClear
            >
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.name} ({user.department || '未知部门'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row justify="end" gutter={8}>
            <Col>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 项目详情Modal */}
      <Modal
        title="项目详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedProject && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="项目名称" span={2}>
              {selectedProject.name}
            </Descriptions.Item>
            <Descriptions.Item label="项目状态">
              <Tag color={getStatusColor(selectedProject.status)}>
                {getStatusText(selectedProject.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="任务数量">
              {selectedProject.task_count || 0}
            </Descriptions.Item>
            <Descriptions.Item label="项目负责人">
              {selectedProject.project_manager_name || '未指定'}
            </Descriptions.Item>
            <Descriptions.Item label="设计者">
              {selectedProject.designers || '未指定'}
            </Descriptions.Item>
            <Descriptions.Item label="创建者">
              {selectedProject.created_by_name}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedProject.created_at).toLocaleString()}
            </Descriptions.Item>
            {selectedProject.description && (
              <Descriptions.Item label="项目描述" span={2}>
                {selectedProject.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ProjectManagement; 