import axios from 'axios';
import { 
  LoginRequest, 
  User, 
  Task, 
  Project,
  Milestone, // Added Milestone import
  CreateTaskRequest, 
  CreateProjectRequest,
  CreateMilestoneRequest, 
  UpdateMilestoneRequest,
  ApiResponse,
  CreateSubtaskRequest,
  AssignTaskRequest, 
  SubmitReceiptRequest,
  CopyTaskRequest,
  TaskReceipt
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: async (data: LoginRequest): Promise<{ message: string; token: string; user: User }> => {
    const response = await api.post('/login', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/user');
    return response.data;
  },

  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  getAssignableUsers: async (): Promise<User[]> => {
    const response = await api.get('/users/assignable');
    return response.data;
  },

  getUsersByIdentity: async (identity: string): Promise<User[]> => {
    const response = await api.get(`/users/identity/${identity}`);
    return response.data;
  },

  createUser: async (userData: Partial<User> & { password?: string }): Promise<ApiResponse> => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id: number, userData: Partial<User>): Promise<ApiResponse> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  resetUserPassword: async (id: number, newPassword: string): Promise<ApiResponse> => {
    const response = await api.put(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  },
};

// 任务相关API
export const taskAPI = {
  getTasks: async (): Promise<Task[]> => {
    const response = await api.get('/tasks');
    return response.data;
  },

  getTask: async (id: number): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (taskData: CreateTaskRequest): Promise<ApiResponse> => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  forwardTask: async (id: number, forwardedTo: number): Promise<ApiResponse> => {
    const response = await api.post(`/tasks/${id}/forward`, { forwarded_to: forwardedTo });
    return response.data;
  },

  createMilestone: async (taskId: number, milestoneData: CreateMilestoneRequest): Promise<ApiResponse> => {
    const response = await api.post(`/tasks/${taskId}/milestones`, milestoneData);
    return response.data;
  },

  // Changed to update only status and actual_completion_date, and to call the correct backend endpoint
  updateMilestoneStatus: async (milestoneId: number, data: UpdateMilestoneRequest): Promise<{ message: string; milestone: Milestone }> => {
    const response = await api.put(`/milestones/${milestoneId}/status`, data);
    return response.data; // Backend now returns { message: string, milestone: Milestone }
  },

  updateMilestone: async (milestoneId: number, milestoneData: { name: string; description?: string; planned_date: string }): Promise<ApiResponse> => {
    const response = await api.put(`/milestones/${milestoneId}`, milestoneData);
    return response.data;
  },

  deleteMilestone: async (milestoneId: number): Promise<ApiResponse> => {
    const response = await api.delete(`/milestones/${milestoneId}`);
    return response.data;
  },

  updateTask: async (id: number, taskData: Partial<CreateTaskRequest>): Promise<ApiResponse> => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  deleteTask: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  updateTaskStatus: async (
    id: number,
    status: string,
    actual_start_date?: string,
    actual_end_date?: string
  ): Promise<{ message: string; task: Task }> => {
    const payload: { status: string; actual_start_date?: string; actual_end_date?: string } = { status };
    if (actual_start_date) {
      payload.actual_start_date = actual_start_date;
    }
    if (actual_end_date) {
      payload.actual_end_date = actual_end_date;
    }
    const response = await api.put(`/tasks/${id}/status`, payload);
    return response.data; // Backend now returns { message: string, task: Task }
  },

  // 新增：创建子任务
  createSubtasks: async (taskId: number, subtasks: CreateSubtaskRequest[]): Promise<ApiResponse> => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, { subtasks });
    return response.data;
  },

  // 新增：分配任务执行人
  assignTask: async (taskId: number, executorId: number): Promise<{ message: string; task: Task }> => {
    const response = await api.put(`/tasks/${taskId}/assign`, { executor_id: executorId });
    return response.data;
  },

  // 新增：提交任务回执
  submitReceipt: async (taskId: number, receiptData: SubmitReceiptRequest): Promise<{ message: string; receiptId: number }> => {
    const response = await api.post(`/tasks/${taskId}/receipt`, receiptData);
    return response.data;
  },

  // 新增：获取任务回执
  getTaskReceipts: async (taskId: number): Promise<TaskReceipt[]> => {
    const response = await api.get(`/tasks/${taskId}/receipts`);
    return response.data;
  },

  // 新增：复制任务
  copyTask: async (taskId: number, copyData: CopyTaskRequest): Promise<{ message: string; taskId: number; copiedMilestones: number }> => {
    const response = await api.post(`/tasks/${taskId}/copy`, copyData);
    return response.data;
  },

  // 新增：生产所领导确认任务完成
  completeByLeader: async (taskId: number): Promise<{ message: string; task: Task }> => {
    const response = await api.put(`/tasks/${taskId}/complete-by-leader`);
    return response.data;
  },

  // 新增：获取子任务列表
  getSubtasks: async (taskId: number): Promise<Task[]> => {
    const response = await api.get(`/tasks/${taskId}/subtasks`);
    return response.data;
  },

  // 新增：获取生产所领导列表
  getProductionLeaders: async (): Promise<User[]> => {
    const response = await api.get('/users/production-leaders');
    return response.data;
  },

  completeTask: async (taskId: number, receiptContent: string): Promise<{ message: string; task: Task }> => {
    const response = await api.post(`/tasks/${taskId}/complete`, { receipt_content: receiptContent });
    return response.data;
  },
};

// 项目相关API
export const projectAPI = {
  getProjects: async (): Promise<Project[]> => {
    const response = await api.get('/projects');
    return response.data;
  },

  getProject: async (id: number): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  createProject: async (projectData: CreateProjectRequest): Promise<ApiResponse> => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  updateProject: async (id: number, projectData: Partial<CreateProjectRequest>): Promise<ApiResponse> => {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  deleteProject: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

export default api; 