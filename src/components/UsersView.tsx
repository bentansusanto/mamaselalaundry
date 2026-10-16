'use client';

import React, { useState } from 'react';
import { UserAccount } from '@/types';
import { Shield, Plus, UserCheck, UserX, X, Edit3, User } from 'lucide-react';

interface UsersViewProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onSaveUser: (user: UserAccount) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, currentUser, onSaveUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'Admin' | 'Kasir'>('Kasir');
  const [isActive, setIsActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setRole('Kasir');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setRole(u.role);
    setIsActive(u.isActive);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !username.trim()) {
      alert('Nama dan Username harus diisi');
      return;
    }

    const u: UserAccount = {
      id: editingUser ? editingUser.id : `USR-${String(users.length + 1).padStart(2, '0')}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role,
      isActive,
    };

    onSaveUser(u);
    setIsModalOpen(false);
  };

  const handleToggleActive = (user: UserAccount) => {
    onSaveUser({ ...user, isActive: !user.isActive });
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xs text-slate-900">Manajemen Pengguna</h3>
          <p className="text-[10px] text-slate-400">Kelola akses kasir & admin</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition active:scale-95 shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah User
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => {
          const isMe = u.id === currentUser.id;

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                    u.role === 'Admin' ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  {u.role === 'Admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">{u.name}</span>
                    {isMe && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 rounded">
                        Anda
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    @{u.username} • Role: <span className="font-semibold">{u.role}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(u)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                    u.isActive
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}
                >
                  {u.isActive ? 'Aktif' : 'Nonaktif'}
                </button>
                <button
                  onClick={() => handleOpenEdit(u)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Kasir / Admin"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username login"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role / Peran</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                >
                  <option value="Kasir">Kasir</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="w-1/2 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
