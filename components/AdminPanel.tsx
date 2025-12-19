
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { TrashIcon, XIcon, CheckIcon, BotIcon } from './Icons';

interface AdminPanelProps {
  onClose: () => void;
  currentUser: User;
  onUserDeleted: (deletedId: string) => void;
  onUserUpdated: (updatedUser: User) => void;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, title, message, confirmLabel, onConfirm, onCancel, isDestructive = true 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${
              isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentUser, onUserDeleted, onUserUpdated }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Custom Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: () => {}
  });

  const loadUsers = () => {
    try {
      const data = localStorage.getItem('pl_registered_users');
      if (data) {
        setUsers(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load users:", e);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const saveUsers = (updatedUsers: User[]) => {
    try {
      localStorage.setItem('pl_registered_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      const freshCurrent = updatedUsers.find(u => u.id === currentUser.id);
      if (freshCurrent) {
        onUserUpdated(freshCurrent);
      }
    } catch (e) {
      alert("Failed to save changes.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    
    const count = selectedIds.size;
    const hasSelf = selectedIds.has(currentUser.id);
    const message = hasSelf 
      ? `You are about to delete ${count} user(s), INCLUDING YOUR OWN account. You will be logged out immediately. This action is irreversible.`
      : `Are you sure you want to permanently delete these ${count} selected user accounts?`;

    setModal({
      isOpen: true,
      title: 'Confirm Bulk Deletion',
      message,
      confirmLabel: 'Delete All',
      onConfirm: () => {
        const updated = users.filter(u => !selectedIds.has(u.id));
        saveUsers(updated);
        selectedIds.forEach(id => onUserDeleted(id));
        setSelectedIds(new Set());
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBulkBlock = (block: boolean) => {
    if (selectedIds.size === 0) return;
    
    const updated: User[] = users.map(u => {
      if (selectedIds.has(u.id)) {
        return { ...u, isBlocked: block };
      }
      return u;
    });
    
    saveUsers(updated);
    
    if (block && selectedIds.has(currentUser.id)) {
      onUserDeleted(currentUser.id);
    }
    
    setSelectedIds(new Set());
  };

  const deleteSingleUser = (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    setModal({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.name} (${user.email})? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        const updated = users.filter(u => u.id !== id);
        saveUsers(updated);
        onUserDeleted(id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleAdmin = (id: string) => {
    const updated: User[] = users.map(u => {
      if (u.id === id) {
        return { ...u, role: (u.role === 'admin' ? 'user' : 'admin') as 'admin' | 'user' };
      }
      return u;
    });
    saveUsers(updated);
  };

  const allSelected = users.length > 0 && selectedIds.size === users.length;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden animate-in slide-in-from-right-4 duration-300">
      <ConfirmationModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Control Panel</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <XIcon className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          
          {/* Bulk Actions Bar */}
          <div className={`mb-4 flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100 shadow-sm transition-all duration-300 ${selectedIds.size > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <div className="flex items-center gap-3">
              <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{selectedIds.size} Selected</span>
              <p className="text-sm font-medium text-slate-600 hidden md:block">Choose an action for selected users:</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleBulkBlock(true)}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                Block Access
              </button>
              <button 
                onClick={() => handleBulkBlock(false)}
                className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
              >
                Unblock
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                Delete Accounts
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={allSelected} 
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Access Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No users found.</td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelected = selectedIds.has(u.id);
                      const isSelf = u.id === currentUser.id;
                      return (
                        <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleSelect(u.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                  {u.name}
                                  {isSelf && <span className="text-[9px] bg-slate-900 text-white px-1 py-0.5 rounded font-bold uppercase">You</span>}
                                </span>
                                <span className="text-xs text-slate-500">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                              u.role === 'admin' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.isBlocked ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => toggleAdmin(u.id)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title={u.role === 'admin' ? "Demote to User" : "Promote to Admin"}
                              >
                                <CheckIcon className={`w-4 h-4 ${u.role === 'admin' ? 'text-indigo-600' : ''}`} />
                              </button>
                              <button 
                                onClick={() => deleteSingleUser(u.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">Access Rules</h4>
                <ul className="text-xs text-slate-500 space-y-2">
                  <li className="flex gap-2"><span>•</span> Blocked users cannot log in to the application.</li>
                  <li className="flex gap-2"><span>•</span> Promoting a user to Admin gives them access to this panel.</li>
                </ul>
             </div>
             <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <h4 className="text-xs font-bold text-amber-800 uppercase mb-2">Security Warning</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Deleting an account is irreversible. All related session data for that user will be cleared from their browser upon their next activity.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
