import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  KeyOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { User, UserIdentity } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { Text } = Typography;

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getUsers();
      setUsers(response);
    } catch (error) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getIdentityText = (identity: UserIdentity) => {
    switch (identity) {
      case UserIdentity.ADMIN: return '系统管理员';
      case UserIdentity.PRODUCTION_SCHEDULER: return '生产调度员';
      case UserIdentity.PRODUCTION_LEADER: return '生产所领导';
      case UserIdentity.STAFF: return '职员';
      default: return identity;
    }
  };

  const getIdentityColor = (identity: UserIdentity) => {
    switch (identity) {
      case UserIdentity.ADMIN: return 'red';
      case UserIdentity.PRODUCTION_SCHEDULER: return 'blue';
      case UserIdentity.PRODUCTION_LEADER: return 'green';
      case UserIdentity.STAFF: return 'orange';
      default: return 'default';
    }
  };

  const handleCreateUser = async (values: any) => {
    try {
      const response = await authAPI.createUser({
        username: values.username,
        email: values.email,
        name: values.name,
        identity: values.identity,
        department: values.department
      });
      
      message.success('用户创建成功，默认密码为：test123');
      setIsCreateModalVisible(false);
      form.resetFields();
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '用户创建失败');
    }
  };

  const handleUpdateUser = async (values: any) => {
    if (!selectedUser) return;
    
    try {
      await authAPI.updateUser(selectedUser.id, {
        username: values.username,
        email: values.email,
        name: values.name,
        identity: values.identity,
        department: values.department
      });
      
      message.success('用户更新成功');
      setIsEditModalVisible(false);
      form.resetFields();
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '用户更新失败');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await authAPI.deleteUser(userId);
      message.success('用户删除成功');
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '用户删除失败');
    }
  };

  const handleResetPassword = async (values: any) => {
    if (!selectedUser) return;
    
    try {
      await authAPI.resetUserPassword(selectedUser.id, values.newPassword);
      message.success(`用户 ${selectedUser.name} 的密码重置成功`);
      setIsResetPasswordModalVisible(false);
      resetPasswordForm.resetFields();
      setSelectedUser(null);
    } catch (error: any) {
      message.error(error.response?.data?.message || '重置密码失败');
    }
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      name: user.name,
      identity: user.identity,
      department: user.department
    });
    setIsEditModalVisible(true);
  };

  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setIsDetailModalVisible(true);
  };

  const canEditUser = (user: User) => {
    return currentUser?.identity === UserIdentity.ADMIN;
  };

  const canDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) return false; // 不能删除自己
    return currentUser?.identity === UserIdentity.ADMIN;
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '身份',
      dataIndex: 'identity',
      key: 'identity',
      width: 120,
      render: (identity: UserIdentity) => (
        <Tag color={getIdentityColor(identity)}>
          {getIdentityText(identity)}
        </Tag>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => openDetailModal(record)}
            size="small"
          >
            查看
          </Button>
          
          {canEditUser(record) && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              size="small"
            >
              编辑
            </Button>
          )}

          {canEditUser(record) && record.id !== currentUser?.id && (
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => openResetPasswordModal(record)}
              size="small"
            >
              重置密码
            </Button>
          )}
          
          {canDeleteUser(record) && (
            <Popconfirm
              title="确定删除这个用户吗？"
              onConfirm={() => handleDeleteUser(record.id)}
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
      ),
    },
  ];



  return (
    <div>
      <Card
        title="用户管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
          >
            新建用户
          </Button>
        }
      >
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
          <Text type="secondary">
            👥 用户管理：管理系统中所有用户的身份信息
          </Text>
        </div>
        
        <Table
          columns={columns}
          dataSource={users}
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
      </Card>

      {/* 新建用户Modal */}
      <Modal
        title="创建用户"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6f8fa', borderRadius: 6, border: '1px solid #d9d9d9' }}>
          <Text type="secondary">
            💡 新用户将使用默认密码：<strong>test123</strong>，用户可以登录后自行修改密码
          </Text>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="identity"
                label="身份"
                rules={[{ required: true, message: '请选择身份' }]}
              >
                <Select placeholder="请选择身份">
                  <Option value={UserIdentity.ADMIN}>系统管理员</Option>
                  <Option value={UserIdentity.PRODUCTION_SCHEDULER}>生产调度员</Option>
                  <Option value={UserIdentity.PRODUCTION_LEADER}>生产所领导</Option>
                  <Option value={UserIdentity.STAFF}>职员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="部门"
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                form.resetFields();
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

      {/* 编辑用户Modal */}
      <Modal
        title="编辑用户"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          form.resetFields();
          setSelectedUser(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="identity"
                label="身份"
                rules={[{ required: true, message: '请选择身份' }]}
              >
                <Select placeholder="请选择身份">
                  <Option value={UserIdentity.ADMIN}>系统管理员</Option>
                  <Option value={UserIdentity.PRODUCTION_SCHEDULER}>生产调度员</Option>
                  <Option value={UserIdentity.PRODUCTION_LEADER}>生产所领导</Option>
                  <Option value={UserIdentity.STAFF}>职员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="部门"
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setIsEditModalVisible(false);
                form.resetFields();
                setSelectedUser(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码Modal */}
      <Modal
        title={`重置用户密码 - ${selectedUser?.name}`}
        open={isResetPasswordModalVisible}
        onCancel={() => {
          setIsResetPasswordModalVisible(false);
          resetPasswordForm.resetFields();
          setSelectedUser(null);
        }}
        footer={null}
        width={400}
      >
        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
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
            label="确认密码"
            rules={[
              { required: true, message: '请再次输入新密码' },
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
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setIsResetPasswordModalVisible(false);
                resetPasswordForm.resetFields();
                setSelectedUser(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                重置密码
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户详情Modal */}
      <Modal
        title="用户详情"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedUser(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsDetailModalVisible(false);
            setSelectedUser(null);
          }}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedUser && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>用户名：</strong>{selectedUser.username}
              </Col>
              <Col span={12}>
                <strong>姓名：</strong>{selectedUser.name}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>身份：</strong>
                <Tag color={getIdentityColor(selectedUser.identity)} style={{ marginLeft: 8 }}>
                  {getIdentityText(selectedUser.identity)}
                </Tag>
              </Col>
              <Col span={12}>
                <strong>部门：</strong>{selectedUser.department || '未设置'}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <strong>邮箱：</strong>{selectedUser.email || '未设置'}
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <strong>创建时间：</strong>{dayjs(selectedUser.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
              <Col span={12}>
                <strong>更新时间：</strong>{dayjs(selectedUser.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement; 