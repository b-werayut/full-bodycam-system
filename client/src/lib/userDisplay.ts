import { getRoleDisplayName, getRoleIdFromName } from './roles.ts';

interface DisplayUser {
  username?: string | null;
  roleId?: number | null;
  roleName?: string | null;
}

export function getUserDisplayName(user: DisplayUser | null | undefined) {
  return user?.username?.trim() || 'User';
}

export function getUserRoleName(user: DisplayUser | null | undefined, language: 'th' | 'en' = 'th') {
  const roleName = user?.roleName?.trim()?.toLowerCase();
  const roleIdFromName = getRoleIdFromName(roleName);
  
  if (roleIdFromName) {
    return getRoleDisplayName(roleIdFromName, undefined, language);
  }

  if (typeof user?.roleId === 'number') {
    return getRoleDisplayName(user.roleId, undefined, language);
  }

  if (roleName) {
    return user?.roleName?.trim() || (language === 'th' ? 'บทบาท' : 'Role');
  }

  return language === 'th' ? 'บทบาท' : 'Role';
}
