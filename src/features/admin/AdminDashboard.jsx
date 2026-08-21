import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, Calendar, FileText, Settings, Plus, Search, Download, Printer, ExternalLink,
  Trash2, Eye, LogOut, CheckCircle, RefreshCw, Lock, Key, ShieldAlert, ArrowRight, X, Edit3, Image as ImageIcon, Sparkles, Tag, Upload, BookOpen, Layers,
  Phone, Building2, Check, QrCode, CheckCircle2, Clock, UserCheck, Undo2, Copy, CreditCard, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import QRScannerModal from './QRScannerModal';

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
  const [filterArrivalStatus, setFilterArrivalStatus] = useState('All');
  const [loading, setLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [isLiveActive, setIsLiveActive] = useState(true);

  // QR Scanner & Check-in Modal
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannedPassIdTarget, setScannedPassIdTarget] = useState(null);

  // Modal to inspect delegate payment receipt screenshot
  const [viewReceiptModal, setViewReceiptModal] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(false);
  // Modal to preview & print individual delegate badge
  const [printBadgeModal, setPrintBadgeModal] = useState(null);
  // In-app Delete Confirmation Modal (fixes mobile window.confirm blocking)
  const [deleteConfirmDelegate, setDeleteConfirmDelegate] = useState(null);
  // Modal to edit delegate registration details
  const [editingDelegate, setEditingDelegate] = useState(null);
  const [editDelegateForm, setEditDelegateForm] = useState({
    fullName: '',
    age: '',
    phone: '',
    whatsapp: '',
    address: '',
    status: 'Student',
    campus: '',
    position: '',
    studyRange: 'Muthawwal',
    sanad: '',
    studiedAlfiyyaAndFathulMueen: true,
    utrNumber: '',
    paymentStatus: 'PENDING_VERIFICATION',
    rejectionReason: ''
  });
  const [editDelegateSaving, setEditDelegateSaving] = useState(false);
  const [editDelegateError, setEditDelegateError] = useState('');

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

  // Local storage helpers for Delegate Arrival / Attendance check-in
  const getLocalArrivalOverrides = () => {
    try {
      const stored = localStorage.getItem('confiqh_delegate_arrival_overrides');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  };

  const setLocalArrivalOverride = (id, arrived, arrivedAt) => {
    try {
      const overrides = getLocalArrivalOverrides();
      overrides[id] = arrived;
      overrides[`${id}_at`] = arrived ? (arrivedAt || new Date().toISOString()) : null;
      localStorage.setItem('confiqh_delegate_arrival_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.error('Error saving local arrival override:', e);
    }
  };

  // Helper to test if a string is a valid UUID
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

  const handleToggleArrival = async (targetId, newStatus) => {
    if (!targetId) return;
    const nowIso = new Date().toISOString();
    setLocalArrivalOverride(targetId, newStatus, nowIso);

    setDelegates((prev) =>
      prev.map((d) => (d.id === targetId ? {
        ...d,
        arrived: newStatus,
        attendanceStatus: newStatus ? 'ARRIVED' : 'ABSENT',
        arrivedAt: newStatus ? nowIso : null
      } : d))
    );

    try {
      // 1. Try updating with full arrival fields + verified_by fallback
      let res = await supabase
        .from('delegates')
        .update({
          arrived: newStatus,
          attendance_status: newStatus ? 'ARRIVED' : 'ABSENT',
          arrived_at: newStatus ? nowIso : null,
          verified_by: newStatus ? `ARRIVED:${nowIso}` : 'NOT_ARRIVED'
        })
        .eq('pass_id', targetId)
        .select();

      // 2. If standard columns don't exist yet, update verified_by which always exists in the DB
      if (res.error) {
        res = await supabase
          .from('delegates')
          .update({
            verified_by: newStatus ? `ARRIVED:${nowIso}` : 'NOT_ARRIVED'
          })
          .eq('pass_id', targetId)
          .select();
      }

      // 3. If targetId is a UUID, fallback to id column
      if ((res.error || !res.data || res.data.length === 0) && isUUID(targetId)) {
        res = await supabase
          .from('delegates')
          .update({
            verified_by: newStatus ? `ARRIVED:${nowIso}` : 'NOT_ARRIVED'
          })
          .eq('id', targetId)
          .select();
      }

      if (res.error) {
        console.warn('Supabase arrival update error:', res.error.message);
      } else {
        console.log('Successfully synced arrival status across all devices to Supabase Cloud DB:', res.data);
      }
    } catch (err) {
      console.error('Supabase arrival update exception:', err);
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
    setViewReceiptModal(null);

    setDelegates((prev) =>
      prev.map((d) => (d.id === targetId ? { ...d, paymentStatus: 'PAID' } : d))
    );

    try {
      let res = await supabase
        .from('delegates')
        .update({
          payment_status: 'PAID',
          verified_at: new Date().toISOString()
        })
        .eq('pass_id', targetId)
        .select();

      if ((res.error || !res.data || res.data.length === 0) && isUUID(targetId)) {
        res = await supabase
          .from('delegates')
          .update({
            payment_status: 'PAID',
            verified_at: new Date().toISOString()
          })
          .eq('id', targetId)
          .select();
      }

      if (res.error) {
        console.error('Supabase approve payment DB error:', res.error);
      } else {
        console.log('Payment approved successfully in Supabase DB:', res.data);
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
      let res = await supabase
        .from('delegates')
        .update({
          payment_status: 'REJECTED',
          rejection_reason: reason
        })
        .eq('pass_id', targetId)
        .select();

      if ((res.error || !res.data || res.data.length === 0) && isUUID(targetId)) {
        res = await supabase
          .from('delegates')
          .update({
            payment_status: 'REJECTED',
            rejection_reason: reason
          })
          .eq('id', targetId)
          .select();
      }

      if (res.error) {
        console.error('Supabase reject payment DB error:', res.error);
      } else {
        console.log('Payment rejected in Supabase DB:', res.data);
      }
    } catch (err) {
      console.error('Supabase reject payment exception:', err.message);
    }
  };

  const handleOpenEditDelegate = (d) => {
    setEditingDelegate(d);
    setEditDelegateForm({
      fullName: d.fullName || '',
      age: d.age || '',
      phone: d.phone || '',
      whatsapp: d.whatsapp || d.phone || '',
      address: d.address || '',
      status: d.status || 'Student',
      campus: d.campus || '',
      position: d.position || '',
      studyRange: d.studyRange || 'Muthawwal',
      sanad: d.sanad !== 'N/A' ? (d.sanad || d.birudam || '') : '',
      studiedAlfiyyaAndFathulMueen: !!d.studiedAlfiyyaAndFathulMueen,
      utrNumber: d.utrNumber !== 'N/A' ? (d.utrNumber || '') : '',
      paymentStatus: d.paymentStatus || 'PENDING_VERIFICATION',
      rejectionReason: d.rejectionReason || '',
      paymentScreenshot: d.paymentScreenshot || null
    });
    setEditDelegateError('');
  };

  const handleEditScreenshotChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditDelegateError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    setEditDelegateError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditDelegateForm((prev) => ({
        ...prev,
        paymentScreenshot: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveEditScreenshot = () => {
    setEditDelegateForm((prev) => ({
      ...prev,
      paymentScreenshot: null
    }));
  };

  const handleSaveDelegateChanges = async (e) => {
    e.preventDefault();
    if (!editingDelegate) return;
    setEditDelegateSaving(true);
    setEditDelegateError('');

    const targetId = editingDelegate.id;
    const rawStatus = (editDelegateForm.paymentStatus || 'PENDING_VERIFICATION').toUpperCase();
    let normalizedStatus = 'PENDING_VERIFICATION';
    if (rawStatus.includes('PAID')) normalizedStatus = 'PAID';
    else if (rawStatus.includes('REJECT')) normalizedStatus = 'REJECTED';

    const updatedDelegate = {
      ...editingDelegate,
      fullName: editDelegateForm.fullName.trim(),
      age: parseInt(editDelegateForm.age) || editingDelegate.age,
      phone: editDelegateForm.phone.trim(),
      whatsapp: editDelegateForm.whatsapp.trim(),
      address: editDelegateForm.address.trim(),
      status: editDelegateForm.status,
      campus: editDelegateForm.status === 'Student' ? editDelegateForm.campus.trim() : 'N/A',
      position: editDelegateForm.status === 'Working' ? editDelegateForm.position.trim() : 'N/A',
      studyRange: editDelegateForm.studyRange,
      sanad: editDelegateForm.sanad.trim() || 'N/A',
      birudam: editDelegateForm.sanad.trim() || 'N/A',
      studiedAlfiyyaAndFathulMueen: editDelegateForm.studiedAlfiyyaAndFathulMueen,
      utrNumber: editDelegateForm.utrNumber.trim() || 'N/A',
      paymentScreenshot: editDelegateForm.paymentScreenshot || null,
      paymentStatus: normalizedStatus,
      rejectionReason: normalizedStatus === 'REJECTED' ? editDelegateForm.rejectionReason : null,
      verifiedAt: normalizedStatus === 'PAID' ? (editingDelegate.verifiedAt || new Date().toISOString()) : null
    };

    // 1. Immediately update local storage and react state
    setLocalStatusOverride(targetId, normalizedStatus);
    setDelegates((prev) =>
      prev.map((d) => (d.id === targetId ? updatedDelegate : d))
    );

    // 2. Persist to Supabase Database
    try {
      const payload = {
        full_name: updatedDelegate.fullName,
        age: updatedDelegate.age,
        phone: updatedDelegate.phone,
        whatsapp: updatedDelegate.whatsapp,
        address: updatedDelegate.address,
        status: updatedDelegate.status,
        campus: updatedDelegate.campus,
        position: updatedDelegate.position,
        study_range: updatedDelegate.studyRange,
        birudam: updatedDelegate.birudam,
        studied_alfiyya: updatedDelegate.studiedAlfiyyaAndFathulMueen,
        utr_number: updatedDelegate.utrNumber !== 'N/A' ? updatedDelegate.utrNumber : null,
        payment_screenshot: updatedDelegate.paymentScreenshot,
        payment_status: updatedDelegate.paymentStatus,
        rejection_reason: updatedDelegate.rejectionReason,
        verified_at: updatedDelegate.verifiedAt
      };

      let res = await supabase
        .from('delegates')
        .update(payload)
        .eq('pass_id', targetId)
        .select();

      if ((res.error || !res.data || res.data.length === 0) && isUUID(targetId)) {
        res = await supabase
          .from('delegates')
          .update(payload)
          .eq('id', targetId)
          .select();
      }

      if (res.error) {
        console.error('Supabase delegate update error:', res.error);
        setEditDelegateError('Saved locally, but Supabase update error: ' + res.error.message);
      } else {
        setEditingDelegate(null);
      }
    } catch (err) {
      console.error('Save delegate exception:', err);
      setEditingDelegate(null);
    }
    setEditDelegateSaving(false);
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

  const fetchSupabaseDelegates = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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
        setLastSyncedTime(new Date());
        setIsLiveActive(true);
        const overrides = getLocalStatusOverrides();
        const arrivalOverrides = getLocalArrivalOverrides();
        const mapped = data.map(d => {
          const id = d.pass_id || d.id;
          const localStatus = overrides[id];
          const rawStatus = (localStatus || d.payment_status || d.paymentStatus || 'PENDING_VERIFICATION').toUpperCase();
          let normalizedStatus = 'PENDING_VERIFICATION';
          if (rawStatus.includes('PAID')) normalizedStatus = 'PAID';
          else if (rawStatus.includes('REJECT')) normalizedStatus = 'REJECTED';

          const isCloudArrived = d.arrived === true ||
            d.attendance_status === 'ARRIVED' ||
            (typeof d.verified_by === 'string' && d.verified_by.startsWith('ARRIVED')) ||
            (typeof d.verified_by === 'string' && d.verified_by === 'ARRIVED');

          let cloudArrivedAt = d.arrived_at || null;
          if (!cloudArrivedAt && typeof d.verified_by === 'string' && d.verified_by.startsWith('ARRIVED:')) {
            cloudArrivedAt = d.verified_by.replace('ARRIVED:', '');
          }

          const isArrived = arrivalOverrides[id] !== undefined
            ? arrivalOverrides[id]
            : isCloudArrived;
          const arrivedAt = arrivalOverrides[`${id}_at`] || cloudArrivedAt || null;

          return {
            id: id,
            fullName: d.full_name || 'Anonymous',
            age: d.age || 'N/A',
            address: d.address || 'N/A',
            phone: d.phone || 'N/A',
            whatsapp: d.whatsapp || d.phone || 'N/A',
            studyRange: d.study_range || 'Muthawwal',
            sanad: d.sanad || d.birudam || 'N/A',
            birudam: d.sanad || d.birudam || 'N/A',
            status: d.status || 'Student',
            campus: d.campus || 'N/A',
            position: d.position || 'N/A',
            studiedAlfiyyaAndFathulMueen: d.studied_alfiyya,
            utrNumber: d.utr_number || d.utrNumber || 'N/A',
            paymentScreenshot: d.payment_screenshot || d.paymentScreenshot || null,
            paymentStatus: normalizedStatus,
            rejectionReason: d.rejection_reason || null,
            verifiedAt: d.verified_at || null,
            registeredAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
            arrived: isArrived,
            attendanceStatus: isArrived ? 'ARRIVED' : 'ABSENT',
            arrivedAt: arrivedAt
          };
        });
        setDelegates(mapped);
      }
    } catch (err) {
      console.error('Supabase connection exception:', err.message);
      setDbConnected(false);
    }
    if (!isSilent) setLoading(false);
  };

  // URL scan parameter listener (e.g. ?scan=CF-2026-XXXX or #admin?scan=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const scanId = params.get('scan') || params.get('pass_id') || hashParams.get('scan') || hashParams.get('pass_id');
    if (scanId) {
      setScannedPassIdTarget(scanId.trim());
      setScannerModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSupabaseDelegates(false);

      // Real-time Postgres database subscription for instant table updates
      const channel = supabase
        .channel('public:delegates_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'delegates' },
          (payload) => {
            console.log('Real-time database payload received:', payload);
            fetchSupabaseDelegates(true);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsLiveActive(true);
          }
        });

      // Live tracking polling fallback (every 4 seconds) to guarantee instant response time
      const pollInterval = setInterval(() => {
        fetchSupabaseDelegates(true);
      }, 4000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [isAuthenticated]);

  const filteredDelegates = delegates.filter(d => {
    const term = (searchTerm || '').trim().toLowerCase();
    const fullName = (d.fullName || '').toLowerCase();
    const phone = (d.phone || '').toLowerCase();
    const whatsapp = (d.whatsapp || '').toLowerCase();
    const id = (d.id || '').toLowerCase();
    const utr = (d.utrNumber || '').toLowerCase();
    const campus = (d.campus || '').toLowerCase();

    const matchesSearch = !term ||
      fullName.includes(term) ||
      phone.includes(term) ||
      whatsapp.includes(term) ||
      id.includes(term) ||
      utr.includes(term) ||
      campus.includes(term);

    const matchesRange = filterStudyRange === 'All' || d.studyRange === filterStudyRange;

    let matchesStatus = true;
    if (filterPaymentStatus === 'PAID') {
      matchesStatus = d.paymentStatus === 'PAID';
    } else if (filterPaymentStatus === 'REJECTED') {
      matchesStatus = d.paymentStatus === 'REJECTED';
    } else if (filterPaymentStatus === 'PENDING_VERIFICATION') {
      matchesStatus = d.paymentStatus === 'PENDING_VERIFICATION' || !d.paymentStatus;
    }

    let matchesArrival = true;
    if (filterArrivalStatus === 'ARRIVED') {
      matchesArrival = d.arrived === true;
    } else if (filterArrivalStatus === 'NOT_ARRIVED') {
      matchesArrival = d.arrived !== true;
    }

    return matchesSearch && matchesRange && matchesStatus && matchesArrival;
  });

  const pendingCount = delegates.filter(d => (d.paymentStatus || 'PENDING_VERIFICATION') === 'PENDING_VERIFICATION').length;
  const paidCount = delegates.filter(d => d.paymentStatus === 'PAID').length;
  const rejectedCount = delegates.filter(d => d.paymentStatus === 'REJECTED').length;
  const arrivedCount = delegates.filter(d => d.arrived === true).length;
  const notArrivedCount = delegates.filter(d => d.arrived !== true).length;

  const totalPaidRevenue = paidCount * 200;
  const totalPendingRevenue = pendingCount * 200;
  const totalPotentialRevenue = delegates.length * 200;

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
              {/* Live Tracking Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-emerald-300 text-[11px] font-bold border border-emerald-500/20 select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="hidden sm:inline">Live Tracking</span>
                {lastSyncedTime && (
                  <span className="text-[10px] text-gray-300 font-mono hidden md:inline ml-1">
                    {lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setScannedPassIdTarget(null);
                  setScannerModalOpen(true);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-[#17472B] font-extrabold px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Scan Delegate QR Code Pass"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden xs:inline">Scan Pass</span>
              </button>

              <button
                onClick={() => fetchSupabaseDelegates(false)}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Refresh Supabase Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={onReturnToPublic}
                className="bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View Website</span>
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-600/80 hover:bg-red-700 text-white px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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

            {/* Quick Metrics & Total Payment Revenue Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              
              {/* Card 1: Total Registered */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block truncate">
                    Total Registered
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xl sm:text-2xl font-black text-gray-900 leading-tight block">
                    {delegates.length}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 mt-0.5 block truncate">
                    Est. Value: ₹{totalPotentialRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Card 2: Total Payment Collected (Verified) */}
              <div className="bg-gradient-to-br from-emerald-900 via-[#17472B] to-emerald-950 text-white p-3.5 sm:p-4 rounded-2xl border border-emerald-700/60 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 block truncate">
                    Total Payment Collected
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-800/80 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-amber-300 leading-tight">
                      ₹{totalPaidRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-200 mt-0.5 block truncate">
                    {paidCount} Verified Paid (₹200/ea)
                  </span>
                </div>
              </div>

              {/* Card 3: Pending Payments (Under Review) */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/90 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-amber-50/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-800 block truncate">
                    Pending Payment
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xl sm:text-2xl font-black text-amber-800 leading-tight block">
                    ₹{totalPendingRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 mt-0.5 block truncate">
                    {pendingCount} Delegates To Verify
                  </span>
                </div>
              </div>

              {/* Card 4: Venue Arrival / Checked-In */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-teal-200 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-teal-50/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-teal-800 block truncate">
                    Venue Arrival
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-teal-900 leading-tight">
                      {arrivedCount}
                    </span>
                    <span className="text-xs font-bold text-teal-700">
                      / {delegates.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 mt-0.5 block truncate">
                    {((arrivedCount / (delegates.length || 1)) * 100).toFixed(0)}% Checked In at Venue
                  </span>
                </div>
              </div>

              {/* Card 5: Payment Rate */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1 md:col-span-1 bg-gradient-to-br from-white to-emerald-50/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block truncate">
                    Paid Status Rate
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xl sm:text-2xl font-black text-emerald-800 leading-tight block">
                    {((paidCount / (delegates.length || 1)) * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 mt-0.5 block truncate">
                    {paidCount} Paid • {rejectedCount} Rejected
                  </span>
                </div>
              </div>

            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              {/* Search and Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* Search Bar */}
                <div className="relative sm:col-span-12 md:col-span-4 lg:col-span-4">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 sm:top-3" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, pass ID, UTR..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 text-xs font-medium outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all bg-white"
                  />
                </div>

                {/* Filters */}
                <div className="sm:col-span-7 md:col-span-5 lg:col-span-5 flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    value={filterPaymentStatus}
                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                    className="flex-1 min-w-[130px] px-3 py-2 sm:py-2.5 rounded-xl border border-gray-300 text-xs font-semibold bg-white outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
                  >
                    <option value="All">All Payments ({delegates.length})</option>
                    <option value="PAID">🟢 Paid ({paidCount})</option>
                    <option value="PENDING_VERIFICATION">🟡 Pending ({pendingCount})</option>
                    <option value="REJECTED">🔴 Rejected ({rejectedCount})</option>
                  </select>

                  <select
                    value={filterArrivalStatus}
                    onChange={(e) => setFilterArrivalStatus(e.target.value)}
                    className="flex-1 min-w-[130px] px-3 py-2 sm:py-2.5 rounded-xl border border-gray-300 text-xs font-semibold bg-white outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
                  >
                    <option value="All">All Arrivals ({delegates.length})</option>
                    <option value="ARRIVED">🟢 Arrived ({arrivedCount})</option>
                    <option value="NOT_ARRIVED">⚪ Not Arrived ({notArrivedCount})</option>
                  </select>

                  <select
                    value={filterStudyRange}
                    onChange={(e) => setFilterStudyRange(e.target.value)}
                    className="flex-1 min-w-[110px] px-3 py-2 sm:py-2.5 rounded-xl border border-gray-300 text-xs font-semibold bg-white outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
                  >
                    <option value="All">All Ranges</option>
                    <option value="Mukhtasar">Mukhtasar</option>
                    <option value="Muthawwal">Muthawwal</option>
                  </select>
                </div>

                {/* Action buttons */}
                <div className="sm:col-span-5 md:col-span-3 lg:col-span-3 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setScannedPassIdTarget(null);
                      setScannerModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none bg-[#17472B] hover:bg-[#20603B] text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Scan Pass QR Code for Arrival Check-In"
                  >
                    <QrCode className="w-4 h-4 text-amber-300" />
                    <span>Scan Pass</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-gray-300"
                    title="Print complete delegate register"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-none bg-emerald-800 hover:bg-emerald-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
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
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 border-b border-gray-100 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[#17472B] text-xs bg-[#17472B]/10 px-2.5 py-1 rounded-lg border border-[#17472B]/15 shrink-0">
                        {d.id}
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-semibold shrink-0">
                        {d.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Arrival Pill */}
                      {d.arrived ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black uppercase">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          <span>ARRIVED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-medium">
                          <span>ABSENT</span>
                        </span>
                      )}

                      {/* Modern Pill Status */}
                      {(d.paymentStatus === 'PAID' || d.paymentStatus === 'Paid (₹200)') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-[10px] font-extrabold uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>PAID ₹200</span>
                        </span>
                      ) : d.paymentStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/90 text-[10px] font-extrabold uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>REJECTED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 text-[10px] font-extrabold uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>PENDING</span>
                        </span>
                      )}
                    </div>
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
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleArrival(d.id, !d.arrived);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
                          d.arrived
                            ? 'bg-teal-50 text-teal-800 border border-teal-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                            : 'bg-teal-700 hover:bg-teal-800 text-white'
                        }`}
                        title={d.arrived ? 'Undo Check-In' : 'Mark as Arrived at Venue'}
                      >
                        {d.arrived ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Arrived ✓</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-amber-300" />
                            <span>Check In</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintBadgeModal(d);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer border border-gray-200 shadow-xs touch-manipulation"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#17472B] pointer-events-none" />
                        <span>Badge</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditDelegate(d);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#17472B] border border-gray-200 hover:border-emerald-300 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-xs touch-manipulation"
                        title="Edit Delegate Details"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-700 pointer-events-none" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {(d.paymentStatus === 'PENDING_VERIFICATION' || d.paymentStatus === 'REJECTED') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewReceiptModal(d);
                          }}
                          className="px-3.5 py-2 bg-[#17472B] hover:bg-[#20603B] active:bg-[#0D382C] text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
                          title="Verify Receipt & Approve Payment"
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <th className="py-4 px-3 text-center w-12 whitespace-nowrap">#</th>
                      <th className="py-4 px-4 whitespace-nowrap">Pass ID</th>
                      <th className="py-4 px-4 whitespace-nowrap">Delegate Name</th>
                      <th className="py-4 px-4 whitespace-nowrap">Campus / Institution</th>
                      <th className="py-4 px-4 whitespace-nowrap">Address</th>
                      <th className="py-4 px-4 whitespace-nowrap">Phone & WhatsApp</th>
                      <th className="py-4 px-4 whitespace-nowrap">Study & Sanad (Degree)</th>
                      <th className="py-4 px-4 whitespace-nowrap">UTR & Receipt (₹200)</th>
                      <th className="py-4 px-4 whitespace-nowrap">Payment Status</th>
                      <th className="py-4 px-4 whitespace-nowrap">Arrival Status</th>
                      <th className="py-4 px-4 text-right whitespace-nowrap">Actions</th>
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

                        {/* Arrival Status & Quick Toggle */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {d.arrived ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                <span>ARRIVED</span>
                                {d.arrivedAt && (
                                  <span className="text-[9px] text-teal-700 font-normal font-mono ml-0.5">
                                    {new Date(d.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-semibold">
                                <span>NOT ARRIVED</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleArrival(d.id, !d.arrived)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                d.arrived
                                  ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-teal-700 hover:text-white hover:bg-teal-700 bg-teal-50 border border-teal-200'
                              }`}
                              title={d.arrived ? 'Undo arrival check-in' : 'Mark as arrived at venue'}
                            >
                              {d.arrived ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
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

                            <button
                              onClick={() => handleOpenEditDelegate(d)}
                              className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-[#17472B] hover:text-emerald-900 border border-gray-200 hover:border-emerald-300 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Edit Delegate Details"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Edit</span>
                            </button>

                            {(d.paymentStatus === 'PENDING_VERIFICATION' || d.paymentStatus === 'REJECTED') && (
                              <button
                                onClick={() => setViewReceiptModal(d)}
                                className="px-2.5 py-1.5 bg-[#17472B] hover:bg-[#20603B] text-white rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Inspect Payment Receipt & Approve"
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

                {/* QR Code Identification & Check-In */}
                <div className="bg-emerald-900/10 p-2.5 rounded-xl border border-emerald-800/20 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 select-none">
                    <div className="flex items-center gap-1 text-[#17472B] font-extrabold text-[10px] uppercase tracking-wider">
                      <QrCode className="w-3 h-3 text-emerald-700" />
                      <span>Official Pass QR</span>
                    </div>
                    <p className="text-[9px] text-gray-600 leading-tight">
                      Scan at venue reception for arrival check-in.
                    </p>
                    <div className="font-mono text-[9px] text-[#17472B] font-bold">
                      ID: {printBadgeModal.id}
                    </div>
                  </div>
                  <div className="bg-white p-1 rounded-lg shadow-sm shrink-0 border border-emerald-200">
                    <QRCodeSVG
                      value={`${window.location.origin}${window.location.pathname}?admin=true&scan=${encodeURIComponent(printBadgeModal.id)}`}
                      size={54}
                      level="M"
                      includeMargin={false}
                    />
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

      {/* Payment Verification & Receipt Inspection Modal */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative border border-gray-200 max-h-[94vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#17472B] flex items-center justify-center shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                    Verify Payment & Approve
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Secretariat Review • Inspect payment proof before granting official pass
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewReceiptModal(null)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 space-y-4 flex-grow pr-1">
              
              {/* Delegate Summary Card */}
              <div className="bg-gradient-to-r from-emerald-950 via-[#17472B] to-emerald-900 text-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-mono text-xs font-black text-amber-300 bg-black/30 px-2.5 py-0.5 rounded-lg border border-amber-300/30 inline-block mb-1">
                      {viewReceiptModal.id}
                    </span>
                    <h4 className="text-base font-black text-white">{viewReceiptModal.fullName}</h4>
                    <p className="text-xs text-emerald-200 font-medium">
                      {viewReceiptModal.phone} • {viewReceiptModal.status === 'Student' ? (viewReceiptModal.campus || 'Student') : (viewReceiptModal.position || 'Working')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Registration Fee</span>
                    <span className="text-lg font-black text-amber-300">₹200.00</span>
                    <div className="mt-0.5">
                      {(viewReceiptModal.paymentStatus === 'PAID' || viewReceiptModal.paymentStatus === 'Paid (₹200)') ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PAID</span>
                        </span>
                      ) : viewReceiptModal.paymentStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-extrabold uppercase">
                          <span>REJECTED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold uppercase">
                          <span>PENDING VERIFICATION</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* UTR / Transaction Reference Box */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/90 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
                    UTR / Transaction Ref Number
                  </span>
                  {viewReceiptModal.utrNumber && viewReceiptModal.utrNumber !== 'N/A' ? (
                    <span className="font-mono text-sm font-black text-gray-900 select-all block truncate">
                      {viewReceiptModal.utrNumber}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 font-semibold italic block">
                      No UTR Number entered by delegate
                    </span>
                  )}
                </div>

                {viewReceiptModal.utrNumber && viewReceiptModal.utrNumber !== 'N/A' && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewReceiptModal.utrNumber);
                      setCopiedUtr(true);
                      setTimeout(() => setCopiedUtr(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Copy UTR Number"
                  >
                    {copiedUtr ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                        <span>Copy UTR</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Payment Proof Screenshot Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>Payment Receipt Screenshot</span>
                  </label>

                  {viewReceiptModal.paymentScreenshot && (
                    <a
                      href={viewReceiptModal.paymentScreenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Open Original Image</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {viewReceiptModal.paymentScreenshot ? (
                  <div className="bg-gray-900 rounded-2xl overflow-hidden border-2 border-emerald-600/30 flex items-center justify-center p-2 min-h-[220px] max-h-[360px] relative group">
                    <img
                      src={viewReceiptModal.paymentScreenshot}
                      alt={`Payment Receipt for ${viewReceiptModal.fullName}`}
                      className="max-h-[340px] w-auto max-w-full object-contain rounded-xl shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-amber-900">No Screenshot Uploaded</h5>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        The delegate registered without uploading a payment screenshot. Please verify the <strong>₹200</strong> receipt directly in your UPI / Bank App using UTR: <strong className="font-mono">{viewReceiptModal.utrNumber || 'N/A'}</strong> before approving.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-gray-100 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setViewReceiptModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {viewReceiptModal.paymentStatus !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = viewReceiptModal.id;
                      setViewReceiptModal(null);
                      handleRejectPayment(id);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  >
                    Reject Payment
                  </button>
                )}

                {viewReceiptModal.paymentStatus !== 'PAID' && (
                  <button
                    type="button"
                    onClick={() => handleApprovePayment(viewReceiptModal.id)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#17472B] hover:bg-[#20603B] shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-amber-300" />
                    <span>Verify & Approve (₹200)</span>
                  </button>
                )}
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

      {/* Edit Delegate Modal */}
      {editingDelegate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative border border-emerald-100 my-8 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#17472B] flex items-center justify-center shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    Edit Delegate Info
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-[#17472B] bg-[#17472B]/10 px-2 py-0.5 rounded-md">
                      {editingDelegate.id}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Registered: {editingDelegate.registeredAt}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditingDelegate(null)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Body */}
            <form onSubmit={handleSaveDelegateChanges} className="overflow-y-auto py-4 space-y-4 flex-grow pr-1">
              
              {editDelegateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                  {editDelegateError}
                </div>
              )}

              {/* Row 1: Name & Age */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editDelegateForm.fullName}
                    onChange={(e) => setEditDelegateForm({ ...editDelegateForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="100"
                    value={editDelegateForm.age}
                    onChange={(e) => setEditDelegateForm({ ...editDelegateForm, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editDelegateForm.phone}
                    onChange={(e) => setEditDelegateForm({ ...editDelegateForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={editDelegateForm.whatsapp}
                    onChange={(e) => setEditDelegateForm({ ...editDelegateForm, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Status & Campus / Position */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={editDelegateForm.status}
                    onChange={(e) => setEditDelegateForm({ ...editDelegateForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 bg-white cursor-pointer"
                  >
                    <option value="Student">Student</option>
                    <option value="Working">Working</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {editDelegateForm.status === 'Student' ? 'Campus / Institution Name' : 'Position / Designation'}
                  </label>
                  <input
                    type="text"
                    value={editDelegateForm.status === 'Student' ? editDelegateForm.campus : editDelegateForm.position}
                    onChange={(e) => {
                      if (editDelegateForm.status === 'Student') {
                        setEditDelegateForm({ ...editDelegateForm, campus: e.target.value });
                      } else {
                        setEditDelegateForm({ ...editDelegateForm, position: e.target.value });
                      }
                    }}
                    placeholder={editDelegateForm.status === 'Student' ? 'e.g. Markaz Karanthur' : 'e.g. Mudarris / Usthad'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Row 4: Study Range & Sanad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Study Range</label>
                  <select
                    value={editDelegateForm.studyRange}
                    onChange={(e) => setEditDelegateForm({ ...editDelegateForm, studyRange: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 bg-white cursor-pointer"
                  >
                    <option value="Mukhtasar">Mukhtasar</option>
                    <option value="Muthawwal">Muthawwal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sanad (Degree / Birudam)</label>
                  <input
                    type="text"
                    value={editDelegateForm.sanad}
                    onChange={(e) => setEditDelegateForm({ ...editDelegateForm, sanad: e.target.value })}
                    placeholder="e.g. Wafy, Saadi, Siraji, Dars, or N/A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Row 5: Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Address / Mahal / Place</label>
                <textarea
                  rows="2"
                  value={editDelegateForm.address}
                  onChange={(e) => setEditDelegateForm({ ...editDelegateForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 bg-white resize-none"
                />
              </div>

              {/* Row 6: Payment Status & UTR Number */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="text-xs font-black text-gray-800 uppercase tracking-wide">
                  Payment & Verification
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Payment Status</label>
                    <select
                      value={editDelegateForm.paymentStatus}
                      onChange={(e) => setEditDelegateForm({ ...editDelegateForm, paymentStatus: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-extrabold outline-none bg-white cursor-pointer"
                    >
                      <option value="PENDING_VERIFICATION">🟡 Pending Verification</option>
                      <option value="PAID">🟢 Paid (Verified ₹200)</option>
                      <option value="REJECTED">🔴 Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">UTR / Ref Number</label>
                    <input
                      type="text"
                      value={editDelegateForm.utrNumber}
                      onChange={(e) => setEditDelegateForm({ ...editDelegateForm, utrNumber: e.target.value })}
                      placeholder="12-digit UTR Number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-emerald-600 bg-white font-mono"
                    />
                  </div>
                </div>

                {editDelegateForm.paymentStatus === 'REJECTED' && (
                  <div>
                    <label className="block text-xs font-bold text-rose-700 mb-1">Rejection Reason</label>
                    <input
                      type="text"
                      value={editDelegateForm.rejectionReason}
                      onChange={(e) => setEditDelegateForm({ ...editDelegateForm, rejectionReason: e.target.value })}
                      placeholder="e.g. Invalid UTR number or payment not received"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 text-xs font-semibold outline-none focus:border-rose-500 bg-rose-50/50"
                    />
                  </div>
                )}

                {/* Payment Screenshot Upload / Preview / Replace */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>Payment Receipt Screenshot</span>
                    {editDelegateForm.paymentScreenshot ? (
                      <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100 px-2 py-0.5 rounded">
                        Screenshot Attached
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-medium italic">
                        No image attached
                      </span>
                    )}
                  </label>

                  {editDelegateForm.paymentScreenshot ? (
                    <div className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-xs">
                      <img
                        src={editDelegateForm.paymentScreenshot}
                        alt="Payment Receipt"
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
                        onClick={() => window.open(editDelegateForm.paymentScreenshot, '_blank')}
                        title="Click to view full screenshot"
                      />
                      <div className="flex-grow space-y-1">
                        <div className="text-xs font-bold text-gray-800">Attached Receipt Image</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(editDelegateForm.paymentScreenshot, '_blank')}
                            className="text-[11px] text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Full</span>
                          </button>
                          <span className="text-gray-300">•</span>
                          <label className="text-[11px] text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer">
                            <Upload className="w-3 h-3" />
                            <span>Replace</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditScreenshotChange}
                              className="hidden"
                            />
                          </label>
                          <span className="text-gray-300">•</span>
                          <button
                            type="button"
                            onClick={handleRemoveEditScreenshot}
                            className="text-[11px] text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-emerald-50 text-[#17472B] border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                        <Upload className="w-4 h-4 text-emerald-700" />
                        <span>Upload / Attach Payment Screenshot Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditScreenshotChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Checkbox: Alfiyya & Fathul Mueen */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none p-1">
                <input
                  type="checkbox"
                  checked={editDelegateForm.studiedAlfiyyaAndFathulMueen}
                  onChange={(e) => setEditDelegateForm({ ...editDelegateForm, studiedAlfiyyaAndFathulMueen: e.target.checked })}
                  className="w-4 h-4 text-[#17472B] rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-700">
                  Studied Alfiyya & Fathul Mueen
                </span>
              </label>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingDelegate(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editDelegateSaving}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#17472B] hover:bg-[#20603B] shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{editDelegateSaving ? 'Saving Changes...' : 'Save Delegate Changes'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Floating QR Scanner Action Button for Quick Check-In */}
      <button
        type="button"
        onClick={() => {
          setScannedPassIdTarget(null);
          setScannerModalOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#17472B] to-[#1f5a38] hover:from-[#1f5a38] hover:to-[#267045] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 border-2 border-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Open QR Scanner & Arrival Check-In"
      >
        <div className="relative">
          <QrCode className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
          </span>
        </div>
        <span className="hidden sm:inline font-extrabold text-xs tracking-wide">
          Scan Pass / Check In
        </span>
      </button>

      {/* QR Scanner & Arrival Check-In Modal */}
      <QRScannerModal
        isOpen={scannerModalOpen}
        onClose={() => {
          setScannerModalOpen(false);
          setScannedPassIdTarget(null);
        }}
        delegates={delegates}
        onToggleArrival={handleToggleArrival}
        onApprovePayment={(d) => {
          const delegateObj = typeof d === 'object' ? d : delegates.find((x) => x.id === d);
          if (delegateObj) {
            setScannerModalOpen(false);
            setViewReceiptModal(delegateObj);
          } else {
            handleApprovePayment(d);
          }
        }}
        onPrintBadge={(d) => {
          setScannerModalOpen(false);
          setPrintBadgeModal(d);
        }}
        initialPassId={scannedPassIdTarget}
      />

    </div>
  );
}
