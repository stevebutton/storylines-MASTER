import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { ArrowLeft, UserCircle, Mail, Lock, LogOut, Loader2, Check } from 'lucide-react';

const ROLE_LABELS = {
  admin:  { label: 'Admin',  className: 'bg-red-100 text-red-700' },
  user:   { label: 'User',   className: 'bg-blue-100 text-blue-700' },
  viewer: { label: 'Viewer', className: 'bg-slate-100 text-slate-600' },
};

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-slate-50">
        <Icon className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

function SaveButton({ onClick, isSaving, label = 'Save changes' }) {
  return (
    <button
      onClick={onClick}
      disabled={isSaving}
      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      {isSaving ? 'Saving…' : label}
    </button>
  );
}

export default function Account() {
  const { profile, logout } = useAuth();

  // Name
  const [fullName, setFullName]     = useState(profile?.full_name || '');
  const [savingName, setSavingName] = useState(false);

  // Email
  const [email, setEmail]           = useState(profile?.email || '');
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [savingPassword, setSavingPassword]     = useState(false);

  const handleSaveName = async () => {
    if (!fullName.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id);
    if (error) toast.error('Failed to update name');
    else       toast.success('Name updated — takes effect on next sign in');
    setSavingName(false);
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || email === profile?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) {
      toast.error('Failed to update email: ' + error.message);
    } else {
      await supabase.from('profiles').update({ email: email.trim() }).eq('id', profile.id);
      toast.success('Confirmation sent to your new email address');
    }
    setSavingEmail(false);
  };

  const handleSavePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error('Failed to update password: ' + error.message);
    else {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  };

  const role = profile?.role || 'viewer';
  const roleStyle = ROLE_LABELS[role] || ROLE_LABELS.viewer;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Stories')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <UserCircle className="w-5 h-5 text-slate-500" />
            <h1 className="text-lg font-semibold text-slate-800">My Account</h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Profile overview */}
        <div className="bg-white rounded-xl border shadow-sm px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-700 text-xl font-semibold">
              {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-lg leading-tight">
              {profile?.full_name || 'No name set'}
            </p>
            <p className="text-slate-500 text-sm mt-0.5">{profile?.email}</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${roleStyle.className}`}>
              {roleStyle.label}
            </span>
          </div>
        </div>

        {/* Display name */}
        <Section icon={UserCircle} title="Display Name">
          <div className="space-y-4">
            <Field label="Full name" hint="This name appears in the project header and welcome message.">
              <TextInput value={fullName} onChange={setFullName} placeholder="Your full name" />
            </Field>
            <SaveButton onClick={handleSaveName} isSaving={savingName} />
          </div>
        </Section>

        {/* Email */}
        <Section icon={Mail} title="Email Address">
          <div className="space-y-4">
            <Field
              label="Email"
              hint="A confirmation link will be sent to your new address. Your current email stays active until confirmed."
            >
              <TextInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            </Field>
            <SaveButton
              onClick={handleSaveEmail}
              isSaving={savingEmail}
              label="Update email"
            />
          </div>
        </Section>

        {/* Password */}
        <Section icon={Lock} title="Password">
          <div className="space-y-4">
            <Field label="New password" hint="Minimum 8 characters.">
              <TextInput
                type="password" value={newPassword} onChange={setNewPassword}
                placeholder="New password"
              />
            </Field>
            <Field label="Confirm new password">
              <TextInput
                type="password" value={confirmPassword} onChange={setConfirmPassword}
                placeholder="Repeat new password"
              />
            </Field>
            <SaveButton
              onClick={handleSavePassword}
              isSaving={savingPassword}
              label="Update password"
            />
          </div>
        </Section>

      </div>
    </div>
  );
}
