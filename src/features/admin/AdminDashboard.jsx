import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, Calendar, FileText, Settings, Plus, Search, Download, Printer, ExternalLink,
  Trash2, Eye, LogOut, CheckCircle, RefreshCw, Lock, Key, ShieldAlert, ArrowRight, X, Edit3, Image as ImageIcon, Sparkles, Tag, Upload, BookOpen, Layers,
  Phone, Building2, Check
} from 'lucide-react';

export default function AdminDashboard({ onReturnToPublic, sessionsData = [], setSessionsData, tracksData = [], setTracksData }) {
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
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('All');
  const [loading, setLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);

  // Modal to inspect delegate payment receipt screenshot
  const [viewReceiptModal, setViewReceiptModal] = useState(null);
  // Modal to preview & print individual delegate badge
  const [printBadgeModal, setPrintBadgeModal] = useState(null);
  // In-app Delete Confirmation Modal (fixes mobile window.confirm blocking)
  const [deleteConfirmDelegate, setDeleteConfirmDelegate] = useState(null);

  // Local storage helpers to guarantee status persistence across page refreshes
  const getLocalStatusOverrides = () => {
    try {
      const stored = localStorage.getItem('confiqh_delegate_status_overrides');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  };

  const setLocalStatusOverride = (id, status) => {
    try {
      const overrides = getLocalStatusOverrides();
      overrides[id] = status;
      localStorage.setItem('confiqh_delegate_status_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.error('Error saving local status override:', e);
    }
  };

  // Helper to generate pre-filled WhatsApp message with working cross-platform icons & emojis
  const getWhatsAppUrl = (d) => {
    const cleanNumber = (d.whatsapp || d.phone || '').replace(/\D/g, '');
    const statusFormatted = (d.paymentStatus === 'PAID' || d.paymentStatus === 'Paid (₹200)') 
      ? '🟢 *PAID (₹200)*' 
      : (d.paymentStatus === 'REJECTED') 
      ? '🔴 *REJECTED*' 
      : '🟡 *PENDING VERIFICATION*';
    
    const message = 
`*CONFIQ 2026* | Keralam Fiqh Summit
━━━━━━━━━━━━━━━━━━━━
Assalamu Alaikum *${d.fullName}*,

Regarding your summit delegate registration:

🎟 *Pass ID:* ${d.id}
💳 *Payment Status:* ${statusFormatted}
📍 *Venue:* Ahlussuffa Dars, Parapram, Pinarayi
📅 *Date:* September 11–12, 2026
━━━━━━━━━━━━━━━━━━━━
*Ahlussuffa • CONFIQ 2026*`;

    return `https://api.whatsapp.com/send?phone=91${cleanNumber}&text=${encodeURIComponent(message)}`;
  };

  const handleApprovePayment = async (targetId) => {
    if (!targetId) return;
    if (!window.confirm(`Approve payment and mark delegate ${targetId} as PAID?`)) return;

    // Immediately persist approval to localStorage
    setLocalStatusOverride(targetId, 'PAID');

    setDelegates((prev) =>
      prev.map((d) => (d.id === targetId ? { ...d, paymentStatus: 'PAID' } : d))
    );

    try {
      const res1 = await supabase
        .from('delegates')
        .update({
          payment_status: 'PAID',
          verified_at: new Date().toISOString()
        })
        .eq('pass_id', targetId);

      if (res1.error) {
        await supabase
          .from('delegates')
          .update({
            payment_status: 'PAID',
            verified_at: new Date().toISOString()
          })
          .eq('id', targetId);
      }
    } catch (err) {
      console.error('Supabase approve payment exception:', err.message);
    }
  };

  const handleRejectPayment = async (targetId) => {
    if (!targetId) return;
    const reason = window.prompt('Enter rejection reason (optional):', 'Invalid UTR or payment not received');
    if (reason === null) return;

    // Immediately persist rejection to localStorage
    setLocalStatusOverride(targetId, 'REJECTED');

    setDelegates((prev) =>
      prev.map((d) => (d.id === targetId ? { ...d, paymentStatus: 'REJECTED' } : d))
    );

    try {
      const res1 = await supabase
        .from('delegates')
        .update({
          payment_status: 'REJECTED',
          rejection_reason: reason
        })
        .eq('pass_id', targetId);

      if (res1.error) {
        await supabase
          .from('delegates')
          .update({
            payment_status: 'REJECTED',
            rejection_reason: reason
          })
          .eq('id', targetId);
      }
    } catch (err) {
      console.error('Supabase reject payment exception:', err.message);
    }
  };

  // Real delegates state - Source: Supabase Database ONLY
  const [delegates, setDelegates] = useState([]);

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
      } else if (data) {
        setDbConnected(true);
        const overrides = getLocalStatusOverrides();
        const mapped = data.map(d => {
          const id = d.pass_id || d.id;
          const localStatus = overrides[id];
          return {
            id: id,
            fullName: d.full_name,
            age: d.age,
            address: d.address,
            phone: d.phone,
            whatsapp: d.whatsapp,
            studyRange: d.study_range,
            sanad: d.sanad || d.birudam || 'N/A',
            birudam: d.sanad || d.birudam || 'N/A',
            status: d.status,
            campus: d.campus,
            position: d.position,
            studiedAlfiyyaAndFathulMueen: d.studied_alfiyya,
            utrNumber: d.utr_number || d.utrNumber || 'N/A',
            paymentScreenshot: d.payment_screenshot || d.paymentScreenshot || null,
            paymentStatus: localStatus || d.payment_status || d.paymentStatus || 'PENDING_VERIFICATION',
            registeredAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : new Date().toLocaleDateString()
          };
        });
        setDelegates(mapped);
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
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.utrNumber && d.utrNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRange = filterStudyRange === 'All' || d.studyRange === filterStudyRange;
    const matchesStatus = filterPaymentStatus === 'All' || 
      (filterPaymentStatus === 'PENDING_VERIFICATION' && d.paymentStatus === 'PENDING_VERIFICATION') ||
      (filterPaymentStatus === 'PAID' && (d.paymentStatus === 'PAID' || d.paymentStatus === 'Paid (₹200)')) ||
      (filterPaymentStatus === 'REJECTED' && d.paymentStatus === 'REJECTED');
    return matchesSearch && matchesRange && matchesStatus;
  });

  // Scheduled Sessions CMS Admin State
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    speakerName: '',
    flag: '🇬🇧',
    role: '',
    affiliation: '',
    photo: '/zack_wilson.jpg',
    tags: 'UX/UI design, Product design, Copywriting',
    bio: '',
    abstract: ''
  });

  const handleOpenAddSession = () => {
    setEditingSession(null);
    setSessionForm({
      speakerName: '',
      flag: '🇬🇧',
      role: '',
      affiliation: '',
      photo: '/zack_wilson.jpg',
      tags: 'UX/UI design, Product design, Copywriting',
      bio: '',
      abstract: ''
    });
    setSessionModalOpen(true);
  };

  const handleOpenEditSession = (session) => {
    setEditingSession(session);
    setSessionForm({
      speakerName: session.speakerName || '',
      flag: session.flag || '🇬🇧',
      role: session.role || '',
      affiliation: session.affiliation || '',
      photo: session.photo || '/zack_wilson.jpg',
      tags: Array.isArray(session.tags) ? session.tags.join(', ') : session.tags || '',
      bio: session.bio || '',
      abstract: session.abstract || ''
    });
    setSessionModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    const tagList = sessionForm.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingSession) {
      const updatedSession = {
        ...editingSession,
        speakerName: sessionForm.speakerName,
        flag: sessionForm.flag,
        role: sessionForm.role,
        affiliation: sessionForm.affiliation,
        photo: sessionForm.photo,
        tags: tagList,
        bio: sessionForm.bio,
        abstract: sessionForm.abstract
      };

      setSessionsData(sessionsData.map(s => s.id === editingSession.id ? updatedSession : s));

      // Push UPDATE to Supabase Cloud DB
      try {
        await supabase.from('sessions').update({
          speaker_name: sessionForm.speakerName,
          flag: sessionForm.flag,
          role: sessionForm.role,
          affiliation: sessionForm.affiliation,
          photo: sessionForm.photo,
          tags: tagList,
          bio: sessionForm.bio,
          abstract: sessionForm.abstract
        }).eq('id', editingSession.id);
      } catch (err) {
        console.log('Supabase session update note:', err.message);
      }
    } else {
      const newSessionId = 'session-' + Date.now();
      const newSession = {
        id: newSessionId,
        speakerName: sessionForm.speakerName,
        flag: sessionForm.flag,
        role: sessionForm.role,
        affiliation: sessionForm.affiliation,
        photo: sessionForm.photo || '/zack_wilson.jpg',
        tags: tagList,
        bio: sessionForm.bio,
        abstract: sessionForm.abstract
      };

      setSessionsData([newSession, ...sessionsData]);

      // Push INSERT to Supabase Cloud DB
      try {
        await supabase.from('sessions').insert([{
          id: newSessionId,
          speaker_name: sessionForm.speakerName,
          flag: sessionForm.flag,
          role: sessionForm.role,
          affiliation: sessionForm.affiliation,
          photo: sessionForm.photo || '/zack_wilson.jpg',
          tags: tagList,
          bio: sessionForm.bio,
          abstract: sessionForm.abstract
        }]);
      } catch (err) {
        console.log('Supabase session insert note:', err.message);
      }
    }
    setSessionModalOpen(false);
  };

  // Academic Tracks CMS Admin State & Handlers
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [trackForm, setTrackForm] = useState({
    code: 'TRACK 01',
    title: '',
    speakersCount: '4 Keynotes',
    description: '',
    topics: 'DeFi Yield Farming, Algorithmic Stablecoins, Smart Contract Gharar'
  });

  const handleOpenAddTrack = () => {
    setEditingTrack(null);
    setTrackForm({
      code: `TRACK 0${tracksData.length + 1}`,
      title: '',
      speakersCount: '4 Sessions',
      description: '',
      topics: ''
    });
    setTrackModalOpen(true);
  };

  const handleOpenEditTrack = (track) => {
    setEditingTrack(track);
    setTrackForm({
      code: track.code || 'TRACK 01',
      title: track.title || '',
      speakersCount: track.speakersCount || '4 Sessions',
      description: track.description || '',
      topics: Array.isArray(track.topics) ? track.topics.join(', ') : track.topics || ''
    });
    setTrackModalOpen(true);
  };

  const handleSaveTrack = async (e) => {
    e.preventDefault();
    const topicList = trackForm.topics.split(',').map(t => t.trim()).filter(Boolean);

    if (editingTrack) {
      const updatedTrack = {
        ...editingTrack,
        code: trackForm.code,
        title: trackForm.title,
        speakersCount: trackForm.speakersCount,
        description: trackForm.description,
        topics: topicList
      };

      setTracksData(tracksData.map(t => t.id === editingTrack.id ? updatedTrack : t));

      // Push UPDATE to Supabase Cloud DB
      try {
        await supabase.from('tracks').update({
          code: trackForm.code,
          title: trackForm.title,
          speakers_count: trackForm.speakersCount,
          description: trackForm.description,
          topics: topicList
        }).eq('id', editingTrack.id);
      } catch (err) {
        console.log('Supabase track update note:', err.message);
      }
    } else {
      const newTrackId = 'track-' + Date.now();
      const newTrack = {
        id: newTrackId,
        code: trackForm.code,
        title: trackForm.title,
        speakersCount: trackForm.speakersCount,
        description: trackForm.description,
        topics: topicList
      };

      setTracksData([...tracksData, newTrack]);

      // Push INSERT to Supabase Cloud DB
      try {
        await supabase.from('tracks').insert([{
          id: newTrackId,
          code: trackForm.code,
          title: trackForm.title,
          speakers_count: trackForm.speakersCount,
          description: trackForm.description,
          topics: topicList
        }]);
      } catch (err) {
        console.log('Supabase track insert note:', err.message);
      }
    }
    setTrackModalOpen(false);
  };

  const handleDeleteTrack = async (trackId) => {
    if (window.confirm('Are you sure you want to delete this Academic Track?')) {
      setTracksData(tracksData.filter(t => t.id !== trackId));

      // Push DELETE to Supabase Cloud DB
      try {
        await supabase.from('tracks').delete().eq('id', trackId);
      } catch (err) {
        console.log('Supabase track delete note:', err.message);
      }
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this scheduled session?')) {
      setSessionsData(sessionsData.filter(s => s.id !== sessionId));

      // Push DELETE to Supabase Cloud DB
      try {
        await supabase.from('sessions').delete().eq('id', sessionId);
      } catch (err) {
        console.log('Supabase session delete note:', err.message);
      }
    }
  };

  const handleSpeakerPhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSessionForm((prev) => ({ ...prev, photo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Real delegates state - Source: Supabase Database ONLY

  const handleExportCSV = () => {
    const headers = [
      "Pass ID", "Full Name", "Age", "Address", "Phone No", "WhatsApp No",
      "Study Range", "Sanad (Degree)", "Status", "Campus / Position", "Alfiyya & Fathul Mueen Studied", "Registration Date"
    ];
    const rows = delegates.map(d => [
      d.id, `"${d.fullName}"`, d.age, `"${d.address}"`, d.phone, d.whatsapp,
      d.studyRange, `"${d.sanad || d.birudam || 'N/A'}"`, d.status, `"${d.status === 'Student' ? d.campus : d.position}"`,
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

  const handleDeleteDelegate = (delegate) => {
    if (!delegate) return;
    setDeleteConfirmDelegate(delegate);
  };

  const executeDeleteDelegate = async () => {
    if (!deleteConfirmDelegate) return;
    const targetId = deleteConfirmDelegate.id;

    // 1. Immediately remove from React state (Instant UI delete)
    setDelegates((prevDelegates) => prevDelegates.filter((d) => d.id !== targetId && d.pass_id !== targetId));

    // 2. Clean from local storage status overrides
    try {
      const overrides = getLocalStatusOverrides();
      delete overrides[targetId];
      localStorage.setItem('confiqh_delegate_status_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.error('Error cleaning local storage override:', e);
    }

    // 3. Close the modal immediately
    setDeleteConfirmDelegate(null);

    // 4. Delete from Supabase database cleanly
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2.5 select-none shrink-0">
                <span className="font-sans text-base sm:text-xl font-black text-white tracking-tight uppercase">
                  <span className="text-[#A1CF7F]">CON</span> FIQH
                </span>
                <span className="hidden xs:inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-[9px] sm:text-[11px] font-black bg-[#354823] text-white uppercase tracking-wider shadow-xs">
                  1ST EDITION
                </span>
              </div>
              <span className="hidden sm:inline text-xs font-bold text-[#A1CF7F] border-l border-emerald-700 pl-3">
                Secretariat Admin
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
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
                className="bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View Website</span>
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-600/80 hover:bg-red-700 text-white px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                title="Logout Secretariat Portal"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex-grow w-full">

        {/* Nav Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 sm:pb-4 mb-4 sm:mb-8">
          <button
            onClick={() => setActiveTab('delegates')}
            className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${activeTab === 'delegates'
              ? 'bg-[#17472B] text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Delegates ({delegates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${activeTab === 'sessions'
              ? 'bg-[#17472B] text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Sessions ({sessionsData.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${activeTab === 'tracks'
              ? 'bg-[#17472B] text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Tracks ({tracksData.length})</span>
          </button>
        </div>

        {/* TAB 1: Delegates Table */}
        {activeTab === 'delegates' && (
          <div className="space-y-6">

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              {/* Search Bar - Full width on mobile */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 sm:top-3" />
                <input
                  type="text"
                  placeholder="Search by name, phone, pass ID, UTR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 text-xs font-medium outline-none"
                />
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value)}
                  className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white outline-none"
                >
                  <option value="All">All Payment Statuses</option>
                  <option value="PENDING_VERIFICATION">🟡 Pending Verification</option>
                  <option value="PAID">🟢 Paid (Verified)</option>
                  <option value="REJECTED">🔴 Rejected</option>
                </select>

                <select
                  value={filterStudyRange}
                  onChange={(e) => setFilterStudyRange(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white outline-none"
                >
                  <option value="All">All Study Ranges</option>
                  <option value="Mukhtasar">Mukhtasar</option>
                  <option value="Muthawwal">Muthawwal</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none bg-emerald-800 hover:bg-emerald-900 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer"
                  title="Print complete delegate register"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-none bg-[#17472B] hover:bg-[#20603B] text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* ===== MOBILE CARD VIEW (visible only below lg) ===== */}
            <div className="lg:hidden space-y-4">
              {filteredDelegates.map((d) => (
                <div 
                  key={d.id} 
                  className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  {/* Card Top Header */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 border-b border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[#17472B] text-xs bg-[#17472B]/10 px-2.5 py-1 rounded-lg border border-[#17472B]/15 shrink-0">
                        {d.id}
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-semibold shrink-0">
                        {d.status}
                      </span>
                    </div>

                    {/* Modern Pill Status */}
                    {(d.paymentStatus === 'PAID' || d.paymentStatus === 'Paid (₹200)') ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>PAID ₹200</span>
                      </span>
                    ) : d.paymentStatus === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/90 text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>REJECTED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>PENDING</span>
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3.5 flex-grow">
                    {/* Delegate Name & Institution */}
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-base font-black text-gray-900 leading-snug">
                          {d.fullName}
                        </h4>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                          {d.age} yrs
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#17472B] mt-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{d.status === 'Student' ? (d.campus || 'N/A') : (d.position || 'N/A')}</span>
                      </div>
                    </div>

                    {/* Info 2-Column Grid (Study Range & Sanad / Address) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Study & Sanad</span>
                        <div className="mt-1">
                          <div className="text-xs font-bold text-[#17472B]">{d.studyRange || 'N/A'}</div>
                          <div className="text-[10px] font-semibold text-emerald-800 truncate mt-0.5">
                            {(d.sanad || d.birudam) && (d.sanad !== 'N/A' && d.birudam !== 'N/A') ? `Sanad: ${d.sanad || d.birudam}` : 'No Sanad'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Address</span>
                        <div className="mt-1 text-[11px] text-gray-700 leading-snug font-medium line-clamp-2" title={d.address}>
                          {d.address || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Contact buttons row */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${d.phone}`}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-800 border border-gray-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <span className="truncate">{d.phone}</span>
                      </a>
                      <a
                        href={getWhatsAppUrl(d)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-extrabold transition-colors"
                        title="Send Delegate Info via WhatsApp"
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="w-3 h-3 text-emerald-600 shrink-0" />
                      </a>
                    </div>

                    {/* UTR & Payment Receipt Preview Bar */}
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-gray-50/90 rounded-xl border border-gray-100">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">UTR Number</span>
                        {d.utrNumber && d.utrNumber !== 'N/A' ? (
                          <span className="font-mono text-xs font-bold text-gray-800 truncate block">
                            {d.utrNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 italic font-medium">No UTR entered</span>
                        )}
                      </div>

                      {d.paymentScreenshot ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <img
                            src={d.paymentScreenshot}
                            alt={`Receipt for ${d.fullName}`}
                            className="w-8 h-8 rounded-lg border border-emerald-400 object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setViewReceiptModal(d)}
                            title="Click to zoom receipt"
                          />
                          <button
                            onClick={() => setViewReceiptModal(d)}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-[#17472B] border border-emerald-300 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic shrink-0">No receipt image</span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50/80 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrintBadgeModal(d);
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border border-gray-200 shadow-xs touch-manipulation"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#17472B] pointer-events-none" />
                      <span>Badge</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {(d.paymentStatus === 'PENDING_VERIFICATION' || d.paymentStatus === 'REJECTED') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprovePayment(d.id);
                          }}
                          className="px-3.5 py-2 bg-[#17472B] hover:bg-[#20603B] active:bg-[#0D382C] text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
                        >
                          <Check className="w-3.5 h-3.5 pointer-events-none" />
                          <span>Approve</span>
                        </button>
                      )}

                      {d.paymentStatus !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectPayment(d.id);
                          }}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer touch-manipulation"
                        >
                          Reject
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteDelegate(d);
                        }}
                        className="p-2 sm:p-2.5 text-gray-400 hover:text-rose-600 active:text-rose-700 hover:bg-rose-50 active:bg-rose-100 rounded-xl transition-all cursor-pointer touch-manipulation border border-transparent hover:border-rose-100 shrink-0"
                        title="Delete Delegate"
                        aria-label="Delete Delegate"
                      >
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredDelegates.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 py-10 text-center text-gray-500 font-semibold text-sm">
                  No delegates registered yet.
                </div>
              )}
            </div>

            {/* ===== DESKTOP TABLE VIEW (visible only on lg+) ===== */}
            <div className="hidden lg:block bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <th className="py-4 px-3 text-center w-12">#</th>
                      <th className="py-4 px-4">Pass ID</th>
                      <th className="py-4 px-4">Delegate Name</th>
                      <th className="py-4 px-4">Campus / Institution</th>
                      <th className="py-4 px-4">Address</th>
                      <th className="py-4 px-4">Phone & WhatsApp</th>
                      <th className="py-4 px-4">Study & Sanad (Degree)</th>
                      <th className="py-4 px-4">UTR & Receipt (₹200)</th>
                      <th className="py-4 px-4">Payment Status</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium">
                    {filteredDelegates.map((d, index) => (
                      <tr key={d.id} className="hover:bg-emerald-50/30 transition-colors">
                        {/* Sl. No. */}
                        <td className="py-4 px-3 text-center font-mono font-bold text-gray-400 text-xs">
                          {index + 1}
                        </td>

                        {/* Pass ID */}
                        <td className="py-4 px-4">
                          <span className="font-mono font-bold text-xs text-[#17472B] bg-[#17472B]/10 px-2.5 py-1 rounded-lg border border-[#17472B]/15 whitespace-nowrap inline-block">
                            {d.id}
                          </span>
                        </td>

                        {/* Name & Age */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-gray-900 text-sm whitespace-nowrap">{d.fullName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-gray-500 font-medium">{d.age} yrs</span>
                            <span className="inline-block px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                              {d.status}
                            </span>
                          </div>
                        </td>

                        {/* Campus / Institution */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-[#17472B] text-xs flex items-center gap-1.5 max-w-[170px]" title={d.status === 'Student' ? (d.campus || 'N/A') : (d.position || 'N/A')}>
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{d.status === 'Student' ? (d.campus || 'N/A') : (d.position || 'N/A')}</span>
                          </div>
                        </td>

                        {/* Address */}
                        <td className="py-4 px-4 text-gray-600 max-w-[170px]">
                          <div className="text-[11px] leading-snug break-words line-clamp-2" title={d.address}>
                            {d.address || 'N/A'}
                          </div>
                        </td>

                        {/* Phone & WhatsApp */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div>
                              <a
                                href={`tel:${d.phone}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md text-[11px] font-semibold text-gray-800 transition-colors"
                                title="Call Phone"
                              >
                                <Phone className="w-3 h-3 text-gray-500 shrink-0" />
                                <span>{d.phone}</span>
                              </a>
                            </div>
                            <div>
                              <a
                                href={getWhatsAppUrl(d)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200 text-[11px] font-extrabold transition-all"
                                title="Send WhatsApp Message"
                              >
                                <span>WA: {d.whatsapp}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Study Range & Sanad */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-xs text-[#17472B]">{d.studyRange || 'N/A'}</div>
                          {(d.sanad || d.birudam) && (d.sanad !== 'N/A' && d.birudam !== 'N/A') ? (
                            <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 inline-block mt-0.5 max-w-[130px] truncate" title={`Sanad: ${d.sanad || d.birudam}`}>
                              Sanad: {d.sanad || d.birudam}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400 font-normal mt-0.5">No Sanad</div>
                          )}
                        </td>

                        {/* UTR & Receipt */}
                        <td className="py-4 px-4">
                          {d.utrNumber && d.utrNumber !== 'N/A' ? (
                            <div className="font-mono text-[10px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 inline-block mb-1">
                              UTR: {d.utrNumber}
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-700 font-medium italic mb-1">No UTR entered</div>
                          )}

                          {d.paymentScreenshot ? (
                            <div className="flex items-center gap-2">
                              <img 
                                src={d.paymentScreenshot} 
                                alt={`Receipt thumbnail for ${d.fullName}`}
                                className="w-8 h-8 rounded-lg border border-emerald-400 object-cover cursor-pointer hover:scale-110 transition-transform shrink-0 shadow-xs"
                                onClick={() => setViewReceiptModal(d)}
                                title="Click to view full payment receipt screenshot"
                              />
                              <button
                                onClick={() => setViewReceiptModal(d)}
                                className="text-[11px] text-[#17472B] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3 h-3 text-emerald-700" />
                                <span>View</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400 font-medium italic">No screenshot</div>
                          )}
                        </td>

                        {/* Payment Status */}
                        <td className="py-4 px-4">
                          {(d.paymentStatus === 'PAID' || d.paymentStatus === 'Paid (₹200)') ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>PAID ₹200</span>
                            </span>
                          ) : d.paymentStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>REJECTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>PENDING</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPrintBadgeModal(d)}
                              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-800 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer border border-gray-200 shadow-xs"
                              title="Print Pass Badge"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#17472B]" />
                              <span>Badge</span>
                            </button>

                            {(d.paymentStatus === 'PENDING_VERIFICATION' || d.paymentStatus === 'REJECTED') && (
                              <button
                                onClick={() => handleApprovePayment(d.id)}
                                className="px-2.5 py-1.5 bg-[#17472B] hover:bg-[#20603B] text-white rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Approve Payment & Mark Paid"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            )}

                            {d.paymentStatus !== 'REJECTED' && (
                              <button
                                onClick={() => handleRejectPayment(d.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer"
                                title="Reject Payment"
                              >
                                Reject
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDelegate(d);
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-lg transition-colors cursor-pointer touch-manipulation"
                              title="Delete Delegate"
                            >
                              <Trash2 className="w-4 h-4 pointer-events-none" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredDelegates.length === 0 && (
                      <tr>
                        <td colSpan="10" className="py-10 text-center text-gray-500 font-semibold">
                          No delegates registered yet. Real registrations submitted on the website sync here automatically via Supabase!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Scheduled Sessions CMS (Admin Only Control) */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">

            {/* Header Control Toolbar */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#17472B] flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-emerald-700" />
                  <span>Scheduled Summit Sessions Management</span>
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-1">
                  Admin Only Control: Add, edit, or delete scheduled speakers and session topics displayed on the public website.
                </p>
              </div>

              <button
                onClick={handleOpenAddSession}
                className="bg-[#17472B] hover:bg-[#20603B] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Scheduled Session</span>
              </button>
            </div>

            {/* Grid of Scheduled Speaker Sessions */}
            <div className="grid grid-cols-1 gap-6">
              {sessionsData.map((session) => (
                <div 
                  key={session.id} 
                  className="bg-[#123C2C] text-white rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden border-4 border-[#1D4E3B]"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* Speaker Photo Box matching user screenshot design */}
                    <div className="md:col-span-4 flex justify-center">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 shrink-0">
                        <img 
                          src={session.photo || '/zack_wilson.jpg'} 
                          alt={session.speakerName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/zack_wilson.jpg'; }}
                        />
                      </div>
                    </div>

                    {/* Speaker Details */}
                    <div className="md:col-span-8 space-y-4">
                      
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-2xl sm:text-3xl font-black text-white">
                              {session.speakerName}
                            </h4>
                            <span className="text-xl sm:text-2xl">{session.flag}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-emerald-200 font-medium mt-1">
                            {session.role}
                          </p>
                          {session.affiliation && (
                            <p className="text-[11px] text-gray-300 italic font-mono mt-0.5">
                              {session.affiliation}
                            </p>
                          )}
                        </div>

                        {/* Admin Control Action Buttons */}
                        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
                          <button
                            onClick={() => handleOpenEditSession(session)}
                            className="p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                            title="Edit Session Details"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                            title="Delete Session"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* HELPING WITH / Category Tags */}
                      {session.tags && session.tags.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">
                            HELPING WITH:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {session.tags.map((tag, idx) => (
                              <span 
                                key={idx} 
                                className="px-3.5 py-1 rounded-full text-xs font-bold bg-white text-[#123C2C] shadow-sm border border-gray-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Session Abstract */}
                      {session.abstract && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block mb-1">
                            SESSION ABSTRACT:
                          </span>
                          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-medium">
                            {session.abstract}
                          </p>
                        </div>
                      )}

                    </div>

                  </div>
                </div>
              ))}

              {sessionsData.length === 0 && (
                <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto" />
                  <h4 className="text-lg font-bold text-gray-800">No Scheduled Sessions Added</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Click the "Add New Scheduled Session" button above to add speaker sessions to the summit schedule.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: Academic Tracks CMS (Admin Only Control) */}
        {activeTab === 'tracks' && (
          <div className="space-y-6">

            {/* Header Control Toolbar */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#17472B] flex items-center gap-2">
                  <Layers className="w-6 h-6 text-emerald-700" />
                  <span>Summit Academic Tracks Management</span>
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-1">
                  Admin Only Control: Add, edit, or delete summit academic tracks displayed on the public website.
                </p>
              </div>

              <button
                onClick={handleOpenAddTrack}
                className="bg-[#17472B] hover:bg-[#20603B] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Academic Track</span>
              </button>
            </div>

            {/* Grid of Academic Tracks matching user screenshot design */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tracksData.map((track) => {
                const topicsList = Array.isArray(track.topics) ? track.topics : (track.topics ? track.topics.split(',') : []);
                return (
                  <div 
                    key={track.id}
                    className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col justify-between relative group hover:border-emerald-600 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold font-mono tracking-widest px-3 py-1 rounded-md bg-[#123C2C] text-white uppercase">
                          {track.code}
                        </span>
                        <span className="text-xs font-semibold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full">
                          {track.speakersCount}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h4 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                          {track.title}
                        </h4>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 p-1 rounded-xl border border-gray-200">
                          <button
                            onClick={() => handleOpenEditTrack(track)}
                            className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all"
                            title="Edit Track Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTrack(track.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all"
                            title="Delete Track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-6">
                        {track.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {topicsList.map((t, topicIdx) => (
                          <span key={topicIdx} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                            #{t.trim()}
                          </span>
                        ))}
                      </div>

                      <div className="w-full py-2.5 px-4 rounded-xl border-2 border-[#123C2C] text-[#123C2C] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-emerald-50/50">
                        <span>Register for {track.code}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {tracksData.length === 0 && (
                <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
                  <Layers className="w-12 h-12 text-gray-400 mx-auto" />
                  <h4 className="text-lg font-bold text-gray-800">No Academic Tracks Added</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Click the "Add New Academic Track" button above to publish tracks on the website.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Payment Receipt Screenshot Modal for Secretariat Verification */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative border border-gray-200 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setViewReceiptModal(null)}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-lg transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 pb-3 pr-8">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg text-gray-900 leading-tight">
                  Payment Receipt Verification
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                  {viewReceiptModal.fullName} ({viewReceiptModal.id}) • Fee: <strong>₹200</strong>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-2.5 sm:p-3 rounded-2xl border border-gray-200 text-center">
              {viewReceiptModal.paymentScreenshot ? (
                <img 
                  src={viewReceiptModal.paymentScreenshot} 
                  alt={`Payment Screenshot for ${viewReceiptModal.fullName}`}
                  className="max-h-[55vh] w-auto mx-auto rounded-xl object-contain shadow-md"
                />
              ) : (
                <div className="py-10 text-gray-400 text-xs sm:text-sm font-semibold">
                  No payment screenshot uploaded for this delegate.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewReceiptModal(null)}
                className="bg-[#17472B] hover:bg-[#20603B] text-white px-5 py-2 rounded-xl text-xs font-bold shadow"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Scheduled Session Form Modal */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-gray-200 max-h-[92vh] overflow-y-auto no-scrollbar">
            
            <button
              onClick={() => setSessionModalOpen(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-[#17472B] text-white rounded-2xl shadow-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-xl text-[#17472B]">
                  {editingSession ? 'Edit Scheduled Session' : 'Add New Scheduled Session'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Secretariat Admin Control • {editingSession ? 'Update existing session details' : 'Publish new speaker session'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Speaker Name *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Zack Wilson"
                    value={sessionForm.speakerName}
                    onChange={(e) => setSessionForm({ ...sessionForm, speakerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Flag Emoji *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 🇬🇧"
                    value={sessionForm.flag}
                    onChange={(e) => setSessionForm({ ...sessionForm, flag: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B] text-center text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Speaker Role / Designation *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Senior Product Designer at Meta"
                  value={sessionForm.role}
                  onChange={(e) => setSessionForm({ ...sessionForm, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Institution / Affiliation
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Lead Researcher in AI Fatwa Limits & UX Guardrails"
                  value={sessionForm.affiliation}
                  onChange={(e) => setSessionForm({ ...sessionForm, affiliation: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Speaker Photo (Upload Image File or Enter URL) *
                </label>
                
                <div className="space-y-2">
                  {/* File Upload Button */}
                  <div className="relative border-2 border-dashed border-emerald-600/40 rounded-xl p-3 bg-emerald-50/40 hover:bg-emerald-50 text-center cursor-pointer transition-all">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleSpeakerPhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#17472B]">
                      <Upload className="w-4 h-4 text-emerald-700" />
                      <span>Click to Upload Speaker Image File</span>
                    </div>
                  </div>

                  {/* Manual URL Input & Live Thumbnail Preview */}
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      required
                      placeholder="Or enter photo URL: /zack_wilson.jpg or https://..."
                      value={sessionForm.photo}
                      onChange={(e) => setSessionForm({ ...sessionForm, photo: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                    />

                    {sessionForm.photo && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 bg-gray-100 shadow-sm" title="Speaker photo preview">
                        <img 
                          src={sessionForm.photo} 
                          alt="Speaker Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/zack_wilson.jpg'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Helping With / Category Tags (comma separated) *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. UX/UI design, Product design, Copywriting"
                  value={sessionForm.tags}
                  onChange={(e) => setSessionForm({ ...sessionForm, tags: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Speaker Biography
                </label>
                <textarea 
                  rows="2"
                  placeholder="Short speaker biography..."
                  value={sessionForm.bio}
                  onChange={(e) => setSessionForm({ ...sessionForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium outline-none focus:border-[#17472B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Session Abstract / Description *
                </label>
                <textarea 
                  rows="3"
                  required
                  placeholder="Detailed abstract of the scheduled session topic..."
                  value={sessionForm.abstract}
                  onChange={(e) => setSessionForm({ ...sessionForm, abstract: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium outline-none focus:border-[#17472B]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#17472B] hover:bg-[#20603B] shadow"
                >
                  {editingSession ? 'Save Session Changes' : 'Publish Scheduled Session'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Add / Edit Academic Track Form Modal */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-gray-200 max-h-[92vh] overflow-y-auto no-scrollbar">
            
            <button
              onClick={() => setTrackModalOpen(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-[#17472B] text-white rounded-2xl shadow-sm">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-xl text-[#17472B]">
                  {editingTrack ? 'Edit Academic Track' : 'Add New Academic Track'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Secretariat Admin Control • {editingTrack ? 'Update existing curriculum track' : 'Publish new summit academic track'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTrack} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Track Code *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. TRACK 01"
                    value={trackForm.code}
                    onChange={(e) => setTrackForm({ ...trackForm, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Track Title *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Decentralized Crypto Finance & Smart Contracts"
                    value={trackForm.title}
                    onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Session Count Badge *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. 4 Keynotes, 5 Sessions, 3 Panels"
                  value={trackForm.speakersCount}
                  onChange={(e) => setTrackForm({ ...trackForm, speakersCount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Track Description *
                </label>
                <textarea 
                  rows="3"
                  required
                  placeholder="Detailed description of the academic domain..."
                  value={trackForm.description}
                  onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium outline-none focus:border-[#17472B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Hashtags / Topics (comma separated) *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. DeFi Yield Farming, Algorithmic Stablecoins, Smart Contract Gharar"
                  value={trackForm.topics}
                  onChange={(e) => setTrackForm({ ...trackForm, topics: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-[#17472B]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTrackModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#17472B] hover:bg-[#20603B] shadow"
                >
                  {editingTrack ? 'Save Track Changes' : 'Publish Academic Track'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Printable Delegate Pass Badge Modal */}
      {printBadgeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          
          {/* Print CSS Rules - Print STRICTLY the badge card */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #admin-printable-pass, #admin-printable-pass * {
                visibility: visible !important;
              }
              #admin-printable-pass {
                position: fixed !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 420px !important;
                max-width: 90% !important;
                margin: 0 !important;
                padding: 24px !important;
                background: #F8FBF6 !important;
                box-shadow: none !important;
                border: 4px solid #17472B !important;
                border-radius: 24px !important;
                page-break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setPrintBadgeModal(null)}
              className="absolute top-3.5 right-3.5 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <h3 className="text-base sm:text-lg font-black text-[#17472B]">
                Delegate Pass Badge Preview
              </h3>

              {/* Printable Pass Card */}
              <div id="admin-printable-pass" className="bg-[#F8FBF6] border-4 border-[#17472B] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-md text-left space-y-3 sm:space-y-4 relative">
                
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5 sm:pb-3 gap-2">
                  <div className="min-w-0">
                    <h4 className="font-serif font-black text-lg sm:text-xl text-[#17472B] tracking-tight">CONFIQ 2026</h4>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-800 truncate">Annual Kerala Fiqh Summit</p>
                  </div>
                  <span className="px-2.5 sm:px-3 py-1 bg-[#17472B] text-white text-[10px] sm:text-xs font-mono font-bold rounded-full shrink-0">
                    {printBadgeModal.id}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Delegate Name</div>
                  <div className="text-base sm:text-lg font-black text-gray-900 leading-snug break-words">{printBadgeModal.fullName}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs">
                  <div className="overflow-hidden">
                    <span className="text-gray-500 font-bold block text-[10px]">Status & Age:</span>
                    <span className="font-extrabold text-[#17472B] text-[11px] sm:text-xs truncate block">{printBadgeModal.status} ({printBadgeModal.age} yrs)</span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-gray-500 font-bold block text-[10px]">Study Range:</span>
                    <span className="font-extrabold text-[#17472B] text-[11px] sm:text-xs truncate block">{printBadgeModal.studyRange || 'N/A'}</span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-gray-500 font-bold block text-[10px]">Campus / Post:</span>
                    <span className="font-bold text-gray-800 text-[11px] sm:text-xs truncate block" title={printBadgeModal.status === 'Student' ? (printBadgeModal.campus || 'N/A') : (printBadgeModal.position || 'N/A')}>
                      {printBadgeModal.status === 'Student' ? (printBadgeModal.campus || 'N/A') : (printBadgeModal.position || 'N/A')}
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-gray-500 font-bold block text-[10px]">Sanad (Degree):</span>
                    <span className="font-bold text-gray-800 text-[11px] sm:text-xs truncate block">{printBadgeModal.sanad || printBadgeModal.birudam || 'N/A'}</span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-gray-500 font-bold block text-[10px]">Phone:</span>
                    <span className="font-mono font-bold text-gray-800 text-[11px] sm:text-xs truncate block">{printBadgeModal.phone}</span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-gray-500 font-bold block text-[10px]">Payment Status:</span>
                    <span className={`font-extrabold text-[11px] sm:text-xs truncate block ${
                      printBadgeModal.paymentStatus === 'PAID' || printBadgeModal.paymentStatus === 'Paid (₹200)'
                        ? 'text-emerald-700'
                        : printBadgeModal.paymentStatus === 'REJECTED'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}>
                      {printBadgeModal.paymentStatus === 'PAID' || printBadgeModal.paymentStatus === 'Paid (₹200)'
                        ? 'PAID ₹200 ✓'
                        : printBadgeModal.paymentStatus === 'REJECTED'
                        ? 'REJECTED'
                        : 'PENDING'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-100 text-[9px] sm:text-[10px] text-gray-500 flex justify-between gap-1">
                  <span className="truncate">Ahlussuffa Dars, Parapram</span>
                  <span className="shrink-0">Sept 11–12, 2026</span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  onClick={() => setPrintBadgeModal(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-[#17472B] hover:bg-[#20603B] text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Badge</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Never blocked by mobile browsers) */}
      {deleteConfirmDelegate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-gray-200 text-center space-y-4">
            <button
              onClick={() => setDeleteConfirmDelegate(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">Delete Delegate?</h3>
              <p className="text-xs text-gray-500 font-medium mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-gray-900">{deleteConfirmDelegate.fullName}</strong> (<span className="font-mono text-emerald-800 font-bold">{deleteConfirmDelegate.id}</span>)?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDelegate(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteDelegate}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
