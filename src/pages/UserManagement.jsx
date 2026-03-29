import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2, ArrowLeft, UserPlus, Users, KeyRound } from 'lucide-react';

const ROLES = ['viewer', 'user', 'admin'];

export default function UserManagement() {
  const { profile: currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  // Password change
  const [pwDialog, setPwDialog] = useState(null);   // profile object | null
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (profileId, newRole) => {
    setUpdatingId(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId);
      if (error) throw error;
      setProfiles(prev =>
        prev.map(p => p.id === profileId ? { ...p, role: newRole } : p)
      );
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteMessage(null);

    try {
      const res = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteFullName,
          role: inviteRole
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invite failed');

      setInviteMessage({ type: 'success', text: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');
      setInviteFullName('');
      setInviteRole('viewer');
      // Reload after a short delay so the new profile may have been created
      setTimeout(loadProfiles, 1500);
    } catch (err) {
      setInviteMessage({ type: 'error', text: err.message });
    } finally {
      setIsInviting(false);
    }
  };

  const openPwDialog = (profile) => {
    setPwDialog(profile);
    setNewPassword('');
    setConfirmPassword('');
    setPwMessage(null);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setIsUpdatingPassword(true);
    setPwMessage(null);
    try {
      if (pwDialog.id === currentUser?.id) {
        // Own account — use client-side auth
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } else {
        // Another user — admin function
        const res = await fetch('/.netlify/functions/reset-user-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: pwDialog.id, password: newPassword })
        });
        let json = {};
        try { json = await res.json(); } catch (_) {}
        if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
      }
      setPwMessage({ type: 'success', text: 'Password updated' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwDialog(null), 1500);
    } catch (err) {
      setPwMessage({ type: 'error', text: err.message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const roleBadgeClass = (role) => {
    if (role === 'admin') return 'bg-red-100 text-red-700';
    if (role === 'user')  return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-1">
            <Link
              to={createPageUrl('Stories')}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Users className="w-6 h-6 text-slate-600" />
            <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          </div>
          <p className="text-sm text-slate-500 ml-14">
            Invite team members and manage access levels
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Invite panel */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-600" />
            Invite User
          </h2>
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={inviteFullName}
                onChange={e => setInviteFullName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={isInviting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isInviting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Invite
              </button>
            </div>
          </form>
          {inviteMessage && (
            <p className={`mt-3 text-sm px-3 py-2 rounded-lg ${
              inviteMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {inviteMessage.text}
            </p>
          )}
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-slate-800">Team Members</h2>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Joined</th>
                  <th className="px-6 py-3 text-left">Change Role</th>
                  <th className="px-6 py-3 text-left">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{p.full_name || '—'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass(p.role)}`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {p.id === currentUser?.id ? (
                        <span className="text-xs text-slate-400 italic">You</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={p.role}
                            onChange={e => handleRoleChange(p.id, e.target.value)}
                            disabled={updatingId === p.id}
                            className="px-2 py-1 rounded border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                          {updatingId === p.id && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openPwDialog(p)}
                        title="Change password"
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {pwDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPwDialog(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800 mb-0.5">Change Password</h3>
            <p className="text-xs text-slate-500 mb-5">{pwDialog.full_name || pwDialog.email}</p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {pwMessage && (
                <p className={`text-sm px-3 py-2 rounded-lg ${
                  pwMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {pwMessage.text}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => setPwDialog(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
