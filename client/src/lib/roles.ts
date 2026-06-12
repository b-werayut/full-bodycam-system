export const ROLE_IDS = {
  superAdmin: 1,
  admin: 2,
  supervisor: 3,
  officer: 4,
  viewer: 5,
} as const;

export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];

export type RoleTranslationKey =
  | 'roleSuperAdmin'
  | 'roleAdmin'
  | 'roleSupervisor'
  | 'roleOfficer'
  | 'roleViewer';

export interface RoleDefinition {
  id: RoleId;
  name: 'SuperAdmin' | 'Admin' | 'Supervisor' | 'Officer' | 'Viewer';
  level: 1 | 3 | 4;
  labelKey: RoleTranslationKey;
  labels: Record<'th' | 'en', string>;
  badgeClass: string;
}

export const ROLE_DEFINITIONS = [
  {
    id: ROLE_IDS.superAdmin,
    name: 'SuperAdmin',
    level: 4,
    labelKey: 'roleSuperAdmin',
    labels: { th: 'ผู้ดูแลระบบสูงสุด', en: 'SuperAdmin' },
    badgeClass: 'bg-red-500',
  },
  {
    id: ROLE_IDS.admin,
    name: 'Admin',
    level: 3,
    labelKey: 'roleAdmin',
    labels: { th: 'ผู้ดูแลระบบ', en: 'Admin' },
    badgeClass: 'bg-amber-500',
  },
  {
    id: ROLE_IDS.supervisor,
    name: 'Supervisor',
    level: 3,
    labelKey: 'roleSupervisor',
    labels: { th: 'หัวหน้างาน', en: 'Supervisor' },
    badgeClass: 'bg-sky-500',
  },
  {
    id: ROLE_IDS.officer,
    name: 'Officer',
    level: 3,
    labelKey: 'roleOfficer',
    labels: { th: 'เจ้าหน้าที่', en: 'Officer' },
    badgeClass: 'bg-emerald-500',
  },
  {
    id: ROLE_IDS.viewer,
    name: 'Viewer',
    level: 1,
    labelKey: 'roleViewer',
    labels: { th: 'ผู้ชม', en: 'Viewer' },
    badgeClass: 'bg-slate-500',
  },
] as const satisfies readonly RoleDefinition[];

export const MANAGEABLE_ROLE_DEFINITIONS = ROLE_DEFINITIONS.filter(
  (role) => role.id !== ROLE_IDS.superAdmin
);

const ROLE_NAME_ALIASES: Record<string, RoleId> = {
  superadmin: ROLE_IDS.superAdmin,
  'super admin': ROLE_IDS.superAdmin,
  admin: ROLE_IDS.admin,
  administrator: ROLE_IDS.admin,
  supervisor: ROLE_IDS.supervisor,
  officer: ROLE_IDS.officer,
  viewer: ROLE_IDS.viewer,
};

export function getRoleDefinition(roleId: number | null | undefined) {
  return ROLE_DEFINITIONS.find((role) => role.id === roleId);
}

export function getRoleIdFromName(roleName: string | null | undefined) {
  const normalizedRoleName = roleName?.trim().toLowerCase();
  return normalizedRoleName ? ROLE_NAME_ALIASES[normalizedRoleName] ?? null : null;
}

export function getRoleBadgeClass(roleId: number | null | undefined) {
  return getRoleDefinition(roleId)?.badgeClass ?? 'bg-slate-500';
}

export function getRoleDisplayName(
  roleId: number | null | undefined,
  translations?: Partial<Record<RoleTranslationKey, string>>,
  language: 'th' | 'en' = 'th'
) {
  const role = getRoleDefinition(roleId);
  if (!role) {
    return language === 'th' ? 'บทบาท' : 'Role';
  }

  return translations?.[role.labelKey] || role.labels[language];
}

export function getRoleLevel(roleId: number | null | undefined) {
  return getRoleDefinition(roleId)?.level ?? null;
}
