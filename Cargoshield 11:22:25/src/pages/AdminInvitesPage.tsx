import { Shield, Menu, X, Truck, List, Clock, LogOut, Mail, Building2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    // Navigate to dashboard if user is logged in, otherwise go to home
    if (user && profile) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={handleLogoClick} className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-white">Cargo Shield</span>
            </button>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-6">
              {user && profile ? (
                <>
                  {profile.role === 'driver' && (
                    <>
                      <button
                        onClick={() => handleNavigation('/driver/dashboard')}
                        className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Truck className="w-4 h-4" />
                        My Loads
                      </button>
                      <button
                        onClick={() => handleNavigation('/driver/history')}
                        className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        History
                      </button>
                    </>
                  )}

                  {(profile.role === 'dispatcher' || profile.role === 'admin') && (
                    <>
                      <button
                        onClick={() => handleNavigation('/dashboard')}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => handleNavigation('/loads/manage')}
                        className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <List className="w-4 h-4" />
                        Manage Loads
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/companies')}
                        className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Building2 className="w-4 h-4" />
                        Companies
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/invites')}
                        className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Team Invites
                      </button>
                    </>
                  )}

                  <div className="text-gray-400 text-sm border-l border-gray-700 pl-6">
                    {profile.name}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigation('/login')}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavigation('/signup')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="px-4 py-3 space-y-3">
            {user && profile ? (
              <>
                {profile.role === 'driver' && (
                  <>
                    <button
                      onClick={() => handleNavigation('/driver/dashboard')}
                      className="w-full text-left text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      My Loads
                    </button>
                    <button
                      onClick={() => handleNavigation('/driver/history')}
                      className="w-full text-left text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      History
                    </button>
                  </>
                )}

                {(profile.role === 'dispatcher' || profile.role === 'admin') && (
                  <>
                    <button
                      onClick={() => handleNavigation('/dashboard')}
                      className="w-full text-left text-gray-300 hover:text-white transition-colors"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => handleNavigation('/loads/manage')}
                      className="w-full text-left text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <List className="w-4 h-4" />
                      Manage Loads
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/companies')}
                      className="w-full text-left text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      Companies
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/invites')}
                      className="w-full text-left text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Team Invites
                    </button>
                  </>
                )}

                <div className="text-gray-400 text-sm border-t border-gray-700 pt-3">
                  {profile.name}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavigation('/login')}
                  className="w-full text-left text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavigation('/signup')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
