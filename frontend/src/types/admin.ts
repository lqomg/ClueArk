export interface AdminUserRow {
  _id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
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
