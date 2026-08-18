import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Calendar, FileText, Settings, Plus, Search, Download, 
  Trash2, Eye, LogOut, CheckCircle, RefreshCw, Lock, Key, ShieldAlert, ArrowRight
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

  // Real delegates state (No hardcoded mock data allowed)
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
      const { data, error } = await supabase.from('delegates').select('*').order('created_at', { ascending: false });
      if (!error && data) {
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
          registeredAt: new Date(d.created_at || Date.now()).toLocaleDateString()
        }));
        setDelegates(mapped);
        localStorage.setItem('confiqh_delegates', JSON.stringify(mapped));
      }
    } catch (err) {
      console.log('Supabase fetch note:', err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSupabaseDelegates();
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

  const handleDeleteDelegate = async (id) => {
    if (window.confirm(`Are you sure you want to remove delegate ${id}?`)) {
      setDelegates(delegates.filter(d => d.id !== id));
      try {
        await supabase.from('delegates').delete().eq('pass_id', id);
      } catch (err) {
        console.log('Supabase delete note:', err.message);
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
              <div className="flex items-center space-x-2 select-none">
                <span className="font-sans text-xl font-black text-white tracking-tight uppercase">
                  <span className="text-[#A1CF7F]">CON</span> FIQH
                </span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#354823] text-white uppercase tracking-wider">
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
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'delegates'
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
                    <th className="py-3.5 px-4">Birudam</th>
                    <th className="py-3.5 px-4">Status & Campus / Job</th>
                    <th className="py-3.5 px-4">Alfiyya & Fathul Mueen</th>
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
                        {d.studyRange}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        {d.birudam || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold text-[10px] uppercase mb-0.5">
                          {d.status}
                        </span>
                        <div className="text-[11px] text-gray-600 truncate max-w-[140px]">
                          {d.status === 'Student' ? d.campus : d.position}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-bold text-[10px]">
                          ✓ Studied
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteDelegate(d.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
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

    </div>
  );
}
