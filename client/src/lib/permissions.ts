import { ROLE_IDS } from './roles.ts';

export { ROLE_IDS };

export interface PermissionUser {
  roleId: number | null;
}

export function getRoleId(user: PermissionUser | null | undefined) {
  return Number(user?.roleId ?? Number.POSITIVE_INFINITY);
}

export function canAccessUserManagement(user: PermissionUser | null | undefined) {
  return getRoleId(user) <= ROLE_IDS.admin;
}

function canFullyManageUsers(user: PermissionUser | null | undefined) {
  return canAccessUserManagement(user);
}

export function canEditUserData(user: PermissionUser | null | undefined) {
  return canFullyManageUsers(user);
}

export function canManageUserPasswords(user: PermissionUser | null | undefined) {
  return canFullyManageUsers(user);
}

export function canCreateOrDeleteUsers(user: PermissionUser | null | undefined) {
  return canFullyManageUsers(user);
}

export function canUseActivityTools(user: PermissionUser | null | undefined) {
  const roleId = getRoleId(user);
  return roleId >= ROLE_IDS.superAdmin && roleId < ROLE_IDS.viewer;
}

export function canUseReportTools(user: PermissionUser | null | undefined) {
  const roleId = getRoleId(user);
  return roleId >= ROLE_IDS.superAdmin && roleId < ROLE_IDS.viewer;
}

// SuperAdmin is the unrestricted role: it can do everything the other roles can,
// plus bypass the status-based limits (e.g. deleting a mission/report in any
// status, not only cancelled ones).
export function isSuperAdmin(user: PermissionUser | null | undefined) {
  return getRoleId(user) === ROLE_IDS.superAdmin;
}
