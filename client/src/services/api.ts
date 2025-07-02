import axios from 'axios';
import { 
  LoginRequest, 
  User, 
  Task, 
  Project,
  CreateTaskRequest, 
  CreateProjectRequest,
  CreateMilestoneRequest, 
  UpdateMilestoneRequest,
  ApiResponse 
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

  createUser: async (userData: Partial<User> & { password: string }): Promise<ApiResponse> => {
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

  createTestAccounts: async (): Promise<ApiResponse> => {
    const response = await api.post('/users/create-test-accounts');
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

  updateMilestone: async (taskId: number, milestoneId: number, milestoneData: UpdateMilestoneRequest): Promise<ApiResponse> => {
    const response = await api.put(`/tasks/${taskId}/milestones/${milestoneId}`, milestoneData);
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

  updateTaskStatus: async (id: number, status: string): Promise<ApiResponse> => {
    const response = await api.put(`/tasks/${id}/status`, { status });
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