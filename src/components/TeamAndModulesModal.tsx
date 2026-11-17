import React, { useState } from 'react';
import { Boxes, Edit3, Plus, UserPlus, Users, X } from 'lucide-react';
import { DEPARTMENTS } from '../types';
import type { ErpModule, RolloutPhase, User, UserRole } from '../types';
import { getInitials, getRoleBadgeClass } from '../utils/formatters';

interface TeamAndModulesModalProps {
  isOpen: boolean;
  users: User[];
  modules: ErpModule[];
  phases: RolloutPhase[];
  onClose: () => void;
  onSaveUser: (
    user: Omit<User, 'id' | 'created_at'> & { id?: string }
  ) => Promise<void>;
  onSaveModule: (
    mod: Omit<ErpModule, 'id' | 'created_at' | 'is_default'> & {
      id?: string;
      is_default?: boolean;
    }
  ) => Promise<void>;
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
  users,
  modules,
  phases,
  onClose,
  onSaveUser,
  onSaveModule,
}) => {
  const [tab, setTab] = useState<'team' | 'modules'>('team');

  // User form state
  const [editingUserId, setEditingUserId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Staf');
  const [department, setDepartment] = useState(DEPARTMENTS[1]);
  const [specialty, setSpecialty] = useState('');
  const [active, setActive] = useState(true);
  const [savingUser, setSavingUser] = useState(false);

  // Module form state
  const [editingModId, setEditingModId] = useState<string | undefined>();
  const [modName, setModName] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modPhase, setModPhase] = useState(1);
  const [savingMod, setSavingMod] = useState(false);

  if (!isOpen) return null;

  const resetUserForm = () => {
    setEditingUserId(undefined);
    setName('');
    setEmail('');
    setRole('Staf');
    setDepartment(DEPARTMENTS[1]);
    setSpecialty('');
    setActive(true);
  };

  const handleEditUser = (u: User) => {
    setEditingUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setDepartment(u.department);
    setSpecialty(u.specialty || '');
    setActive(u.active);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSavingUser(true);
    try {
      const existing = users.find((u) => u.id === editingUserId);
      await onSaveUser({
        id: editingUserId,
        name,
        email,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Menaxhimi i Ekipit & Moduleve të ERP-së
            </h2>
            <p className="text-xs text-slate-500">
              Regjistroni anëtarë të rinj, caktoni rolet dhe menaxhoni modulet
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
        <div className="flex border-b border-slate-200 px-6 gap-4 bg-white">
          <button
            type="button"
            onClick={() => setTab('team')}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'team'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Anëtarët e Ekipit ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('modules')}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'modules'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Modulet e ERP-së ({modules.length})</span>
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
                        ? 'Përditëso Anëtarin'
                        : 'Regjistro Anëtar të Ri'}
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="erion.berisha@kompania.al"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
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
                      {DEPARTMENTS.map((d) => (
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
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingUser
                    ? 'Duke ruajtur...'
                    : editingUserId
                    ? 'Ruaj Ndryshimet'
                    : 'Shto në Ekip'}
                </button>
              </form>

              {/* Users List */}
              <div className="lg:col-span-7 space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                      u.active
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-200 bg-slate-50 opacity-60'
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
                        <div className="flex items-center gap-2">
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
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {u.email} • {u.department}
                          {u.specialty ? ` (${u.specialty})` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditUser(u)}
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
          )}
        </div>
      </div>
    </div>
  );
};
