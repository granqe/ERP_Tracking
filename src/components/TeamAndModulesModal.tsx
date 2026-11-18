import React, { useState } from 'react';
import {
  Boxes,
  Building2,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type {
  Department,
  ErpModule,
  RolloutPhase,
  User,
  UserRole,
} from '../types';
import { getInitials, getRoleBadgeClass } from '../utils/formatters';

interface TeamAndModulesModalProps {
  isOpen: boolean;
  currentUserId: string;
  users: User[];
  departments: Department[];
  modules: ErpModule[];
  phases: RolloutPhase[];
  onClose: () => void;
  onSaveUser: (
    user: Omit<User, 'id' | 'created_at' | 'password_hash'> & {
      id?: string;
      password?: string;
      password_hash?: string;
    }
  ) => Promise<void>;
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
  onClose,
  onSaveUser,
  onDeleteUser,
  onSaveModule,
  onSaveDepartment,
  onDeleteDepartment,
}) => {
  const [tab, setTab] = useState<'team' | 'modules' | 'departments'>('team');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // User form state
  const [editingUserId, setEditingUserId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Staf');
  const [department, setDepartment] = useState(
    departments[0]?.name || 'Menaxhim Projekti'
  );
  const [specialty, setSpecialty] = useState('');
  const [active, setActive] = useState(true);
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
    setDepartment(DEPARTMENTS[1]);
    setSpecialty('');
    setActive(true);
  };

  const handleEditUser = (u: User) => {
    setEditingUserId(u.id);
    setName(u.name);
    setUsername(u.username);
    setPassword('');
    setRole(u.role);
    setDepartment(u.department);
    setSpecialty(u.specialty || '');
    setActive(u.active);
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
      avatar_color: u.avatar_color,
      active: !u.active,
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;
    if (!editingUserId && !password.trim()) return;
    setSavingUser(true);
    try {
      const existing = users.find((u) => u.id === editingUserId);
      await onSaveUser({
        id: editingUserId,
        name,
        username,
        password: password.trim() || undefined,
        password_hash: existing?.password_hash,
        role,
        department,
        specialty,
        active,
        avatar_color:
          existing?.avatar_color ||
          AVATAR_COLORS[users.length % AVATAR_COLORS.length],
      });
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {editingUserId
                        ? 'Fjalëkalim i ri (opsional)'
                        : 'Fjalëkalimi *'}
                    </label>
                    <input
                      required={!editingUserId}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUserId ? 'Lëre bosh nëse s’ndryshon' : '••••••••'}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Departamenti *
                    </label>
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

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Llogari Aktive</span>
                </label>

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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
