export enum UserIdentity {
  ADMIN = 'admin',
  PRODUCTION_SCHEDULER = 'production_scheduler',
  PRODUCTION_LEADER = 'production_leader',
  STAFF = 'staff'
}

export enum TaskType {
  MEETING = 'meeting',
  PROJECT = 'project',
  MISCELLANEOUS = 'miscellaneous'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
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
  executor: number;
  forwarded_to?: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  production_leader_name?: string;
  executor_name?: string;
  forwarded_to_name?: string;
  milestones?: Milestone[];
  milestone_count?: number;
  completed_milestone_count?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  type: TaskType;
  production_leader?: number;
  executor: number;
  planned_start_date: string;
  planned_end_date: string;
  milestones?: Milestone[];
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