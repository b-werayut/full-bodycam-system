export interface UserSqlData {
  userId: number;
  username: string;
  roleId?: number | null;
  roleName: string;
  status: 'active' | 'inactive';
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}
