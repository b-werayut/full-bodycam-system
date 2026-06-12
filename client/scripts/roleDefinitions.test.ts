import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ROLE_IDS,
  canAccessUserManagement,
  canCreateOrDeleteUsers,
  canEditUserData,
  canManageUserPasswords,
  canUseActivityTools,
  canUseReportTools,
  isSuperAdmin,
} from '../src/lib/permissions.ts';
import { getUserRoleName } from '../src/lib/userDisplay.ts';

const withRole = (roleId: number | null) => ({ roleId });

describe('role definitions', () => {
  it('matches the current role table ids', () => {
    assert.deepEqual(ROLE_IDS, {
      superAdmin: 1,
      admin: 2,
      supervisor: 3,
      officer: 4,
      viewer: 5,
    });
  });

  it('maps role ids to display names', () => {
    assert.equal(getUserRoleName({ roleId: 1 }, 'en'), 'SuperAdmin');
    assert.equal(getUserRoleName({ roleId: 2 }, 'en'), 'Admin');
    assert.equal(getUserRoleName({ roleId: 3 }, 'en'), 'Supervisor');
    assert.equal(getUserRoleName({ roleId: 4 }, 'en'), 'Officer');
    assert.equal(getUserRoleName({ roleId: 5 }, 'en'), 'Viewer');
  });

  it('maps role names case-insensitively', () => {
    assert.equal(getUserRoleName({ roleName: 'superadmin' }, 'en'), 'SuperAdmin');
    assert.equal(getUserRoleName({ roleName: 'SUPERVISOR' }, 'en'), 'Supervisor');
  });

  it('keeps user management access scoped to super admin and admin', () => {
    assert.equal(canAccessUserManagement(withRole(1)), true);
    assert.equal(canAccessUserManagement(withRole(2)), true);
    assert.equal(canAccessUserManagement(withRole(3)), false);
    assert.equal(canAccessUserManagement(withRole(4)), false);
    assert.equal(canAccessUserManagement(withRole(5)), false);
  });

  it('allows super admin and admin to manage users with the same actions', () => {
    assert.equal(canEditUserData(withRole(1)), true);
    assert.equal(canManageUserPasswords(withRole(1)), true);
    assert.equal(canCreateOrDeleteUsers(withRole(1)), true);

    assert.equal(canEditUserData(withRole(2)), true);
    assert.equal(canManageUserPasswords(withRole(2)), true);
    assert.equal(canCreateOrDeleteUsers(withRole(2)), true);

    assert.equal(canEditUserData(withRole(3)), false);
    assert.equal(canManageUserPasswords(withRole(4)), false);
    assert.equal(canCreateOrDeleteUsers(withRole(5)), false);
  });

  it('allows activity and report tools for every non-viewer role', () => {
    for (const roleId of [1, 2, 3, 4]) {
      assert.equal(canUseActivityTools(withRole(roleId)), true);
      assert.equal(canUseReportTools(withRole(roleId)), true);
    }

    assert.equal(canUseActivityTools(withRole(5)), false);
    assert.equal(canUseReportTools(withRole(5)), false);
  });

  it('treats only super admin as the unrestricted role', () => {
    assert.equal(isSuperAdmin(withRole(1)), true);
    assert.equal(isSuperAdmin(withRole(2)), false);
    assert.equal(isSuperAdmin(withRole(3)), false);
    assert.equal(isSuperAdmin(withRole(4)), false);
    assert.equal(isSuperAdmin(withRole(5)), false);
    assert.equal(isSuperAdmin(null), false);
  });
});
