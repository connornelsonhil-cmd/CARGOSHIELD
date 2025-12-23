import { useState, useEffect } from 'react';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Users,
  Package,
  CheckCircle,
  UserPlus,
  Truck,
  Briefcase,
  Box,
  Edit,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';

interface Company {
  id: string;
  name: string;
  company_type: string | null;
  mc_number: string | null;
  dot_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  user_type: string;
  phone: string;
  created_at: string;
}

interface LoadStats {
  total: number;
  completed: number;
  in_transit: number;
  verified: number;
}

export default function CompanyDetailsPage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadStats, setLoadStats] = useState<LoadStats>({
    total: 0,
    completed: 0,
    in_transit: 0,
    verified: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companyId = window.location.pathname.split('/').pop();
    if (companyId) {
      loadCompanyDetails(companyId);
    }
  }, []);

  const loadCompanyDetails = async (companyId: string) => {
    try {
      setLoading(true);
      console.log('✅ CompanyDetails: Loading company:', companyId);

      // Load company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      setCompany(companyData);

      // Load team members
      const { data: membersData, error: membersError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      setTeamMembers(membersData || []);

      // Load load stats
      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('status')
        .eq('company_id', companyId);

      if (loadsError) throw loadsError;

      const stats = {
        total: loadsData?.length || 0,
        completed: loadsData?.filter((l) => l.status === 'delivered').length || 0,
        in_transit: loadsData?.filter((l) => l.status === 'in_transit').length || 0,
        verified: loadsData?.filter((l) => l.status === 'verified' || l.status === 'at_pickup').length || 0,
      };

      setLoadStats(stats);

      console.log('✅ CompanyDetails: Loaded company details');
    } catch (err: any) {
      console.error('❌ CompanyDetails: Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'carrier':
        return <Truck className="w-5 h-5" />;
      case 'broker':
        return <Briefcase className="w-5 h-5" />;
      case 'shipper':
        return <Box className="w-5 h-5" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      driver: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      dispatcher: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
      admin: 'bg-red-600/20 text-red-400 border-red-600/30',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${colors[role as keyof typeof colors] || colors.driver}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const handleInviteDriver = () => {
    navigate('/admin/invites');
  };

  const handleInviteDispatcher = () => {
    navigate('/admin/invites');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Company Not Found</h3>
          <button
            onClick={() => navigate('/admin/companies')}
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Companies
          </button>
        </div>
      </div>
    );
  }

  const driverCount = teamMembers.filter((m) => m.user_type === 'driver').length;
  const dispatcherCount = teamMembers.filter((m) => m.user_type === 'dispatcher').length;
  const adminCount = teamMembers.filter((m) => m.user_type === 'admin').length;

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/companies')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Companies
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-900/30 rounded-xl flex items-center justify-center">
                {getTypeIcon(company.company_type)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{company.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 capitalize">{company.company_type || 'Not specified'}</span>
                  {company.status === 'active' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600/20 text-green-400 border border-green-600/30">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-gray-400">Total Members</h3>
            </div>
            <p className="text-3xl font-bold text-white">{teamMembers.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {driverCount} drivers, {dispatcherCount} dispatchers
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-medium text-gray-400">Total Loads</h3>
            </div>
            <p className="text-3xl font-bold text-white">{loadStats.total}</p>
            <p className="text-xs text-gray-500 mt-1">{loadStats.completed} completed</p>
          </div>

          <div className="bg-gray-900 border border-blue-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-gray-400">In Transit</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{loadStats.in_transit}</p>
          </div>

          <div className="bg-gray-900 border border-green-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-medium text-gray-400">Verified</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{loadStats.verified}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Company Information</h2>

              <div className="space-y-4">
                {company.mc_number && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">MC Number</div>
                    <div className="text-white font-mono">{company.mc_number}</div>
                  </div>
                )}

                {company.dot_number && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">DOT Number</div>
                    <div className="text-white font-mono">{company.dot_number}</div>
                  </div>
                )}

                {company.contact_email && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Contact Email</div>
                    <div className="flex items-center gap-2 text-white">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {company.contact_email}
                    </div>
                  </div>
                )}

                {company.contact_phone && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Contact Phone</div>
                    <div className="flex items-center gap-2 text-white">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {company.contact_phone}
                    </div>
                  </div>
                )}

                {company.address && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Address</div>
                    <div className="flex items-start gap-2 text-white">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      <span>{company.address}</span>
                    </div>
                  </div>
                )}

                {!company.mc_number && !company.dot_number && !company.contact_email && !company.contact_phone && !company.address && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No additional information available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-xl">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Team Members</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleInviteDriver}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Driver
                  </button>
                  <button
                    onClick={handleInviteDispatcher}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Dispatcher
                  </button>
                </div>
              </div>

              {teamMembers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Team Members</h3>
                  <p className="text-gray-400 mb-6">Start inviting drivers and dispatchers</p>
                  <button
                    onClick={handleInviteDriver}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Invite First Member
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-800/50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-white">{member.name}</div>
                              <div className="text-xs text-gray-400">{member.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRoleBadge(member.user_type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{member.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">
                              {new Date(member.created_at).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
