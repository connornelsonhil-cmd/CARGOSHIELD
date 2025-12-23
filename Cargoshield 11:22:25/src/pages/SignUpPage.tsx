import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { supabase, UserType } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';

interface Invite {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  company_id: string;
  status: string;
  expires_at: string;
  invite_code: string;
}

interface Company {
  id: string;
  name: string;
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [error, setError] = useState('');
  
  const [inviteCode, setInviteCode] = useState('');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    password: '',
    company_id: '',
  });

  // Check URL for invite code on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('invite');
    if (code) {
      setInviteCode(code);
      validateInviteCode(code);
    }
  }, []);

  const validateInviteCode = async (code: string) => {
    if (!code) return;
    
    setValidatingInvite(true);
    setError('');

    try {
      // Fetch invite
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('invite_code', code)
        .eq('status', 'pending')
        .single();

      if (inviteError || !inviteData) {
        setError('Invalid or expired invite code');
        return;
      }

      // Check if invite is expired
      if (new Date(inviteData.expires_at) < new Date()) {
        setError('This invite has expired');
        return;
      }

      setInvite(inviteData);

      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', inviteData.company_id)
        .single();

      if (companyError || !companyData) {
        setError('Could not load company details');
        return;
      }

      setCompany(companyData);

      // Pre-fill form
      setFormData(prev => ({
        ...prev,
        name: inviteData.name || prev.name,
        email: inviteData.email,
        phone: inviteData.phone || prev.phone,
        company_id: inviteData.company_id,
      }));

    } catch (err) {
      setError('Failed to validate invite code');
    } finally {
      setValidatingInvite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Determine user role
      const role: UserType = invite?.role as UserType || 'dispatcher';

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            role: role,
            company_id: formData.company_id,
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          role: role,
          company_id: formData.company_id || null,
        });

      if (profileError) throw profileError;

      // If using invite, mark it as accepted
      if (invite) {
        await supabase
          .from('invites')
          .update({ status: 'accepted' })
          .eq('id', invite.id);
      }

      // Redirect based on role
      if (role === 'driver') {
        navigate('/onboarding/cdl');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {invite ? 'Complete Your Registration' : 'Create Account'}
          </h1>
          <p className="text-blue-200">
            {invite ? `Join ${company?.name || 'the team'}` : 'Get started with Cargo Shield'}
          </p>
        </div>

        {/* Invite Validation Loading */}
        {validatingInvite && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-200">Validating invite code...</span>
            </div>
          </div>
        )}

        {/* Invite Code Input (if no code in URL) */}
        {!invite && !validatingInvite && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/20">
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Have an invite code? (Optional)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="INVITE-CODE"
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => validateInviteCode(inviteCode)}
                disabled={!inviteCode}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Validate
              </button>
            </div>
          </div>
        )}

        {/* Success - Invite Validated */}
        {invite && company && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-200 font-medium">Invite verified!</p>
                <p className="text-green-300 text-sm mt-1">
                  You're joining <strong>{company.name}</strong> as a <strong>{invite.role}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20 space-y-6">
          
          {/* Email (disabled if from invite) */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              required
              disabled={!!invite}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Full Name</label>
            <input
              type="text"
              required
              disabled={!!invite && !!invite.name}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="John Doe"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Phone Number</label>
            <input
              type="tel"
              required
              disabled={!!invite && !!invite.phone}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-400 hover:text-blue-300 flex items-center justify-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
