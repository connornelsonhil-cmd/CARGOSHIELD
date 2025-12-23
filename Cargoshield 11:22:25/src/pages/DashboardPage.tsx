import { Shield, LogOut, User, Building2, FileText, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useEffect, useState } from 'react';
import InviteDriverModal from '../components/InviteDriverModal';

export default function DashboardPage() {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (!loading && profile?.role === 'driver') {
      navigate('/driver/dashboard');
    }
  }, [loading, profile, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profile?.role === 'driver') {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-950">
        <div className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Shield className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-white">Cargo Shield</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Welcome back, {profile?.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Profile</h2>
                  <p className="text-sm text-gray-400">Your account details</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-white font-medium">{profile?.name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-medium">{profile?.email || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="text-white font-medium">{profile?.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Role</p>
                  <p className="text-white font-medium capitalize">{profile?.role || 'Not set'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
                  <p className="text-sm text-gray-400">Get started</p>
                </div>
              </div>
              <div className="space-y-3">
                {profile?.role === 'driver' && (
                  <>
                    <button
                      onClick={() => navigate('/loads/verify')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Verify Load
                    </button>
                    <button
                      onClick={() => navigate('/onboarding/cdl')}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Upload CDL
                    </button>
                  </>
                )}
                {(profile?.role === 'dispatcher' || profile?.role === 'admin') && profile?.role !== 'driver' && (
                  <>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Invite Driver
                    </button>
                    <button
                      onClick={() => navigate('/loads/manage')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Manage Loads
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 rounded-xl p-8">
            <div className="text-center mb-6">
              <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Cargo Shield</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">You're now protected by real-time driver verification. Start verifying drivers at pickup to prevent cargo theft.</p>
            </div>
          </div>

          {profile?.role !== 'driver' ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-2xl mx-auto mt-8">
              <h3 className="text-lg font-semibold text-white mb-3">Driver Workflow:</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">1.</span>
                  <span>Upload your CDL document with face photo for onboarding</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">2.</span>
                  <span>View assigned loads and click "Verify Load"</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">3.</span>
                  <span>Navigate to pickup location (within 500ft)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">4.</span>
                  <span>Complete face verification to unlock load details</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-2xl mx-auto mt-8">
              <h3 className="text-lg font-semibold text-white mb-3">Dispatcher Workflow:</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">1.</span>
                  <span>Click "Invite Driver" to send invitation links to new drivers</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">2.</span>
                  <span>Click "Manage Loads" to view all loads in your company</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">3.</span>
                  <span>Assign drivers to pending loads</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-semibold">4.</span>
                  <span>Monitor verification status and load progress</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Driver Modal */}
      {showInviteModal && (
        <InviteDriverModal
          onClose={() => setShowInviteModal(false)}
          companyId={profile?.company_id || ''}
        />
      )}
    </>
  );
}
