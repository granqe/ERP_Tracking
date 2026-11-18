import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type {
  Department,
  EmailSettings,
  ErpModule,
  RolloutPhase,
  User,
  UserRole,
} from '../types';
import { generateRandomPassword } from '../utils/auth';
import { getInitials, getRoleBadgeClass } from '../utils/formatters';

interface TeamAndModulesModalProps {
  isOpen: boolean;
  currentUserId: string;
  users: User[];
  departments: Department[];
  modules: ErpModule[];
  phases: RolloutPhase[];
  emailSettings: EmailSettings;
  onClose: () => void;
  onSaveUser: (
    user: Omit<User, 'id' | 'created_at' | 'password_hash'> & {
      id?: string;
      password?: string;
      password_hash?: string;
    },
    options?: { sendCredentialsEmail?: boolean }
  ) => Promise<void>;
  onSendUserCredentials: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onSaveModule: (
    mod: Omit<ErpModule, 'id' | 'created_at' | 'is_default'> & {
      id?: string;
      is_default?: boolean;
    }
  ) => Promise<void>;
  onSaveDepartment: (dept: {
    id?: string;
    name: string;
    previousName?: string;
  }) => Promise<void>;
  onDeleteDepartment: (deptId: string) => Promise<void>;
  onSaveEmailSettings: (
    settings: Omit<EmailSettings, 'id' | 'updated_at'>
  ) => Promise<void>;
  onSendTestEmail: (
    toEmail: string,
    config: EmailSettings
  ) => Promise<{ ok: boolean; error?: string }>;
}

const AVATAR_COLORS = [
  '#0f172a',
  '#1d4ed8',
  '#0369a1',
  '#0d9488',
  '#b45309',
  '#be123c',
  '#4338ca',
];

export const TeamAndModulesModal: React.FC<TeamAndModulesModalProps> = ({
  isOpen,
  currentUserId,
  users,
  departments,
  modules,
  phases,
  emailSettings,
  onClose,
  onSaveUser,
  onSendUserCredentials,
  onDeleteUser,
  onSaveModule,
  onSaveDepartment,
  onDeleteDepartment,
  onSaveEmailSettings,
  onSendTestEmail,
}) => {
  const [tab, setTab] = useState<'team' | 'modules' | 'departments' | 'email'>(
    'team'
  );
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSendCredsId, setConfirmSendCredsId] = useState<string | null>(
    null
  );
  const [sendingCredsId, setSendingCredsId] = useState<string | null>(null);

  // User form state
  const [editingUserId, setEditingUserId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Staf');
  const [department, setDepartment] = useState(
    departments[0]?.name || 'Menaxhim Projekti'
  );
  const [customDeptMode, setCustomDeptMode] = useState(false);
  const [customDeptName, setCustomDeptName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [active, setActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [sendCredentialsEmail, setSendCredentialsEmail] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Module form state
  const [editingModId, setEditingModId] = useState<string | undefined>();
  const [modName, setModName] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modPhase, setModPhase] = useState(1);
  const [savingMod, setSavingMod] = useState(false);

  // Department form state
  const [editingDeptId, setEditingDeptId] = useState<string | undefined>();
  const [editingDeptPrevName, setEditingDeptPrevName] = useState<
    string | undefined
  >();
  const [deptName, setDeptName] = useState('');
  const [savingDept, setSavingDept] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [confirmDeleteDeptId, setConfirmDeleteDeptId] = useState<string | null>(
    null
  );

  // Email settings state
  const [emailEnabled, setEmailEnabled] = useState(emailSettings.enabled);
  const [smtpHost, setSmtpHost] = useState(emailSettings.smtp_host);
  const [smtpPort, setSmtpPort] = useState(emailSettings.smtp_port || 587);
  const [smtpSecure, setSmtpSecure] = useState(emailSettings.smtp_secure);
  const [imapHost, setImapHost] = useState(emailSettings.imap_host);
  const [imapPort, setImapPort] = useState(emailSettings.imap_port || 993);
  const [emailUser, setEmailUser] = useState(emailSettings.email_user);
  const [emailPass, setEmailPass] = useState(emailSettings.email_pass);
  const [fromName, setFromName] = useState(
    emailSettings.from_name || 'ERP Migrim & Gjurmues'
  );
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaveError, setEmailSaveError] = useState<string | null>(null);
  const [testToEmail, setTestToEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setEmailEnabled(emailSettings.enabled);
    setSmtpHost(emailSettings.smtp_host);
    setSmtpPort(emailSettings.smtp_port || 587);
    setSmtpSecure(emailSettings.smtp_secure);
    setImapHost(emailSettings.imap_host);
    setImapPort(emailSettings.imap_port || 993);
    setEmailUser(emailSettings.email_user);
    setEmailPass(emailSettings.email_pass);
    setFromName(emailSettings.from_name || 'ERP Migrim & Gjurmues');
  }, [emailSettings]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetUserForm = () => {
    setEditingUserId(undefined);
    setName('');
    setUsername('');
    setPassword('');
    setRole('Staf');
    setDepartment(departments[0]?.name || 'Menaxhim Projekti');
    setCustomDeptMode(false);
    setCustomDeptName('');
    setSpecialty('');
    setUserEmail('');
    setActive(true);
    setShowPassword(false);
    setSendCredentialsEmail(false);
  };

  const handleEditUser = (u: User) => {
    setEditingUserId(u.id);
    setName(u.name);
    setUsername(u.username);
    setPassword('');
    setRole(u.role);
    setDepartment(u.department);
    setCustomDeptMode(false);
    setCustomDeptName('');
    setSpecialty(u.specialty || '');
    setUserEmail(u.email || '');
    setActive(u.active);
    setShowPassword(false);
    setSendCredentialsEmail(false);
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === currentUserId) return;
    await onSaveUser({
      id: u.id,
      name: u.name,
      username: u.username,
      password_hash: u.password_hash,
      role: u.role,
      department: u.department,
      specialty: u.specialty,
      email: u.email,
      avatar_color: u.avatar_color,
      active: !u.active,
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;
    if (!editingUserId && !password.trim()) return;
    if (customDeptMode && !customDeptName.trim()) return;
    setSavingUser(true);
    try {
      const existing = users.find((u) => u.id === editingUserId);
      let finalDepartment = department.trim();
      if (customDeptMode) {
        const trimmedCustom = customDeptName.trim();
        const existingDept = departments.find(
          (d) => d.name.toLowerCase() === trimmedCustom.toLowerCase()
        );
        if (existingDept) {
          finalDepartment = existingDept.name;
        } else {
          await onSaveDepartment({ name: trimmedCustom });
          finalDepartment = trimmedCustom;
        }
      }
      const canSendEmail =
        sendCredentialsEmail &&
        userEmail.trim().includes('@') &&
        password.trim().length > 0;
      await onSaveUser(
        {
          id: editingUserId,
          name,
          username,
          password: password.trim() || undefined,
          password_hash: existing?.password_hash,
          role,
          department: finalDepartment,
          specialty,
          email: userEmail.trim() || null,
          active,
          avatar_color:
            existing?.avatar_color ||
            AVATAR_COLORS[users.length % AVATAR_COLORS.length],
        },
        { sendCredentialsEmail: canSendEmail }
      );
      resetUserForm();
    } finally {
      setSavingUser(false);
    }
  };

  const resetModForm = () => {
    setEditingModId(undefined);
    setModName('');
    setModDesc('');
    setModPhase(1);
  };

  const handleEditMod = (m: ErpModule) => {
    setEditingModId(m.id);
    setModName(m.name);
    setModDesc(m.description || '');
    setModPhase(m.rollout_phase);
  };

  const handleModSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim()) return;
    setSavingMod(true);
    try {
      const existing = modules.find((m) => m.id === editingModId);
      await onSaveModule({
        id: editingModId,
        name: modName,
        description: modDesc,
        rollout_phase: modPhase,
        is_default: existing?.is_default ?? false,
      });
      resetModForm();
    } finally {
      setSavingMod(false);
    }
  };

  const resetDeptForm = () => {
    setEditingDeptId(undefined);
    setEditingDeptPrevName(undefined);
    setDeptName('');
    setDeptError(null);
  };

  const handleEditDept = (d: Department) => {
    setEditingDeptId(d.id);
    setEditingDeptPrevName(d.name);
    setDeptName(d.name);
    setDeptError(null);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = deptName.trim();
    if (!trimmed) return;
    setSavingDept(true);
    setDeptError(null);
    try {
      await onSaveDepartment({
        id: editingDeptId,
        name: trimmed,
        previousName: editingDeptPrevName,
      });
      resetDeptForm();
    } catch (err) {
      setDeptError(
        err instanceof Error
          ? err.message
          : 'Gabim gjatë ruajtjes së departamentit.'
      );
    } finally {
      setSavingDept(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Menaxhimi i Përdoruesve & Moduleve të ERP-së
            </h2>
            <p className="text-xs text-slate-500">
              Shtoni, modifikoni, aktivizoni/çaktivizoni ose fshini përdoruesit
              (pa email — me emër përdoruesi dhe fjalëkalim)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 px-6 gap-4 bg-white">
          <button
            type="button"
            onClick={() => setTab('team')}
            className={`flex shrink-0 items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'team'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Përdoruesit ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('modules')}
            className={`flex shrink-0 items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'modules'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Modulet e ERP-së ({modules.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('departments')}
            className={`flex shrink-0 items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'departments'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Departamentet ({departments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex shrink-0 items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'email'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Email (SMTP / IMAP)</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {tab === 'team' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add/Edit User Form */}
              <form
                onSubmit={handleUserSubmit}
                className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 h-fit"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <span>
                      {editingUserId
                        ? 'Përditëso Përdoruesin'
                        : 'Regjistro Përdorues të Ri'}
                    </span>
                  </h3>
                  {editingUserId && (
                    <button
                      type="button"
                      onClick={resetUserForm}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Pastro
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Emri dhe Mbiemri *
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="p.sh. Erion Berisha"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Emri i Përdoruesit *
                    </label>
                    <input
                      required
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="p.sh. erion.berisha"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        {editingUserId
                          ? 'Fjalëkalim i ri (opsional)'
                          : 'Fjalëkalimi *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const generated = generateRandomPassword(10);
                          setPassword(generated);
                          setShowPassword(true);
                          if (userEmail.trim().includes('@')) {
                            setSendCredentialsEmail(true);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition"
                        title="Gjenero fjalëkalim të rastësishëm"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Gjenero</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        required={!editingUserId}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          editingUserId ? 'Lëre bosh nëse s’ndryshon' : '••••••••'
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword
                            ? 'Fshih fjalëkalimin'
                            : 'Shfaq fjalëkalimin'
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Roli *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Staf">Staf</option>
                      <option value="Programer">Programer</option>
                      <option value="Menaxher">Menaxher</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Departamenti *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDeptMode((v) => !v);
                          setCustomDeptName('');
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        {customDeptMode ? (
                          <span>Zgjidh nga lista</span>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            <span>Shkruaj të ri</span>
                          </>
                        )}
                      </button>
                    </div>
                    {customDeptMode ? (
                      <input
                        required
                        type="text"
                        value={customDeptName}
                        onChange={(e) => setCustomDeptName(e.target.value)}
                        placeholder="p.sh. Logjistikë"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {Array.from(
                          new Set([
                            ...departments.map((d) => d.name),
                            ...(department ? [department] : []),
                          ])
                        ).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Specialiteti / Fusha
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="p.sh. Kontabilitet / Backend API"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email (për njoftime & kredenciale, opsional)
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserEmail(val);
                      if (!val.trim().includes('@')) {
                        setSendCredentialsEmail(false);
                      }
                    }}
                    placeholder="emri@kompania.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Llogari Aktive</span>
                  </label>

                  <label
                    className={`flex items-start gap-2 text-xs font-medium ${
                      userEmail.trim().includes('@') && password.trim().length > 0
                        ? 'text-slate-700'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={
                        !userEmail.trim().includes('@') ||
                        password.trim().length === 0
                      }
                      checked={
                        sendCredentialsEmail &&
                        userEmail.trim().includes('@') &&
                        password.trim().length > 0
                      }
                      onChange={(e) => setSendCredentialsEmail(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span>
                      Dërgo me email linkun e aplikacionit dhe kredencialet
                      <span className="block text-[11px] font-normal text-slate-500">
                        Kërkon email të vlefshëm dhe fjalëkalim të vendosur.
                      </span>
                    </span>
                  </label>
                  {sendCredentialsEmail &&
                    userEmail.trim().includes('@') &&
                    password.trim().length > 0 &&
                    !emailSettings.enabled && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                        Kujdes: Dërgimi i email-eve nuk është aktivizuar te tabi{' '}
                        <strong>Email (SMTP / IMAP)</strong>.
                      </p>
                    )}
                </div>

                <button
                  type="submit"
                  disabled={savingUser}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingUser
                    ? 'Duke ruajtur...'
                    : editingUserId
                    ? 'Ruaj Ndryshimet'
                    : 'Regjistro Përdoruesin'}
                </button>
              </form>

              {/* Users List */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Kërko përdorues..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Të gjitha Rolet</option>
                    <option value="Menaxher">Menaxher</option>
                    <option value="Programer">Programer</option>
                    <option value="Staf">Staf</option>
                  </select>
                </div>

                <div className="space-y-2">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUserId;
                    const isConfirmingDelete = confirmDeleteId === u.id;
                    const isConfirmingSendCreds = confirmSendCredsId === u.id;
                    const hasEmail = Boolean(
                      u.email && u.email.trim().includes('@')
                    );
                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                          u.active
                            ? 'border-slate-200 bg-white'
                            : 'border-slate-200 bg-slate-50 opacity-65'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                            style={{ backgroundColor: u.avatar_color }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {u.name}
                              </p>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${getRoleBadgeClass(
                                  u.role
                                )}`}
                              >
                                {u.role}
                              </span>
                              {!u.active && (
                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                  Joaktiv
                                </span>
                              )}
                              {isSelf && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                  Ju
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-slate-500">
                              @{u.username} • {u.department}
                              {u.specialty ? ` (${u.specialty})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isConfirmingSendCreds ? (
                            <div className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-1.5 py-1">
                              <span className="hidden md:inline text-[10px] font-medium text-blue-800 px-1">
                                Fjalëkalim i ri?
                              </span>
                              <button
                                type="button"
                                disabled={sendingCredsId === u.id}
                                onClick={async () => {
                                  setSendingCredsId(u.id);
                                  try {
                                    await onSendUserCredentials(u);
                                    setConfirmSendCredsId(null);
                                  } finally {
                                    setSendingCredsId(null);
                                  }
                                }}
                                className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {sendingCredsId === u.id
                                  ? 'Duke dërguar...'
                                  : 'Dërgo'}
                              </button>
                              <button
                                type="button"
                                disabled={sendingCredsId === u.id}
                                onClick={() => setConfirmSendCredsId(null)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                              >
                                Jo
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!hasEmail}
                              onClick={() => {
                                setConfirmSendCredsId(u.id);
                                setConfirmDeleteId(null);
                              }}
                              className={`rounded-lg border p-1.5 transition ${
                                hasEmail
                                  ? 'border-blue-200 bg-blue-50/70 text-blue-600 hover:bg-blue-100 hover:text-blue-800'
                                  : 'border-slate-200 text-slate-300 cursor-not-allowed'
                              }`}
                              title={
                                hasEmail
                                  ? `Dërgo kredencialet me email (${u.email})`
                                  : 'Shtoni email-in te Ndrysho për të dërguar kredencialet'
                              }
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                          )}

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold flex items-center gap-1 transition ${
                                u.active
                                  ? 'border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title={
                                u.active
                                  ? 'Çaktivizo llogarinë'
                                  : 'Aktivizo llogarinë'
                              }
                            >
                              {u.active ? (
                                <>
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">
                                    Çaktivizo
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">
                                    Aktivizo
                                  </span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEditUser(u)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Ndrysho"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {!isSelf &&
                            (isConfirmingDelete ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteUser(u.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="rounded-lg bg-rose-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                                >
                                  Konfirmo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                                >
                                  Jo
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(u.id)}
                                className="rounded-lg border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                                title="Fshi përdoruesin"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : tab === 'modules' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add/Edit Module Form */}
              <form
                onSubmit={handleModSubmit}
                className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 h-fit"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-blue-600" />
                    <span>
                      {editingModId
                        ? 'Përditëso Modulin'
                        : 'Shto Modul të Ri ERP'}
                    </span>
                  </h3>
                  {editingModId && (
                    <button
                      type="button"
                      onClick={resetModForm}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Pastro
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Emri i Modulit *
                  </label>
                  <input
                    required
                    type="text"
                    value={modName}
                    onChange={(e) => setModName(e.target.value)}
                    placeholder="p.sh. Burimet Njerëzore & Pagat"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Faza e Migrimit (Pipeline) *
                  </label>
                  <select
                    value={modPhase}
                    onChange={(e) => setModPhase(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {phases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Përshkrimi i shkurtër
                  </label>
                  <textarea
                    rows={2}
                    value={modDesc}
                    onChange={(e) => setModDesc(e.target.value)}
                    placeholder="Çfarë përfshin ky modul..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingMod}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingMod
                    ? 'Duke ruajtur...'
                    : editingModId
                    ? 'Ruaj Modulin'
                    : 'Shto Modulin'}
                </button>
              </form>

              {/* Modules List */}
              <div className="lg:col-span-7 space-y-2">
                {modules.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {m.name}
                        </p>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Faza {m.rollout_phase}
                        </span>
                      </div>
                      {m.description && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {m.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditMod(m)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="Ndrysho"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : tab === 'departments' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add/Edit Department Form */}
              <form
                onSubmit={handleDeptSubmit}
                className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 h-fit"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>
                      {editingDeptId
                        ? 'Ndrysho Departamentin'
                        : 'Shto Departament të Ri'}
                    </span>
                  </h3>
                  {editingDeptId && (
                    <button
                      type="button"
                      onClick={resetDeptForm}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Pastro
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Emri i Departamentit *
                  </label>
                  <input
                    required
                    type="text"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="p.sh. Logjistika / Burimet Njerëzore"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {deptError && (
                  <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                    {deptError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingDept}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingDept
                    ? 'Duke ruajtur...'
                    : editingDeptId
                    ? 'Ruaj Departamentin'
                    : 'Shto Departamentin'}
                </button>
              </form>

              {/* Departments List */}
              <div className="lg:col-span-7 space-y-2">
                {departments.map((d) => {
                  const userCount = users.filter(
                    (u) => u.department === d.name
                  ).length;
                  const isFallback = d.id.startsWith('fallback-');
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {d.name}
                          </p>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {userCount} përdorues
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditDept(d)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          title="Ndrysho"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        {!isFallback &&
                          (confirmDeleteDeptId === d.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteDepartment(d.id);
                                  setConfirmDeleteDeptId(null);
                                  if (editingDeptId === d.id) resetDeptForm();
                                }}
                                className="rounded-lg bg-rose-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                              >
                                Konfirmo
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDeptId(null)}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                              >
                                Jo
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDeptId(d.id)}
                              className="rounded-lg border border-slate-200 p-2 text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                              title="Fshi departamentin"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingEmail(true);
                  setEmailSaveError(null);
                  try {
                    await onSaveEmailSettings({
                      enabled: emailEnabled,
                      smtp_host: smtpHost,
                      smtp_port: Number(smtpPort) || 587,
                      smtp_secure: smtpSecure,
                      imap_host: imapHost,
                      imap_port: Number(imapPort) || 993,
                      email_user: emailUser,
                      email_pass: emailPass,
                      from_name: fromName,
                    });
                  } catch (err) {
                    setEmailSaveError(
                      err instanceof Error
                        ? err.message
                        : 'Gabim gjatë ruajtjes së konfigurimit të email-it.'
                    );
                  } finally {
                    setSavingEmail(false);
                  }
                }}
                className="lg:col-span-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span>Konfigurimi i Serverit të Email-it</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dërgon email automatik te Programeri kur hapet kërkesë e re
                      dhe te Raportuesi kur Programeri bën ndryshime.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Aktivizo njoftimet automatike me email</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Emri i Dërguesit
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="ERP Migrim & Gjurmues"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email / Përdoruesi *
                    </label>
                    <input
                      type="email"
                      value={emailUser}
                      onChange={(e) => setEmailUser(e.target.value)}
                      placeholder="njoftime@kompania.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fjalëkalimi / App Password *
                  </label>
                  <input
                    type="password"
                    value={emailPass}
                    onChange={(e) => setEmailPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      SMTP Host (për dërgim) *
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com ose mail.kompania.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      IMAP Host (opsional)
                    </label>
                    <input
                      type="text"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="imap.gmail.com ose mail.kompania.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      IMAP Port
                    </label>
                    <input
                      type="number"
                      value={imapPort}
                      onChange={(e) => setImapPort(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Përdor SSL/TLS (zakonisht për portin 465)</span>
                </label>

                {emailSaveError && (
                  <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                    {emailSaveError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingEmail}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingEmail ? 'Duke ruajtur...' : 'Ruaj Konfigurimin'}
                </button>
              </form>

              {/* Test Email & Info */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-blue-600" />
                    <span>Testo Dërgimin e Email-it</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Dërgoni një email provë me cilësimet e mësipërme për të
                    verifikuar lidhjen me serverin e postës.
                  </p>
                  <input
                    type="email"
                    value={testToEmail}
                    onChange={(e) => setTestToEmail(e.target.value)}
                    placeholder="email-juaj@kompania.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={sendingTest || !testToEmail.includes('@')}
                    onClick={async () => {
                      setSendingTest(true);
                      setTestFeedback(null);
                      const result = await onSendTestEmail(testToEmail.trim(), {
                        id: 'default',
                        enabled: true,
                        smtp_host: smtpHost,
                        smtp_port: Number(smtpPort) || 587,
                        smtp_secure: smtpSecure,
                        imap_host: imapHost,
                        imap_port: Number(imapPort) || 993,
                        email_user: emailUser,
                        email_pass: emailPass,
                        from_name: fromName,
                      });
                      setSendingTest(false);
                      setTestFeedback(
                        result.ok
                          ? {
                              ok: true,
                              message: `Email-i test u dërgua me sukses te ${testToEmail.trim()}.`,
                            }
                          : {
                              ok: false,
                              message:
                                result.error || 'Dërgimi i testit dështoi.',
                            }
                      );
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {sendingTest ? 'Duke dërguar...' : 'Dërgo Email Test'}
                    </span>
                  </button>

                  {testFeedback && (
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        testFeedback.ok
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}
                    >
                      {testFeedback.message}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1.5">
                  <p className="font-bold text-slate-800">Shënim i rëndësishëm:</p>
                  <p>
                    Që përdoruesit dhe programerët të marrin email, plotësoni
                    fushën <strong>Email</strong> te profili i tyre në tabin{' '}
                    <strong>Përdoruesit</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
