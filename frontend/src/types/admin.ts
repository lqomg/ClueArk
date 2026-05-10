import type { UserRole } from '@/constants/user-role';

export interface AdminUserRow {
  _id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserListResponse {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}
