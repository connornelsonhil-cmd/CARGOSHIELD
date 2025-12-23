import { Shield, Menu, X, Truck, List, Clock, LogOut, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { useAuth } from '../contexts/AuthContext';


export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();


 const handleSignOut = async () => {
  await signOut();
  navigate('/');
  setMobileMenuOpen(false);
};

const handleHomeClick = () => {
  // Always navigate to homepage, user remains logged in
  navigate('/');
  setMobileMenuOpen(false);
};

const handleNavigation = (path: string) => {
  navigate(path);
  setMobileMenuOpen(false);
};


  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
          <button 
     onClick={handleHomeClick}
     className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg px-2 py-1"
     aria-label="Go to homepage"
     type="button"
   >
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
                        onClick={() => setInviteModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Driver
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
                      onClick={() => {
                        setInviteModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Driver
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


{inviteModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={() => setInviteModalOpen(false)} />
        <div className="bg-white rounded-lg max-w-md w-full p-6 relative z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Invite Driver</h2>
            <button onClick={() => setInviteModalOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          <form className="space-y-4">
            <input 
              type="email" 
              placeholder="driver@example.com"
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </nav>
  );
}
