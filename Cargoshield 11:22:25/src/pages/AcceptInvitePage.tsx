import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Loader, Mail, Phone, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const verifyInvite = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('invite') || params.get('token');

        if (!token) {
          setError('Invalid invitation link. No token provided.');
          setLoading(false);
          return;
        }

        console.log('Verifying invite token:', token);

        const { data: inviteData, error: inviteError } = await supabase
          .from('invites')
          .select('*')
          .eq('invite_code', token)
          .maybeSingle();

        if (inviteError) {
          console.error('Error fetching invite:', inviteError);
          setError('Failed to verify invitation. Please try again.');
          setLoading(false);
          return;
        }

        if (!inviteData) {
          setError('Invalid invitation link. This invitation does not exist.');
          setLoading(false);
          return;
        }

        if (inviteData.status === 'accepted') {
          setError('This invitation has already been accepted.');
          setLoading(false);
          return;
        }

        if (inviteData.status === 'expired' || inviteData.status === 'revoked') {
          setError('This invitation is no longer valid.');
          setLoading(false);
          return;
        }

        const expiresAt = new Date(inviteData.expires_at);
        if (expiresAt < new Date()) {
          await supabase
            .from('invites')
            .update({ status: 'expired' })
            .eq('id', inviteData.id);
          setError('This invitation has expired.');
          setLoading(false);
          return;
        }

        setInvite(inviteData);

        if (inviteData.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', inviteData.company_id)
            .maybeSingle();

          if (!companyError && companyData) {
            setCompany(companyData);
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error verifying invite:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    verifyInvite();
  }, []);

  const handleAccept = () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite') || params.get('token');
    navigate(`/signup?invite=${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No invitation found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-white">Cargo Shield</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 p-8 text-center border-b border-gray-800">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">You're Invited!</h1>
            <p className="text-gray-300 text-lg">
              Join {company?.name || 'a logistics company'} on Cargo Shield
            </p>
          </div>

          <div className="p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Invitation Details</h2>
                <div className="space-y-4">
                  {invite.name && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Driver Name</p>
                        <p className="text-white font-medium">{invite.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email Address</p>
                      <p className="text-white font-medium">{invite.email}</p>
                    </div>
                  </div>

                  {invite.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Phone Number</p>
                        <p className="text-white font-medium">{invite.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Company</p>
                      <p className="text-white font-medium">{company?.name || 'Loading...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">What happens next?</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-300">
                  <li>Click "Accept & Create Account" below</li>
                  <li>Complete your registration with a secure password</li>
                  <li>Upload your CDL document for verification</li>
                  <li>Start receiving and verifying load assignments</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold"
                >
                  Not Now
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Accept & Create Account
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            This invitation will expire on{' '}
            <span className="text-gray-400 font-medium">
              {new Date(invite.expires_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
