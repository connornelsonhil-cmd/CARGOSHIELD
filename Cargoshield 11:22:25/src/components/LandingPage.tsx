import { Shield, CheckCircle, Clock, Users, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';

export default function LandingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      if (profile?.user_type === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/signup');
    }
  };

  const handleWatchDemo = () => {
    if (user) {
      if (profile?.user_type === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 rounded-full px-4 py-2 mb-8">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">Trusted by 500+ logistics companies</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Stop fake drivers.
            <br />
            <span className="text-blue-600">Verify identity at pickup.</span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Cargo Shield prevents cargo theft by verifying the driver's face at pickup before unlocking load details. Real-time protection for your valuable shipments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg shadow-blue-600/20"
            >
              {user ? 'Go to Dashboard' : 'Start Free Trial'}
            </button>
            {!user && (
              <button
                onClick={handleWatchDemo}
                className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors border border-gray-700"
              >
                Watch Demo
              </button>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16 border-t border-b border-gray-800">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">98%</div>
            <div className="text-gray-400">Theft Reduction</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">&lt;30s</div>
            <div className="text-gray-400">Verification Time</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
            <div className="text-gray-400">Real-time Protection</div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How Cargo Shield Protects Your Shipments
            </h2>
            <p className="text-xl text-gray-400">
              Three layers of security at every pickup
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-blue-600/50 transition-colors">
              <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Face Verification</h3>
              <p className="text-gray-400">
                Drivers must verify their identity with a live selfie that matches their profile before accessing load details.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-blue-600/50 transition-colors">
              <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Real-Time Alerts</h3>
              <p className="text-gray-400">
                Get instant notifications if verification fails or if suspicious activity is detected at pickup locations.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-blue-600/50 transition-colors">
              <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Complete Audit Trail</h3>
              <p className="text-gray-400">
                Track every verification with timestamped records, GPS location, and photo evidence for compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Problem Section */}
        <div className="py-20 bg-gradient-to-b from-transparent to-gray-900/50 rounded-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-full px-4 py-2 mb-6">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400 font-medium">Cargo theft costs $15-35 billion annually</span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-6">
              The Problem: Fake Driver IDs
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Criminals use fake or stolen driver credentials to pick up legitimate loads. Traditional paper-based systems can't detect imposters until it's too late.
            </p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-left">
              <p className="text-gray-300 italic">
                "We lost $2.3M in electronics before implementing Cargo Shield. Now every driver is verified in real-time. Zero incidents in 18 months."
              </p>
              <div className="mt-4 text-sm text-gray-400">
                — Marcus Johnson, Security Director at TransLogix
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to eliminate cargo theft?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Join 500+ logistics companies protecting their shipments with Cargo Shield
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg shadow-blue-600/20"
          >
            {user ? 'Go to Dashboard' : 'Start Your Free Trial'}
          </button>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Shield className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-white">Cargo Shield</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 Cargo Shield. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
