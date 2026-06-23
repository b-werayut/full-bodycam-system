export interface UserSqlData {
  userId: number;
  username: string;
  roleId?: number | null;
  roleName: string;
  locationCode?: string | null;
  status: 'active' | 'inactive';
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}
