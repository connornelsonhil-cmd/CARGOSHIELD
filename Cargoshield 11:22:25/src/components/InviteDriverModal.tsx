import { useState, useEffect } from 'react';
import { X, Mail, Phone, Copy, Check, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface InviteDriverModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  companyId: string;
}

export default function InviteDriverModal({ onClose, onSuccess, companyId }: InviteDriverModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const generateInviteCode = () => {
    return 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const inviteCode = generateInviteCode();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: 'driver',
          company_id: companyId,
          invited_by: profile?.id,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/signup?invite=${inviteCode}`;
      setInviteLink(link);

      if (onSuccess) {
        onSuccess();
      }

    } catch (err: any) {
      console.error('Error creating invitation:', err);
      setError(err.message || 'Failed to create invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleClose = () => {
    setError('');
    setFormData({ name: '', email: '', phone: '' });
    setInviteLink('');
    setCopied(false);
    onClose();
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [loading, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-driver-title"
    >
      <div
        className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between rounded-t-xl">
          <h2 id="invite-driver-title" className="text-2xl font-bold text-white">
            {inviteLink ? 'Invitation Created!' : 'Invite Driver'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Driver Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600 transition-colors"
                placeholder="John Doe"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600 transition-colors"
                placeholder="driver@example.com"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                Driver will use this email to sign up
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600 transition-colors"
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
            </div>

            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 text-sm text-blue-300">
              <p className="font-medium mb-1">What happens next:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>You'll receive a unique invitation link</li>
                <li>Share the link with your driver via email/SMS</li>
                <li>Driver signs up using the link (valid for 7 days)</li>
                <li>They'll be added to your company automatically</li>
              </ol>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Create Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 text-center">
              <div className="text-5xl mb-2">✅</div>
              <p className="text-green-400 font-semibold">Invitation created successfully!</p>
              <p className="text-green-300 text-sm mt-1">
                Share this link with {formData.email}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Invitation Link (Valid for 7 days)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 text-sm text-blue-300">
              <p className="font-medium mb-2">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Copy the invitation link above</li>
                <li>Send it to {formData.email} via email or text</li>
                <li>They'll click the link and complete their registration</li>
                <li>Once verified, they'll appear in your drivers list</li>
              </ol>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-semibold"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
