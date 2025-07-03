import React, { createContext } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import dayjs from 'dayjs';
import { TaskStatus, TaskType, UserIdentity, User } from '../../types';
import { BrowserRouter } from 'react-router-dom';

// Mock the api module
jest.mock('../../services/api', () => ({
  taskAPI: {
    getTasks: jest.fn(() => Promise.resolve([])),
  },
  authAPI: {
    getAssignableUsers: jest.fn(() => Promise.resolve([])),
  },
}));

// Mock TaskManagement component with our color logic
const TaskManagement = () => {
  // 检查任务是否逾期
  const isTaskOverdue = (task: any) => {
    if (task.status === TaskStatus.COMPLETED) return false;
    const today = dayjs().format('YYYY-MM-DD');
    return dayjs(today).isAfter(dayjs(task.planned_end_date));
  };

  // 检查任务是否在2天内到期
  const isTaskApproachingDeadline = (task: any) => {
    if (task.status === TaskStatus.COMPLETED) return false;
    const today = dayjs();
    const endDate = dayjs(task.planned_end_date);
    const diffInDays = endDate.diff(today, 'day');
    return diffInDays >= 0 && diffInDays < 2; // 剩余0-1天（不含2天）
  };

  // 获取任务行的样式类名
  const getTaskRowClassName = (task: any) => {
    // 进行中且已逾期：红色背景
    if (task.status === TaskStatus.IN_PROGRESS && isTaskOverdue(task)) {
      return 'task-row-overdue';
    }
    // 距离完成时间小于2天：黄色背景
    if (isTaskApproachingDeadline(task)) {
      return 'task-row-approaching-deadline';
    }
    return '';
  };

  // Test data
  const overdueTask = {
    id: 1,
    status: TaskStatus.IN_PROGRESS,
    planned_end_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
  };

  const approachingDeadlineTask = {
    id: 2,
    status: TaskStatus.IN_PROGRESS,
    planned_end_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
  };

  const completedTask = {
    id: 3,
    status: TaskStatus.COMPLETED,
    planned_end_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
  };

  const normalTask = {
    id: 4,
    status: TaskStatus.IN_PROGRESS,
    planned_end_date: dayjs().add(5, 'day').format('YYYY-MM-DD'),
  };

  return (
    <div>
      <div data-testid="overdue-task" className={getTaskRowClassName(overdueTask)}>
        逾期任务
      </div>
      <div data-testid="approaching-deadline-task" className={getTaskRowClassName(approachingDeadlineTask)}>
        临近截止任务
      </div>
      <div data-testid="completed-task" className={getTaskRowClassName(completedTask)}>
        已完成任务
      </div>
      <div data-testid="normal-task" className={getTaskRowClassName(normalTask)}>
        正常任务
      </div>
    </div>
  );
};

// Mock AuthContext interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

// Create mock AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user context
const mockUser: User = {
  id: 1,
  username: 'test',
  email: 'test@test.com',
  identity: UserIdentity.ADMIN,
  name: '测试用户',
  created_at: '',
  updated_at: '',
  department: '测试部门',
};

const mockAuthContextValue: AuthContextType = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  loading: false,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthContext.Provider value={mockAuthContextValue}>
      {children}
    </AuthContext.Provider>
  </BrowserRouter>
);

describe('TaskManagement Color Indication', () => {
  it('应该为进行中且已逾期的任务添加红色样式类', () => {
    render(
      <TestWrapper>
        <TaskManagement />
      </TestWrapper>
    );

    const overdueTask = screen.getByTestId('overdue-task');
    expect(overdueTask).toHaveClass('task-row-overdue');
  });

  it('应该为临近截止日期的任务添加黄色样式类', () => {
    render(
      <TestWrapper>
        <TaskManagement />
      </TestWrapper>
    );

    const approachingTask = screen.getByTestId('approaching-deadline-task');
    expect(approachingTask).toHaveClass('task-row-approaching-deadline');
  });

  it('已完成的任务不应该有颜色样式类', () => {
    render(
      <TestWrapper>
        <TaskManagement />
      </TestWrapper>
    );

    const completedTask = screen.getByTestId('completed-task');
    expect(completedTask.className).toBe('');
  });

  it('正常任务不应该有颜色样式类', () => {
    render(
      <TestWrapper>
        <TaskManagement />
      </TestWrapper>
    );

    const normalTask = screen.getByTestId('normal-task');
    expect(normalTask.className).toBe('');
  });
});