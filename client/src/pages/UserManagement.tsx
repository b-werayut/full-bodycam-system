import { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, Edit2, ChevronLeft, ChevronRight, Eye, KeyRound, Trash2, UserCheck, UserX, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { type UserSqlData } from '../features/users/types';
import { UserManagementFilters } from '../components/ui/UserManagementFilters';
import { UserModal } from '../components/modals/UserModal'; 
import { ResetPasswordModal } from '../components/modals/PasswordModals';
import { userTranslations, type UserLanguage } from '../locales/userTranslations';
import { useAuth } from '../contexts/useAuth';
import { canCreateOrDeleteUsers, canEditUserData, canManageUserPasswords } from '../lib/permissions';
import { ROLE_IDS, getRoleBadgeClass, getRoleDisplayName } from '../lib/roles';
import {
  createUser,
  deleteUser,
  getUserDetails,
  listUsers,
  resetUserPassword,
  updateUser,
} from '../services/userService';
import { getLocations } from '../services/missionService';

interface UserManagementProps {
  darkMode: boolean;
  language: UserLanguage;
}

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: {
      message?: unknown;
    };
  };
  message?: unknown;
}

interface UserRow extends UserSqlData {
  roleId?: number | null;
  Active?: boolean;
}

interface LocationOption {
  locationCode: string;
  locationName?: string | null;
}

interface UserDetailData extends UserSqlData {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  lastLoginAt?: string | Date | null;
  lastLoginPlatform?: string | null;
  Active?: boolean;
}

interface UserDetailModalProps {
  user: UserDetailData;
  darkMode: boolean;
  language: UserLanguage;
  translations: typeof userTranslations[UserLanguage];
  onClose: () => void;
}

function formatDateTime(value: string | Date | null | undefined, language: UserLanguage) {
  if (!value) {
    return language === 'th' ? 'ไม่พบข้อมูล' : 'No data';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return language === 'th' ? 'ไม่พบข้อมูล' : 'No data';
  }

  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function UserDetailModal({ user, darkMode, language, translations, onClose }: UserDetailModalProps) {
  const labels = {
    title: language === 'th' ? 'ข้อมูลผู้ใช้งาน' : 'User Details',
    createdAt: language === 'th' ? 'สร้างเมื่อ' : 'Created At',
    updatedAt: language === 'th' ? 'แก้ไขล่าสุด' : 'Last Updated',
    lastLoginAt: language === 'th' ? 'ล็อกอินล่าสุด' : 'Last Login',
    platform: language === 'th' ? 'Platform' : 'Platform',
  };

  const detailRows = [
    { label: translations.username, value: user.username },
    { label: translations.role, value: user.roleName || '-' },
    { label: translations.tableStatus, value: user.status === 'active' || user.Active === true ? translations.active : translations.inactive },
    { label: labels.createdAt, value: formatDateTime(user.createdAt, language) },
    { label: labels.updatedAt, value: formatDateTime(user.updatedAt, language) },
    { label: labels.lastLoginAt, value: formatDateTime(user.lastLoginAt, language) },
    { label: labels.platform, value: user.lastLoginPlatform || '-' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`w-full max-w-xl overflow-hidden rounded-lg border shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className={`relative border-b px-6 py-5 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-md p-3 ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{labels.title}</h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
              aria-label={translations.cancel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`p-6 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className={`rounded-md border px-4 py-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}
              >
                <dt className={`text-xs font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{row.label}</dt>
                <dd className={`text-sm font-semibold break-words ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={`border-t px-6 py-4 flex justify-end ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <button
            onClick={onClose}
            className={`cursor-pointer rounded-md border px-6 py-2.5 font-bold transition-colors ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {translations.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserManagement({ darkMode, language = 'th' }: UserManagementProps) {
  const translations = userTranslations[language];
  const { user: currentUser } = useAuth();
  const canEditUsers = canEditUserData(currentUser);
  const canManagePasswords = canManageUserPasswords(currentUser);
  const canCreateDeleteUsers = canCreateOrDeleteUsers(currentUser);

  const getRequestErrorMessage = (err: unknown) => {
    const apiError = err as ApiErrorLike;
    const message = String(apiError.response?.data?.message || apiError.message || 'Request failed');
    if (apiError.response?.status === 409 && String(message).toLowerCase().includes('username')) {
      return translations.usernameExists;
    }
    return message || 'Request failed';
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSqlData | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserSqlData | null>(null);
  const [viewingUser, setViewingUser] = useState<UserDetailData | null>(null);
  const [loadingDetailUserId, setLoadingDetailUserId] = useState<number | null>(null);

  const [rawUsers, setRawUsers] = useState<UserRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRawUsers(await listUsers<UserRow>());
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let active = true;
    getLocations<LocationOption>()
      .then((data) => {
        if (active) setLocations(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to fetch locations:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const users = useMemo(() => {
    return rawUsers.map(u => {
      const roleId = u.roleId;

      return {
        ...u,
        roleId,
        roleName: getRoleDisplayName(roleId, translations, language),
        status: (u.Active === true ? 'active' : 'inactive') as 'active' | 'inactive'
      };
    });
  }, [language, rawUsers, translations]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleReset = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const handleViewUser = async (user: UserSqlData) => {
    setError(null);
    setLoadingDetailUserId(user.userId);

    try {
      setViewingUser(await getUserDetails<UserDetailData>(user.userId));
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      setError(getRequestErrorMessage(err));
    } finally {
      setLoadingDetailUserId(null);
    }
  };

  const handleSaveUser = async (user: UserSqlData, password?: string) => {
    if (!canEditUsers) {
      return;
    }

    setError(null);
    try {
      if (editingUser) {
        const result = await updateUser<UserSqlData>(editingUser.userId, {
          username: user.username,
          roleId: user.roleId ?? null,
          locationCode: user.locationCode || null,
          Active: user.status === 'active',
          ...(canManagePasswords && password ? { password } : {}),
        });

        const updatedUser = (result?.data ?? user) as UserSqlData;
        setRawUsers((prev) => prev.map((u) => (u.userId === updatedUser.userId ? updatedUser : u)));
        await fetchUsers();
        
        Swal.fire({
          icon: 'success',
          title: `<span style="color: #0c274b;">${translations.alertUpdateSuccess}</span>`,
          html: `
            <div style="text-align: center; padding: 10px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">
                <strong>${translations.username}:</strong> ${updatedUser.username}
              </p>
              <p style="font-size: 14px; color: #6b7280;">
                ${translations.alertUpdateSuccessDesc}
              </p>
            </div>
          `,
          confirmButtonText: translations.alertConfirm,
          confirmButtonColor: '#22c55e',
          background: '#ffffff',
          showClass: { popup: 'animate__animated animate__fadeInDown' },
          hideClass: { popup: 'animate__animated animate__fadeOutUp' }
        });
      } else {
        const result = await createUser<UserSqlData>({
          username: user.username,
          password,
          roleId: user.roleId ?? null,
          locationCode: user.locationCode || null,
          Active: user.status === 'active',
        });

        const createdUser = result?.data as UserSqlData;
        setRawUsers((prev) => [...prev, createdUser]);
        await fetchUsers();
        
        Swal.fire({
          icon: 'success',
          title: `<span style="color: #0c274b;">${translations.alertCreateSuccess}</span>`,
          html: `
            <div style="text-align: center; padding: 10px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">
                <strong>${translations.username}:</strong> ${createdUser.username}
              </p>
              <p style="font-size: 14px; color: #6b7280;">
                ${translations.alertCreateSuccessDesc}
              </p>
            </div>
          `,
          confirmButtonText: translations.alertConfirm,
          confirmButtonColor: '#22c55e',
          background: '#ffffff',
          showClass: { popup: 'animate__animated animate__fadeInDown' },
          hideClass: { popup: 'animate__animated animate__fadeOutUp' }
        });
      }

      setShowAddUserModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to save user:', err);
      const errorMessage = getRequestErrorMessage(err);
      setError(errorMessage);
      
      Swal.fire({
        icon: 'error',
        title: `<span style="color: #dc2626;">${translations.alertError}</span>`,
        html: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 14px; color: #6b7280;">
              ${errorMessage}
            </p>
          </div>
        `,
        confirmButtonText: translations.alertConfirm,
        confirmButtonColor: '#ef4444',
        background: '#ffffff'
      });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!canCreateDeleteUsers) {
      return;
    }

    const userToDelete = rawUsers.find(u => u.userId === userId);
    
    const confirmResult = await Swal.fire({
      icon: 'warning',
      title: `<span style="color: #dc2626;">${translations.deleteConfirmTitle}</span>`,
      html: `
        <div style="text-align: center; padding: 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 12px;">
            <strong>${userToDelete?.username || 'User'}</strong>
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            ${translations.deleteConfirmMessage}
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: translations.confirmDelete,
      cancelButtonText: translations.cancel,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      background: '#ffffff',
      reverseButtons: true,
      focusCancel: true
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setError(null);
    try {
      await deleteUser(userId);

      setRawUsers((prev) => prev.filter((u) => u.userId !== userId));
      await fetchUsers();
      setEditingUser(null);
      
      Swal.fire({
        icon: 'success',
        title: `<span style="color: #0c274b;">${translations.alertDeleteSuccess}</span>`,
        html: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">
              <strong>${userToDelete?.username || 'User'}</strong>
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              ${translations.alertDeleteSuccessDesc}
            </p>
          </div>
        `,
        confirmButtonText: translations.alertConfirm,
        confirmButtonColor: '#22c55e',
        background: '#ffffff',
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' }
      });
    } catch (err) {
      console.error('Failed to delete user:', err);
      const errorMessage = getRequestErrorMessage(err);
      setError(errorMessage);
      
      Swal.fire({
        icon: 'error',
        title: `<span style="color: #dc2626;">${translations.alertError}</span>`,
        html: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 14px; color: #6b7280;">
              ${errorMessage}
            </p>
          </div>
        `,
        confirmButtonText: translations.alertConfirm,
        confirmButtonColor: '#ef4444',
        background: '#ffffff'
      });
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!resetPasswordUser) return;
    if (!canManagePasswords) {
      setResetPasswordUser(null);
      return;
    }

    setError(null);
    try {
      await resetUserPassword(resetPasswordUser.userId, password);
      setResetPasswordUser(null);

      Swal.fire({
        icon: 'success',
        title: `<span style="color: #0c274b;">${translations.alertResetPasswordSuccess}</span>`,
        html: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">
              <strong>${translations.username}:</strong> ${resetPasswordUser.username}
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              ${translations.alertResetPasswordSuccessDesc}
            </p>
          </div>
        `,
        confirmButtonText: translations.alertConfirm,
        confirmButtonColor: '#22c55e',
        background: '#ffffff',
      });
    } catch (err: unknown) {
      console.error('Failed to reset password:', err);
      const apiError = err as ApiErrorLike;
      const errorMessage = String(apiError.response?.data?.message || apiError.message || translations.alertResetPasswordError);
      setError(errorMessage);

      Swal.fire({
        icon: 'error',
        title: `<span style="color: #dc2626;">${translations.alertError}</span>`,
        html: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 14px; color: #6b7280;">
              ${errorMessage}
            </p>
          </div>
        `,
        confirmButtonText: translations.alertConfirm,
        confirmButtonColor: '#ef4444',
        background: '#ffffff'
      });
    }
  };

  // Filter logic
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      // ไม่แสดง SuperAdmin ในตารางจัดการผู้ใช้งาน
      if (user.roleId === ROLE_IDS.superAdmin) return false;
      
      const matchesSearch = !normalizedSearch || user.username.toLowerCase().includes(normalizedSearch);
      const matchesRole = filterRole === 'all' || String(user.roleId) === filterRole;
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [filterRole, filterStatus, searchTerm, users]);

  // SuperAdmin ไม่แสดงในตาราง จึงไม่นับรวมในสถิติด้วย เพื่อให้ตัวเลขตรงกับตาราง
  const manageableUsers = useMemo(() => users.filter((user) => user.roleId !== ROLE_IDS.superAdmin), [users]);
  const activeUsers = useMemo(() => manageableUsers.filter((user) => user.status === 'active').length, [manageableUsers]);
  const inactiveUsers = manageableUsers.length - activeUsers;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = useMemo(
    () => filteredUsers.slice(indexOfFirstItem, indexOfLastItem),
    [filteredUsers, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      if (startPage > 2) pages.push('...');
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < totalPages - 1) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: translations.totalUsers, value: manageableUsers.length, icon: Users, iconBg: 'bg-sky-600' },
          { label: translations.activeUsers, value: activeUsers, icon: UserCheck, iconBg: 'bg-emerald-600' },
          { label: translations.inactiveUsers, value: inactiveUsers, icon: UserX, iconBg: 'bg-rose-600', isAlert: inactiveUsers > 0 },
          { label: translations.filteredUsers, value: filteredUsers.length, icon: Users, iconBg: 'bg-indigo-600' },
        ].map(({ label, value, icon: Icon, iconBg, isAlert }) => (
          <div
            key={label}
            className={`rounded-lg px-4 py-3 border transition-shadow hover:shadow-sm flex items-center gap-3 ${
              isAlert && value > 0
                ? darkMode ? 'bg-rose-950/30 border-rose-800/50' : 'bg-rose-50 border-rose-200 shadow-sm'
                : darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/80 shadow-sm'
            }`}
          >
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className={`truncate text-[11px] font-semibold uppercase ${isAlert && value > 0 ? darkMode ? 'text-rose-300' : 'text-rose-600' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
              <p className={`text-2xl font-bold leading-tight ${isAlert && value > 0 ? darkMode ? 'text-rose-300' : 'text-rose-600' : darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <UserManagementFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onReset={handleReset}
        translations={translations}
        darkMode={darkMode}
        onAddUser={() => setShowAddUserModal(true)}
        canCreateDeleteUsers={canCreateDeleteUsers}
      />

      {error && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm ${darkMode ? 'border-rose-800/60 bg-rose-950/30 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {error}
        </div>
      )}

      {/* User Table */}
      <div className={`overflow-hidden rounded-lg border shadow-sm ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed">
            <thead>
              <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                <th className={`w-[72px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableNo}</th>
                <th className={`w-[260px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableUsername}</th>
                <th className={`w-[230px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableRole}</th>
                <th className={`w-[170px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableStatus}</th>
                <th className={`w-[210px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableActions}</th>
              </tr>
            </thead>
            <tbody className={darkMode ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`loading-${index}`}>
                    <td className="px-4 py-4"><div className={`mx-auto h-4 w-6 rounded animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} /></td>
                    <td className="px-4 py-4"><div className={`h-4 w-36 rounded animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} /></td>
                    <td className="px-4 py-4"><div className={`h-4 w-28 rounded animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} /></td>
                    <td className="px-4 py-4"><div className={`mx-auto h-7 w-20 rounded-lg animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} /></td>
                    <td className="px-4 py-4"><div className={`mx-auto h-9 w-24 rounded-lg animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-6 py-12 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`mx-auto mb-4 h-14 w-14 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                      <Users className="w-7 h-7 opacity-50" />
                    </div>
                    <p className={`text-lg font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{translations.noData}</p>
                    <p className="text-sm mt-1">{translations.searchPlaceholder}</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((user, index) => (
                  <tr
                    key={user.userId}
                    className={`transition-colors ${darkMode ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="px-5 py-4 text-center text-slate-500">
                      <span className="text-sm font-medium">{indexOfFirstItem + index + 1}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-semibold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{user.username}</span>
                    </td>
                    <td className={`px-5 py-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getRoleBadgeClass(user.roleId)}`}></span>
                        {user.roleName}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex min-w-[118px] items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-bold ${
                        user.status === 'active'
                          ? darkMode ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : darkMode ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      }`}>
                        {user.status === 'active' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        <span>{user.status === 'active' ? translations.active : translations.inactive}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          disabled={loadingDetailUserId === user.userId}
                          title={language === 'th' ? 'ดูข้อมูล' : 'View Details'}
                          aria-label={`${language === 'th' ? 'ดูข้อมูล' : 'View Details'} ${user.username}`}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-sky-50 hover:text-sky-600'} cursor-pointer`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEditUsers && (
                          <button
                            onClick={() => setEditingUser(user)}
                            title={translations.edit}
                            aria-label={`${translations.edit} ${user.username}`}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-amber-300 hover:bg-amber-500 hover:text-white' : 'bg-slate-100 text-amber-600 hover:bg-amber-50'} cursor-pointer`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canManagePasswords && (
                          <button
                            onClick={() => setResetPasswordUser(user)}
                            title={translations.resetPassword}
                            aria-label={`${translations.resetPassword} ${user.username}`}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-600 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} cursor-pointer`}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        {canCreateDeleteUsers && (
                          <button
                            onClick={() => handleDeleteUser(user.userId)}
                            title={translations.delete}
                            aria-label={`${translations.delete} ${user.username}`}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-rose-300 hover:bg-rose-500 hover:text-white' : 'bg-slate-100 text-rose-600 hover:bg-rose-50'} cursor-pointer`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={`lg:hidden divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`mobile-loading-${index}`} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className={`h-4 w-36 rounded mb-3 animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <div className={`h-4 w-24 rounded mb-2 animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <div className={`h-7 w-28 rounded-lg mb-4 animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <div className="flex gap-2">
                  <div className={`h-9 flex-1 rounded-lg animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className={`h-9 w-12 rounded-lg animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className={`h-9 w-12 rounded-lg animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                </div>
              </div>
            ))
          ) : currentItems.length === 0 ? (
            <div className={`p-12 text-center ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500'}`}>
              <div className={`mx-auto mb-4 h-14 w-14 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                <Users className="w-7 h-7 opacity-50" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{translations.noData}</h3>
              <p className="text-sm">{translations.searchPlaceholder}</p>
            </div>
          ) : (
            currentItems.map((user) => (
              <div key={user.userId} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className={`text-base font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.username}</p>
                    <div className={`mt-2 flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getRoleBadgeClass(user.roleId)}`}></span>
                      <span className="truncate">{user.roleName}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                    user.status === 'active'
                      ? darkMode ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : darkMode ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  }`}>
                    {user.status === 'active' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                    <span>{user.status === 'active' ? translations.active : translations.inactive}</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewUser(user)}
                    disabled={loadingDetailUserId === user.userId}
                    title={language === 'th' ? 'ดูข้อมูล' : 'View Details'}
                    aria-label={`${language === 'th' ? 'ดูข้อมูล' : 'View Details'} ${user.username}`}
                    className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:hover:bg-slate-300"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{language === 'th' ? 'ดูข้อมูล' : 'View'}</span>
                  </button>
                  {canEditUsers && (
                    <button
                      onClick={() => setEditingUser(user)}
                      title={translations.edit}
                      aria-label={`${translations.edit} ${user.username}`}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors ${darkMode ? 'bg-slate-800 text-amber-300 hover:bg-amber-500 hover:text-white' : 'bg-slate-100 text-amber-600 hover:bg-amber-50'} cursor-pointer`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canManagePasswords && (
                    <button
                      onClick={() => setResetPasswordUser(user)}
                      title={translations.resetPassword}
                      aria-label={`${translations.resetPassword} ${user.username}`}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-600 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} cursor-pointer`}
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                  )}
                  {canCreateDeleteUsers && (
                    <button
                      onClick={() => handleDeleteUser(user.userId)}
                      title={translations.delete}
                      aria-label={`${translations.delete} ${user.username}`}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors ${darkMode ? 'bg-slate-800 text-rose-300 hover:bg-rose-500 hover:text-white' : 'bg-slate-100 text-rose-600 hover:bg-rose-50'} cursor-pointer`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className={`border-t px-6 py-4 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="order-3 flex items-center gap-2">
              <label className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {translations.itemsPerPage}:
              </label>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={`h-8 rounded-md border px-2 text-sm font-semibold cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-600'} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className={`order-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.showing} {filteredUsers.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, filteredUsers.length)} {translations.of} {filteredUsers.length}</div>

            <div className="order-2 flex items-center gap-1">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : darkMode ? 'cursor-pointer hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-100'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return <span key={`ellipsis-${index}`} className={`px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>...</span>;
                }
                return (
                  <button key={page} onClick={() => handlePageChange(page as number)} className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-bold transition-all ${currentPage === page ? darkMode ? 'bg-slate-800 text-slate-300 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' : darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {page}
                  </button>
                );
              })}

              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || totalPages === 0} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all ${currentPage >= totalPages || totalPages === 0 ? 'opacity-40 cursor-not-allowed' : darkMode ? 'cursor-pointer hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-100'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddUserModal && (
        <UserModal user={null} mode="add" darkMode={darkMode} language={language} onClose={() => setShowAddUserModal(false)} onSave={handleSaveUser} translations={translations} canManagePasswords={canManagePasswords} existingUsernames={users.map(u => u.username)} locations={locations} />
      )}
      {editingUser && (
        <UserModal user={editingUser} mode="edit" darkMode={darkMode} language={language} onClose={() => setEditingUser(null)} onSave={handleSaveUser} onDelete={canCreateDeleteUsers ? handleDeleteUser : undefined} translations={translations} canManagePasswords={canManagePasswords} existingUsernames={users.map(u => u.username)} locations={locations}/>
      )}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          darkMode={darkMode}
          translations={translations}
          onClose={() => setResetPasswordUser(null)}
          onSave={handleResetPassword}
        />
      )}
      {viewingUser && (
        <UserDetailModal
          user={viewingUser}
          darkMode={darkMode}
          language={language}
          translations={translations}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
}
