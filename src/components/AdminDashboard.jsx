import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Calendar, FileText, Settings, Plus, Search, Download,
  Trash2, Eye, LogOut, CheckCircle, RefreshCw, Lock, Key, ShieldAlert, ArrowRight, X
} from 'lucide-react';

export default function AdminDashboard({ onReturnToPublic, sessionsData, setSessionsData }) {
  // Check if session is already authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('confiqh_admin_auth') === 'true';
  });

  // Login form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState('delegates');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudyRange, setFilterStudyRange] = useState('All');
  const [loading, setLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);

  // Modal to inspect delegate payment receipt screenshot
  const [viewReceiptModal, setViewReceiptModal] = useState(null);

  // Real delegates state - Primary source: Supabase Database
  const [delegates, setDelegates] = useState(() => {
    const saved = localStorage.getItem('confiqh_delegates');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username.trim() === 'confiqh' && password === 'confiqh123') {
      sessionStorage.setItem('confiqh_admin_auth', 'true');
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('confiqh_admin_auth');
    setIsAuthenticated(false);
    onReturnToPublic();
  };

  const fetchSupabaseDelegates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delegates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase DB fetch error:', error.message);
        setDbConnected(false);
        const saved = localStorage.getItem('confiqh_delegates');
        if (saved) setDelegates(JSON.parse(saved));
      } else if (data) {
        setDbConnected(true);
        const mapped = data.map(d => ({
          id: d.pass_id || d.id,
          fullName: d.full_name,
          age: d.age,
          address: d.address,
          phone: d.phone,
          whatsapp: d.whatsapp,
          studyRange: d.study_range,
          birudam: d.birudam,
          status: d.status,
          campus: d.campus,
          position: d.position,
          studiedAlfiyyaAndFathulMueen: d.studied_alfiyya,
          paymentScreenshot: d.payment_screenshot || d.paymentScreenshot || null,
          paymentStatus: d.payment_status || d.paymentStatus || 'Paid (₹200)',
          registeredAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : new Date().toLocaleDateString()
        }));
        setDelegates(mapped);
        try {
          localStorage.setItem('confiqh_delegates', JSON.stringify(mapped));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Supabase connection exception:', err.message);
      setDbConnected(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSupabaseDelegates();

      // Real-time Postgres database subscription for instant table updates
      const channel = supabase
        .channel('public:delegates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'delegates' },
          (payload) => {
            console.log('Real-time database payload received:', payload);
            fetchSupabaseDelegates();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const filteredDelegates = delegates.filter(d => {
    const matchesSearch = d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRange = filterStudyRange === 'All' || d.studyRange === filterStudyRange;
    return matchesSearch && matchesRange;
  });

  const handleExportCSV = () => {
    const headers = [
      "Pass ID", "Full Name", "Age", "Address", "Phone No", "WhatsApp No",
      "Study Range", "Birudam", "Status", "Campus / Position", "Alfiyya & Fathul Mueen Studied", "Registration Date"
    ];
    const rows = delegates.map(d => [
      d.id, `"${d.fullName}"`, d.age, `"${d.address}"`, d.phone, d.whatsapp,
      d.studyRange, `"${d.birudam}"`, d.status, `"${d.status === 'Student' ? d.campus : d.position}"`,
      d.studiedAlfiyyaAndFathulMueen ? "Yes" : "No", d.registeredAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "conFiqh_2026_Delegates_Supabase.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDelegate = async (targetId) => {
    if (!targetId) return;

    if (window.confirm(`Are you sure you want to delete delegate ${targetId}?`)) {
      // 1. Immediately remove from React state (Instant UI delete)
      setDelegates((prevDelegates) => {
        const updated = prevDelegates.filter((d) => d.id !== targetId && d.pass_id !== targetId);
        // 2. Immediately sync with LocalStorage cache so it stays deleted on refresh
        try {
          localStorage.setItem('confiqh_delegates', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage update warning:', e);
        }
        return updated;
      });

      // 3. Delete from Supabase database cleanly
      try {
        let error = null;

        // Try deleting by pass_id first
        const res1 = await supabase
          .from('delegates')
          .delete()
          .eq('pass_id', targetId);

        error = res1.error;

        // If pass_id delete failed or didn't match, try deleting by numeric/uuid id
        if (error || (res1.count !== null && res1.count === 0)) {
          const res2 = await supabase
            .from('delegates')
            .delete()
            .eq('id', targetId);
          error = res2.error;
        }

        if (error) {
          console.error('Supabase DB delete error:', error.message);
        } else {
          console.log(`Successfully deleted ${targetId} from Supabase DB and UI.`);
        }
      } catch (err) {
        console.error('Supabase delete exception:', err.message);
      }
    }
  };

  // IF NOT AUTHENTICATED: Render Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#17472B] flex items-center justify-center p-4 relative overflow-hidden font-sans">

        {/* Subtle background overlay */}
        <div className="absolute inset-0 opacity-10 bg-islamic-pattern pointer-events-none" />

        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative z-10 border border-[#354823]">

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#17472B] text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl font-black text-[#17472B]">
              Secretariat Portal
            </h2>
            <p className="text-xs font-bold text-[#387B52] mt-1">
              conFiqh 2026 • Authorized Access Only
            </p>
          </div>

          {loginError && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-200 text-xs font-bold mb-5 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <span>Invalid username or password. Please try again.</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#17472B] hover:bg-[#20603B] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Login to Secretariat Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onReturnToPublic}
              className="text-xs font-bold text-gray-500 hover:text-[#17472B] transition-colors"
            >
              ← Back to Public Website
            </button>
          </div>

        </div>

      </div>
    );
  }

  // IF AUTHENTICATED: Render Full Secretariat Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col font-sans">

      {/* Admin Header */}
      <header className="bg-[#17472B] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2.5 select-none">
                <span className="font-sans text-xl font-black text-white tracking-tight uppercase">
                  <span className="text-[#A1CF7F]">CON</span> FIQH
                </span>
                <span className="inline-block px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-black bg-[#354823] text-white uppercase tracking-wider shadow-xs">
                  1ST EDITION
                </span>
              </div>
              <span className="text-xs font-bold text-[#A1CF7F] border-l border-emerald-700 pl-3">
                Secretariat Admin
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchSupabaseDelegates}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                title="Refresh Supabase Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={onReturnToPublic}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>View Website</span>
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-600/80 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                title="Logout Secretariat Portal"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">

        {/* Nav Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-8">
          <button
            onClick={() => setActiveTab('delegates')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'delegates'
              ? 'bg-[#17472B] text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Delegates Database ({delegates.length})</span>
          </button>
        </div>

        {/* Delegates Table */}
        <div className="space-y-6">

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, phone, pass ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 text-xs font-medium outline-none"
                />
              </div>

              <select
                value={filterStudyRange}
                onChange={(e) => setFilterStudyRange(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white outline-none"
              >
                <option value="All">All Study Ranges</option>
                <option value="Mukhtasar">Mukhtasar</option>
                <option value="Muthawwal">Muthawwal</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="bg-[#17472B] hover:bg-[#20603B] text-white px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Database CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    <th className="py-3.5 px-4">Pass ID</th>
                    <th className="py-3.5 px-4">Name & Age</th>
                    <th className="py-3.5 px-4">Phone & WhatsApp</th>
                    <th className="py-3.5 px-4">Study Range</th>
                    <th className="py-3.5 px-4">Payment (₹200)</th>
                    <th className="py-3.5 px-4">Status & Campus / Job</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium">
                  {filteredDelegates.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#17472B]">
                        {d.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{d.fullName} ({d.age} yrs)</div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[150px]">{d.address}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div>Ph: {d.phone}</div>
                        <div className="text-[11px] text-emerald-700 font-bold">WA: {d.whatsapp}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#17472B]">
                        <div>{d.studyRange}</div>
                        <div className="text-[11px] text-gray-500 font-normal">{d.birudam || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase mb-1">
                          Paid ₹200 ✓
                        </span>
                        {d.paymentScreenshot ? (
                          <div className="flex items-center gap-2 mt-1">
                            <img 
                              src={d.paymentScreenshot} 
                              alt={`Receipt thumbnail for ${d.fullName}`}
                              className="w-9 h-9 rounded-lg border-2 border-emerald-400 object-cover cursor-pointer shadow-xs hover:scale-110 transition-transform shrink-0"
                              onClick={() => setViewReceiptModal(d)}
                              title="Click to view full payment receipt screenshot"
                            />
                            <button
                              onClick={() => setViewReceiptModal(d)}
                              className="text-[11px] text-[#17472B] hover:underline font-extrabold flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-700" />
                              <span>View Full Screenshot</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 font-medium italic">No image attached</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold text-[10px] uppercase mb-0.5">
                          {d.status}
                        </span>
                        <div className="text-[11px] text-gray-600 truncate max-w-[140px]">
                          {d.status === 'Student' ? d.campus : d.position}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteDelegate(d.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                          title="Delete Delegate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDelegates.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-500 font-semibold">
                        No delegates registered yet. Real registrations submitted on the website sync here automatically via Supabase!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Payment Receipt Screenshot Modal for Secretariat Verification */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-200">
            <button
              onClick={() => setViewReceiptModal(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">
                  Payment Receipt Verification
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Delegate: <strong>{viewReceiptModal.fullName}</strong> ({viewReceiptModal.id}) • Fee: <strong>₹200</strong>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 text-center">
              {viewReceiptModal.paymentScreenshot ? (
                <img 
                  src={viewReceiptModal.paymentScreenshot} 
                  alt={`Payment Screenshot for ${viewReceiptModal.fullName}`}
                  className="max-h-[60vh] w-auto mx-auto rounded-xl object-contain shadow-md"
                />
              ) : (
                <div className="py-12 text-gray-400 text-sm font-semibold">
                  No payment screenshot uploaded for this delegate.
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewReceiptModal(null)}
                className="bg-[#17472B] hover:bg-[#20603B] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
