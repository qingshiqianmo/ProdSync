export enum UserIdentity {
  ADMIN = 'admin',
  PRODUCTION_SCHEDULER = 'production_scheduler',
  PRODUCTION_LEADER = 'production_leader',
  STAFF = 'staff',
  DIRECTOR = 'director',
  DEPUTY_CHIEF_ENGINEER = 'deputy_chief_engineer'
}

export enum TaskType {
  MEETING = 'meeting',
  PROJECT = 'project',
  MISCELLANEOUS = 'miscellaneous'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed'
}

export interface User {
  id: number;
  username: string;
  email: string;
  identity: UserIdentity;
  name: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'suspended';
  created_by: number;
  project_manager?: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  project_manager_name?: string;
  task_count?: number;
  designers?: string;
}

export interface Milestone {
  id?: number;
  task_id?: number;
  name: string;
  description: string;
  planned_date: string;
  actual_completion_date?: string; // Renamed from actual_date
  status: MilestoneStatus; // Changed to use MilestoneStatus enum
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  created_by: number;
  production_leader?: number;
  executor?: number; // 改为可选，生产调度创建时可能不指定
  parent_task_id?: number; // 新增：父任务ID
  forwarded_to?: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  completed_overdue?: boolean; // 记录是否逾期完成
  acknowledged_by_leader_at?: string;
  completed_by_leader_at?: string; // 新增：生产所领导确认完成时间
  is_copied_from?: number; // 新增：复制来源任务ID
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  production_leader_name?: string;
  executor_name?: string;
  forwarded_to_name?: string;
  milestones?: Milestone[];
  milestone_count?: number;
  completed_milestone_count?: number;
  receipts?: TaskReceipt[];
}

// 新增：任务回执接口
export interface TaskReceipt {
  id: number;
  task_id: number;
  executor_id: number;
  receipt_content: string;
  completion_notes?: string;
  submitted_at: string;
  executor_name?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  type: TaskType;
  production_leader: number; // 生产调度创建任务时必须指定生产所领导
  executor?: number; // 改为可选，生产调度创建时不指定执行人
  planned_start_date: string;
  planned_end_date: string;
  milestones?: Milestone[];
}

// 新增：创建子任务请求
export interface CreateSubtaskRequest {
  name: string;
  description?: string;
  executor: number;
  planned_end_date?: string;
}

// 新增：分配任务执行人请求
export interface AssignTaskRequest {
  executor: number;
}

// 新增：提交任务回执请求
export interface SubmitReceiptRequest {
  receipt_content: string;
  completion_notes?: string;
}

// 新增：复制任务请求
export interface CopyTaskRequest {
  name: string;
  planned_start_date: string;
  planned_end_date: string;
  production_leader?: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  project_manager: number;
  designers?: number[];
}

export interface CreateMilestoneRequest {
  name: string;
  description?: string;
  planned_date: string;
}

export interface UpdateMilestoneRequest {
  status?: string;
  actual_completion_date?: string; // Renamed from actual_date
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  errors?: any[];
} 