import React, { useState } from 'react';
import { X, Key, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'change' | 'forgot';
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose, mode }) => {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { updatePassword, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccess('Password reset link has been sent to your email. Please check your inbox.');
        setTimeout(() => {
          setEmail('');
          onClose();
        }, 3000);
      } else {
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const { error } = await updatePassword(newPassword);
        if (error) throw error;
        setSuccess('Password updated successfully!');
        setTimeout(() => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {mode === 'forgot' ? (
              <>
                <Mail className="w-6 h-6 text-blue-600" />
                Forgot Password
              </>
            ) : (
              <>
                <Key className="w-6 h-6 text-blue-600" />
                Change Password
              </>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'forgot' && (
          <p className="text-sm text-slate-600 mb-4">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'forgot' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="username@filepino.com"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Must use @filepino.com email</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              'Processing...'
            ) : mode === 'forgot' ? (
              <>
                <Mail className="w-5 h-5" />
                Send Reset Link
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                Update Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
