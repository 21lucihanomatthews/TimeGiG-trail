import React, { useState, useEffect } from 'react';
import { Shield, Users, ArrowRight, Link as LinkIcon, Copy, Gift, LogOut, Loader2, Wallet, UserCheck, Eye, MoreVertical, Coins, Upload, ArrowLeft, Plus, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

type Tab = 'admin' | 'referral' | 'wallet';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('admin');
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsersCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex space-x-8 h-full">
              <button
                onClick={() => setActiveTab('admin')}
                title="Admin"
                className={`inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Shield className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab('referral')}
                title="Referral Program"
                className={`inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'referral'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Gift className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab('wallet')}
                title="Wallet"
                className={`inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'wallet'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Wallet className="w-5 h-5" />
              </button>
            </div>
            <div>
              <button
                onClick={() => supabase.auth.signOut()}
                title="Sign Out"
                className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'admin' && <AdminView key="admin" onlineUsersCount={onlineUsersCount} />}
          {activeTab === 'referral' && <ReferralView key="referral" userId={session.user.id} />}
          {activeTab === 'wallet' && <WalletView key="wallet" userId={session.user.id} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AuthView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create an account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminView({ onlineUsersCount = 0 }: { onlineUsersCount?: number; key?: string }) {
  const [stats, setStats] = useState({ profit: 0, refProfit: 0, verifiedUsers: 0, totalOwed: 0, adminProfitAfterPayments: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [agentPayouts, setAgentPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [allTopups, setAllTopups] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllProofs, setShowAllProofs] = useState(false);
  const [showAllAgentPayouts, setShowAllAgentPayouts] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [profilesRes, topupsRes, referralsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('topups').select('*').order('created_at', { ascending: false }),
        supabase.from('referrals').select('*')
      ]);

      const profiles = profilesRes.data || [];
      const topups = topupsRes.data || [];
      const referrals = referralsRes.data || [];

      // Enrich topups
      const enrichedTopups = topups.map(pt => {
        const user = profiles.find(p => p.id === pt.user_id);
        return { ...pt, user_name: user?.name || user?.email || 'Unknown User' };
      });
      setAllTopups(enrichedTopups);
      
      const pending = enrichedTopups.filter(t => t.status === 'Pending');
      setPendingTopups(pending);

      let totalProfit = 0;
      topups.forEach(t => {
        if (t.status === 'Approved' || !t.status) {
          totalProfit += Number(t.amount);
        }
      });

      const enrichedUsers = profiles.map(p => {
        const userTopups = topups.filter(t => t.user_id === p.id && (t.status === 'Approved' || !t.status)).reduce((sum, t) => sum + Number(t.amount), 0);
        const userReferrals = referrals.filter(r => r.referrer_id === p.id).length;
        const isVerified = userTopups >= 20;
        return { ...p, status: isVerified ? 'Verified' : 'Active', totalTopups: userTopups, referralCount: userReferrals };
      });

      let totalOwedToAgents = 0;
      let refProfit = 0;

      const calculatedPayouts = enrichedUsers.map(p => {
        if (p.status !== 'Verified') {
          return { ...p, verifiedReferrals: 0, rewardStatus: 'Not Qualified', owedAmount: 0 };
        }
        
        const userReferrals = referrals.filter(r => r.referrer_id === p.id);
        let verifiedReferrals = 0;
        let commission = 0;
        
        userReferrals.forEach(r => {
          const rTopups = topups.filter(t => t.user_id === r.referred_id && (t.status === 'Approved' || !t.status)).reduce((sum, t) => sum + Number(t.amount), 0);
          if (rTopups >= 20) {
            verifiedReferrals++;
            commission += (rTopups * 0.5);
            refProfit += (rTopups * 0.5); // Admin logic backwards compatibility
          }
        });
        
        let owedAmount = 0;
        let rewardStatus = '';
        if (verifiedReferrals >= 15) {
          rewardStatus = 'Completed Program (15+)';
          owedAmount = 160; // 60 + 100
        } else if (verifiedReferrals >= 10) {
          rewardStatus = '10 Referrals Cashout';
          owedAmount = 60;
        } else if (verifiedReferrals > 0) {
          rewardStatus = '50% Commission';
          owedAmount = commission;
        } else {
          rewardStatus = 'No Verified Referrals';
          owedAmount = 0;
        }
        
        totalOwedToAgents += owedAmount;
        return { ...p, verifiedReferrals, rewardStatus, owedAmount };
      });

      const verifiedCount = enrichedUsers.filter(p => p.status === 'Verified').length;
      const adminProfitAfterPayments = totalProfit - totalOwedToAgents;

      setStats({
        profit: totalProfit,
        refProfit: refProfit,
        verifiedUsers: verifiedCount,
        totalOwed: totalOwedToAgents,
        adminProfitAfterPayments
      });

      setUsersList(enrichedUsers);
      setAgentPayouts(calculatedPayouts.filter(p => p.owedAmount > 0 || p.verifiedReferrals > 0));
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleReviewTopup = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      await supabase
        .from('topups')
        .update({ status: newStatus })
        .eq('id', id);
        
      setPendingTopups(prev => prev.filter(pt => pt.id !== id));
      setSelectedProof(null);
      fetchAdminData();
    } catch (err) {
      console.error('Failed to update topup status:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor live platform statistics and user activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[
          { title: 'Total Platform Revenue', value: `R ${stats.profit.toFixed(2)}`, icon: Wallet, color: 'text-gray-600', bg: 'bg-gray-100' },
          { title: 'Total Owed to Agents', value: `R ${stats.totalOwed.toFixed(2)}`, icon: Gift, color: 'text-red-600', bg: 'bg-red-100' },
          { title: 'Net Profit (After Payouts)', value: `R ${stats.adminProfitAfterPayments.toFixed(2)}`, icon: Wallet, color: 'text-green-600', bg: 'bg-green-100' },
          { title: 'Live Verified Active Users', value: stats.verifiedUsers.toString(), icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { title: 'Live Online Visits', value: onlineUsersCount.toString(), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-100' },
          { title: 'Commission Generated (50%)', value: `R ${stats.refProfit.toFixed(2)}`, icon: Coins, color: 'text-blue-600', bg: 'bg-blue-100' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                    <dd>
                      <div className="text-xl font-semibold text-gray-900 mt-1">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Topups Section */}
      {pendingTopups.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg border border-yellow-200 overflow-hidden mb-6">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 bg-yellow-50 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-yellow-900 flex items-center">
               <Wallet className="w-5 h-5 mr-2 text-yellow-600" /> Pending Topup Approvals ({pendingTopups.length})
            </h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
            {pendingTopups.map((pt, idx) => (
              <li key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pt.user_name}</p>
                  <p className="text-sm text-gray-500">Requested: R {Number(pt.amount).toFixed(2)} ({Number(pt.amount) * 100}c)</p>
                  <p className="text-xs text-gray-400">{new Date(pt.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedProof(pt)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Eye className="w-4 h-4 mr-2 text-gray-400" /> View Proof
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Topup History / All Proofs */}
      <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden mb-6">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
             <Wallet className="w-5 h-5 mr-2 text-gray-500" /> Payment Proofs
          </h3>
          <button onClick={() => setShowAllProofs(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500 flex items-center">
             View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allTopups.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No topups found</td></tr>
              ) : allTopups.map((topup, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{topup.user_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {Number(topup.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(topup.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      topup.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                      topup.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {topup.status || 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {topup.proof_url ? (
                      <button
                        onClick={() => setSelectedProof(topup)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md"
                      >
                        View Proof
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">No proof</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Review Modal */}
      <AnimatePresence>
        {selectedProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-black/50 text-white border-b border-white/10">
              <div>
                <h3 className="text-lg font-medium">Review Payment Proof</h3>
                <p className="text-sm text-gray-300">
                  {selectedProof.user_name} • R {Number(selectedProof.amount).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('proof-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5" />
                  <span className="absolute -bottom-8 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => setSelectedProof(null)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div id="proof-container" className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/90">
              {selectedProof.proof_url ? (
                selectedProof.proof_url.endsWith('.pdf') || selectedProof.proof_url.startsWith('data:application/pdf') ? (
                  <iframe src={selectedProof.proof_url} className="w-full max-w-4xl h-full bg-white rounded-lg" />
                ) : (
                  <img src={selectedProof.proof_url} alt="Proof of payment" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                )
              ) : (
                <div className="text-gray-400">No proof URL provided</div>
              )}
            </div>

            {selectedProof.status === 'Pending' && (
              <div className="p-6 bg-black/50 flex flex-col sm:flex-row justify-center items-center gap-4 border-t border-white/10">
                <button
                  onClick={() => handleReviewTopup(selectedProof.id, 'Rejected')}
                  className="w-full sm:w-auto px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg transition-colors flex justify-center items-center"
                >
                  Reject Payment
                </button>
                <button
                  onClick={() => handleReviewTopup(selectedProof.id, 'Approved')}
                  className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-lg transition-colors flex justify-center items-center"
                >
                  Approve & Credit Coins
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden mb-6">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-gray-500" /> Agent Payouts
          </h3>
          <button onClick={() => setShowAllAgentPayouts(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500 flex items-center">
             View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified Referrals</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Owed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentPayouts.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No agent payouts found</td></tr>
              ) : agentPayouts.map((agent, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.name || 'Unknown User'}</div>
                    <div className="text-sm text-gray-500">{agent.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.verifiedReferrals}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      agent.rewardStatus.includes('Completed') ? 'bg-purple-100 text-purple-800' : 
                      agent.rewardStatus.includes('Cashout') ? 'bg-green-100 text-green-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {agent.rewardStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    R {agent.owedAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Monitoring</h3>
          <button onClick={() => setShowAllUsers(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500 flex items-center">
             View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Topups</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : usersList.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No users found</td></tr>
              ) : usersList.map((user, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium uppercase">
                        {user.name ? user.name.charAt(0) : user.email?.charAt(0) || '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {user.totalTopups.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.referralCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-500">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Users Modal */}
      <AnimatePresence>
        {showAllUsers && (
          <motion.div
            id="all-users-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-gray-50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-white text-gray-900 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium">All Users</h3>
                <p className="text-sm text-gray-500">
                  {usersList.length} total users
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('all-users-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5 text-gray-600" />
                  <span className="absolute -bottom-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                    setShowAllUsers(false);
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Topups</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                  ) : usersList.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No users found</td></tr>
                  ) : usersList.map((user, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium uppercase">
                            {user.name ? user.name.charAt(0) : user.email?.charAt(0) || '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {user.totalTopups.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.referralCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-gray-400 hover:text-gray-500">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Proofs Modal */}
      <AnimatePresence>
        {showAllProofs && (
          <motion.div
            id="all-proofs-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-gray-50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-white text-gray-900 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium">Payment Proofs</h3>
                <p className="text-sm text-gray-500">
                  {allTopups.length} total proofs
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('all-proofs-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5 text-gray-600" />
                  <span className="absolute -bottom-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                    setShowAllProofs(false);
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allTopups.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No topups found</td></tr>
                  ) : allTopups.map((topup, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{topup.user_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {Number(topup.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(topup.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          topup.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                          topup.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {topup.status || 'Approved'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {topup.proof_url ? (
                          <button
                            onClick={() => setSelectedProof(topup)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md"
                          >
                            View Proof
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">No proof</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Agent Payouts Modal */}
      <AnimatePresence>
        {showAllAgentPayouts && (
          <motion.div
            id="all-agent-payouts-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-gray-50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-white text-gray-900 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium">Agent Payouts</h3>
                <p className="text-sm text-gray-500">
                  {agentPayouts.length} total payouts
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('all-agent-payouts-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5 text-gray-600" />
                  <span className="absolute -bottom-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                    setShowAllAgentPayouts(false);
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified Referrals</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Owed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agentPayouts.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No agent payouts found</td></tr>
                  ) : agentPayouts.map((agent, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{agent.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">{agent.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.verifiedReferrals}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agent.rewardStatus.includes('Completed') ? 'bg-purple-100 text-purple-800' : 
                          agent.rewardStatus.includes('Cashout') ? 'bg-green-100 text-green-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {agent.rewardStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        R {agent.owedAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReferralView({ userId }: { userId: string; key?: string }) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ verifiedCount: 0, pendingRewards: 0, isCurrentUserVerified: false });
  const [activity, setActivity] = useState<any[]>([]);
  const referralLink = `https://platform.example.com/ref/${userId.substring(0, 8)}`;

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        // Fetch referrals where this user is the referrer
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*, referred:profiles!referrals_referred_id_fkey(name, status)')
          .eq('referrer_id', userId);

        if (!referrals) return;

        // Fetch topups for all referred users AND the current user
        const referredIds = referrals.map(r => r.referred_id);
        const { data: topups } = await supabase
          .from('topups')
          .select('*')
          .in('user_id', [...referredIds, userId]);

        const topupsData = topups || [];
        
        // Check if current user is verified (has topped up >= 20)
        const currentUserTopups = topupsData.filter(t => t.user_id === userId && (t.status === 'Approved' || !t.status));
        const currentUserTotalTopups = currentUserTopups.reduce((sum, t) => sum + Number(t.amount), 0);
        const isCurrentUserVerified = currentUserTotalTopups >= 20;

        let verifiedCount = 0;
        let commissionRewards = 0;

        let enrichedActivity = referrals.map(r => {
          const userTopups = topupsData.filter(t => t.user_id === r.referred_id && (t.status === 'Approved' || !t.status));
          const totalTopups = userTopups.reduce((sum, t) => sum + Number(t.amount), 0);
          
          const isVerified = totalTopups >= 20;
          if (isVerified) verifiedCount++;

          const reward = totalTopups * 0.5;
          if (isVerified && isCurrentUserVerified) commissionRewards += reward;

          return {
            name: r.referred?.name || 'Unknown User',
            date: new Date(r.created_at).toLocaleDateString(),
            status: isVerified ? 'Completed' : 'Pending',
            reward: isVerified 
              ? (isCurrentUserVerified ? `+R ${(reward).toFixed(2)}` : 'Not Qualified') 
              : 'Pending Topup',
            rawReward: reward
          };
        });

        let pendingRewards = 0;
        if (isCurrentUserVerified) {
          if (verifiedCount >= 10) {
            // agent that cashout at 10 referrals dont qualify for 50% topups
            pendingRewards = 60; // 10 referrals milestone
            if (verifiedCount >= 15) pendingRewards += 100; // 15 referrals milestone
            
            // Update UI to show they don't get the commission anymore
            enrichedActivity = enrichedActivity.map(a => ({
              ...a,
              reward: a.status === 'Completed' ? 'Included in Cashout' : a.reward
            }));
          } else {
            pendingRewards = commissionRewards;
          }
        }

        setStats({ verifiedCount, pendingRewards, isCurrentUserVerified });
        setActivity(enrichedActivity);
      } catch (err) {
        console.error('Error fetching referral data:', err);
      }
    };
    fetchReferralData();
  }, [userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Referral Program</h1>
        <p className="mt-1 text-sm text-gray-500">Invite users and earn rewards for successful verified referrals with topups.</p>
      </div>

      {!stats.isCurrentUserVerified && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Attention:</strong> You must topup R20.00 and up to qualify as a verified user and earn rewards from your referrals.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Your Referral Link</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Share this link with your network. Earn bonuses based on verified signups and topups.</p>
              </div>
              <div className="mt-5 sm:flex sm:items-center">
                <div className="w-full relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="referral-link"
                    id="referral-link"
                    className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border bg-gray-50"
                    value={referralLink}
                    readOnly
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                    copied ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Verified Referrals: <strong className="text-gray-900">{stats.verifiedCount}</strong></span>
                <span className="text-gray-500 font-medium flex items-center">
                  Pending Rewards: 
                  <strong className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 ml-1.5 font-bold tracking-tight">
                    R {stats.pendingRewards.toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg border border-gray-100 p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
               <button 
                 className="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50" 
                 disabled={stats.verifiedCount < 10 || !stats.isCurrentUserVerified}
                 title={!stats.isCurrentUserVerified ? 'You must top up R20 to cashout' : stats.verifiedCount < 10 ? 'Reach 10 verified users to cashout' : 'Cashout now'}
               >
                 Cashout
               </button>
             </div>
             {activity.length === 0 ? (
               <div className="text-center py-6 text-gray-500 text-sm">
                 No referral activity yet. Share your link to get started!
               </div>
             ) : (
               <div className="flow-root">
                 <ul className="-mb-8">
                   {activity.map((event, eventIdx) => (
                     <li key={eventIdx}>
                       <div className="relative pb-8">
                         {eventIdx !== activity.length - 1 ? (
                           <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                         ) : null}
                         <div className="relative flex space-x-3">
                           <div>
                             <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${event.status === 'Completed' ? 'bg-green-500' : 'bg-gray-400'}`}>
                               <Users className="h-4 w-4 text-white" aria-hidden="true" />
                             </span>
                           </div>
                           <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                             <div>
                               <p className="text-sm text-gray-500">
                                 Referred <span className="font-medium text-gray-900">{event.name}</span>
                               </p>
                             </div>
                             <div className="text-right text-sm whitespace-nowrap text-gray-500">
                               <time dateTime={event.date}>{event.date}</time>
                               <p className={`font-medium mt-0.5 ${event.status === 'Completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                 {event.reward}
                               </p>
                             </div>
                           </div>
                         </div>
                       </div>
                     </li>
                   ))}
                 </ul>
               </div>
             )}
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg border border-gray-100 p-6 self-start">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-green-500" /> Reward Rules
          </h3>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <span className="text-green-600 font-bold text-xs">1</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">10 Verified Users</strong><br/>
                Reach 10 verified referrals with topups to unlock cashout and receive a <strong>R60.00</strong> bonus.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <span className="text-green-600 font-bold text-xs">2</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">15 Verified Users</strong><br/>
                Reach 15 verified referrals with topups to receive <strong>R100.00 weekly</strong>.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                <span className="text-blue-600 font-bold text-xs">%</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">50% Commission</strong><br/>
                Earn 50% commission on all topup amounts from your verified referrals.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

const COIN_OPTIONS = [
  { coins: 500, price: 5 },
  { coins: 1000, price: 10 },
  { coins: 2000, price: 20 },
  { coins: 3000, price: 30 },
  { coins: 4000, price: 40 },
  { coins: 5000, price: 50 },
  { coins: 6000, price: 60 },
  { coins: 8000, price: 80 },
  { coins: 10000, price: 100 },
];

function WalletView({ userId }: { userId: string; key?: string }) {
  const [view, setView] = useState<'overview' | 'topup' | 'payment'>('overview');
  const [selectedOption, setSelectedOption] = useState<{coins: number, price: number} | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    if (view === 'overview') {
      fetchWalletData();
    }
  }, [view, userId]);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('topups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const topups = data || [];
      const approvedTopups = topups.filter(t => t.status === 'Approved' || !t.status);
      const totalAmount = approvedTopups.reduce((sum, t) => sum + Number(t.amount), 0);
      setBalance(totalAmount * 100);
      setTransactions(topups);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedOption) return;

    setIsSubmitting(true);
    setReviewMessage('Uploading proof of payment...');
    
    try {
      let proofUrl = '';
      
      if (uploadFile.type.startsWith('image/')) {
        proofUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_SIZE = 1000;
              
              if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
      } else {
        // For PDFs or other files
        const reader = new FileReader();
        proofUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
      }

      setReviewMessage('Submitting topup request...');

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase.from('topups').insert({
        user_id: user.id,
        amount: selectedOption.price,
        status: 'Pending',
        proof_url: proofUrl
      });
      
      if (insertError) {
        console.error('Insert error:', insertError);
        setReviewMessage(`Database Error: Please run the SQL migration in your Supabase dashboard to add 'status' and 'proof_url' columns to the 'topups' table. Error: ${insertError.message}`);
        setIsSubmitting(false);
        return;
      }
      
      setReviewMessage('Your proof of payment has been submitted for review. Coins will be credited once approved.');
      
      setTimeout(() => {
        setReviewMessage('');
        setIsSubmitting(false);
        setUploadFile(null);
        setSelectedOption(null);
        setView('overview');
      }, 2500);
      
    } catch (err) {
      console.error('Failed to submit topup', err);
      setReviewMessage('Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (view === 'payment' && selectedOption) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-xl mx-auto space-y-6"
      >
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('topup')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Complete Payment</h1>
            <p className="mt-1 text-sm text-gray-500">Pay via bank transfer and upload proof.</p>
          </div>
        </div>

        {reviewMessage ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-6 rounded-lg text-center shadow-sm">
            <div className="flex justify-center mb-4"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            <p className="font-medium text-lg">{reviewMessage}</p>
            <p className="text-sm mt-2 text-blue-600">Redirecting to wallet...</p>
          </div>
        ) : (
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 sm:p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">Bank Details (Capitec)</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Account Name:</dt>
                    <dd className="font-medium text-gray-900">Matthews</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Account Number:</dt>
                    <dd className="font-medium text-gray-900 font-mono">1334067366</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Amount Due:</dt>
                    <dd className="font-medium text-gray-900">R {selectedOption.price.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <dt className="text-gray-900 font-medium">Reference:</dt>
                    <dd className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedOption.coins}c</dd>
                  </div>
                </dl>
                <p className="text-xs text-red-500 mt-3 font-medium">* Ensure you use exactly this reference so we can allocate your coins.</p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Proof of Payment</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-white">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>{uploadFile ? uploadFile.name : 'Upload a file'}</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!uploadFile || isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Payment for Review'}
                </button>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  if (view === 'topup') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('overview')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Topup Coins</h1>
            <p className="mt-1 text-sm text-gray-500">Select a coin package to purchase.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {COIN_OPTIONS.map((opt, idx) => (
            <div 
              key={idx} 
              onClick={() => {
                setSelectedOption(opt);
                setView('payment');
              }}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer overflow-hidden group"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <Coins className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{opt.coins}c</div>
                  <div className="text-sm font-medium text-gray-500 mt-1">For only</div>
                </div>
                <div className="text-xl font-bold text-green-600">
                  R {opt.price.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center text-sm font-medium text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                Select Package
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Wallet</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your coins and view transaction history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden text-center p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
              <Wallet className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Coin Balance</h2>
            <div className="mt-2 text-4xl font-extrabold text-gray-900 flex items-center justify-center">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : balance}
              {!loading && <span className="text-xl text-purple-500 ml-1">c</span>}
            </div>
            
            <button
              onClick={() => setView('topup')}
              className="mt-8 w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent shadow-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" /> Topup Coins
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No transactions yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                {transactions.map((t, idx) => (
                  <li key={idx} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 rounded-full p-2 ${
                          t.status === 'Pending' ? 'bg-yellow-100' : 
                          t.status === 'Rejected' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <Coins className={`h-5 w-5 ${
                            t.status === 'Pending' ? 'text-yellow-600' : 
                            t.status === 'Rejected' ? 'text-red-600' : 'text-green-600'
                          }`} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">Topup - {(Number(t.amount) * 100)}c</p>
                          <div className="flex items-center gap-2">
                             <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</p>
                             {t.status && (
                               <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  t.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 
                                  t.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                                  'bg-green-100 text-green-700'
                               }`}>
                                 {t.status}
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        R {Number(t.amount).toFixed(2)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
