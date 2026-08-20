import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import confiqLogo from '../assets/CONFIQ.png';
import vectorSmartObject from '../assets/Vector Smart Object.png';
import group8Img from '../assets/Group 8.png';
import qrCodeImg from '../assets/q.code4.jpeg';
import {
  CheckCircle, Printer, User, Phone, MapPin,
  Award, Briefcase, GraduationCap, Sparkles, Copy,
  Upload, AlertCircle, CreditCard, FileCheck, Trash2, Calendar, MapPin as MapPinIcon, ShieldCheck, Lock, ChevronDown, Download, ExternalLink
} from 'lucide-react';

export default function RegistrationPage({ onOpenAdmin }) {
  const MAX_DELEGATES_LIMIT = 200;
  const [showFeeIncludes, setShowFeeIncludes] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const upiParams = "pa=thulaib123@okicici&pn=CONFIQ%20Secretariat&cu=INR";
  const upiDeepLink = `upi://pay?${upiParams}`;

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrCodeImg);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CONFIQ_Payment_QR.jpeg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(qrCodeImg, '_blank');
    }
  };

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('7558889458@upi');
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3500);
  };

  const handleUpiPayClick = (e) => {
    if (e) e.preventDefault();

    const upiId = '7558889458@upi';
    const name = 'CONFIQ Secretariat';

    // Copy UPI ID to clipboard first
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3500);

    const userAgent = navigator.userAgent || '';
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(userAgent);
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Only launch scheme URL on real mobile devices to prevent Chrome DevTools/Desktop network errors
    if (!isMobileUA || !isTouchDevice) return;

    // Fixed UPI params: Added am=200 & cu=INR & tn=CONFIQ2026
    const upiParams = `pa=${upiId}&pn=${encodeURIComponent(name)}&am=200&cu=INR&tn=CONFIQ2026`;
    const targetUrl = `upi://pay?${upiParams}`;

    try {
      window.location.href = targetUrl;
    } catch (err) {
      console.log('UPI payment launch error:', err);
    }
  };
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    address: '',
    phone: '',
    whatsapp: '',
    studyRange: 'Muthawwal',
    birudam: '',
    status: 'Student',
    campus: '',
    position: '',
    studiedAlfiyyaAndFathulMueen: true
  });

  const [utrNumber, setUtrNumber] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [delegatePass, setDelegatePass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);

  const handleOpenRazorpay = (e) => {
    if (e) e.preventDefault();
    setShowRazorpayModal(true);
  };

  const copyPhoneToWhatsapp = () => {
    setFormData((prev) => ({ ...prev, whatsapp: prev.phone }));
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPaymentError('Please select a valid payment screenshot image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setScreenshotFileName(file.name);
    setPaymentError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentScreenshot(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setPaymentScreenshot(null);
    setScreenshotFileName('');
    setPaymentError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    setPaymentError('');
    const trimmedUtr = utrNumber.trim();

    const passId = 'CF-2026-' + Math.floor(1000 + Math.random() * 9000);
    const newDelegate = {
      id: passId,
      fullName: formData.fullName,
      age: formData.age,
      address: formData.address,
      phone: formData.phone,
      whatsapp: formData.whatsapp || formData.phone,
      studyRange: formData.studyRange,
      birudam: formData.birudam || 'N/A',
      status: formData.status,
      campus: formData.status === 'Student' ? formData.campus : 'N/A',
      position: formData.status === 'Working' ? formData.position : 'N/A',
      studiedAlfiyyaAndFathulMueen: formData.studiedAlfiyyaAndFathulMueen,
      utrNumber: trimmedUtr || 'N/A',
      paymentScreenshot: paymentScreenshot,
      paymentStatus: 'PENDING_VERIFICATION',
      registeredAt: new Date().toLocaleDateString()
    };

    // Save to Supabase Cloud Database with fallback safety
    try {
      const basePayload = {
        pass_id: passId,
        full_name: formData.fullName,
        age: parseInt(formData.age) || 20,
        address: formData.address,
        phone: formData.phone,
        whatsapp: formData.whatsapp || formData.phone,
        study_range: formData.studyRange,
        birudam: formData.birudam || 'N/A',
        status: formData.status,
        campus: formData.status === 'Student' ? formData.campus : 'N/A',
        position: formData.status === 'Working' ? formData.position : 'N/A',
        studied_alfiyya: formData.studiedAlfiyyaAndFathulMueen
      };

      const fullPayload = {
        ...basePayload,
        utr_number: trimmedUtr || null,
        payment_screenshot: paymentScreenshot,
        payment_status: 'PENDING_VERIFICATION',
        amount: 200
      };

      const res1 = await supabase.from('delegates').insert([fullPayload]).select();

      if (res1.error) {
        console.warn('Payment columns missing in Supabase schema. Retrying core payload insert:', res1.error.message);
        const res2 = await supabase.from('delegates').insert([basePayload]).select();
        if (res2.error) {
          console.error('Supabase fallback DB Insert error:', res2.error.message);
        } else {
          console.log('Successfully saved delegate record to Supabase DB (core payload):', res2.data);
        }
      } else {
        console.log('Successfully saved delegate record to Supabase DB:', res1.data);
      }
    } catch (err) {
      console.error('Supabase connection exception:', err.message);
    }

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.log('Confetti effect triggered');
    }

    setIsSubmitting(false);
    setDelegatePass(newDelegate);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setSubmitted(false);
    setDelegatePass(null);
    setUtrNumber('');
    setPaymentScreenshot(null);
    setScreenshotFileName('');
    setPaymentError('');
    setFormData({
      fullName: '',
      age: '',
      address: '',
      phone: '',
      whatsapp: '',
      studyRange: 'Muthawwal',
      birudam: '',
      status: 'Student',
      campus: '',
      position: '',
      studiedAlfiyyaAndFathulMueen: true
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F9F1] text-gray-900 flex flex-col font-sans selection:bg-[#17472B] selection:text-white">

      {/* Top Header Bar (Light Green Theme - Compact Slim Height) */}
      <header className="bg-[#f5faed]/95 backdrop-blur-md text-[#17472B] border-b border-[#C5DF9F] shadow-xs sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2">

          {/* Logo & Desktop Edition Badge */}
          <div className="flex items-center space-x-2 sm:space-x-3 select-none shrink-0">
            <img src={confiqLogo} alt="CON FIQ Logo" className="h-5 sm:h-7 object-contain" />
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-[#17472B] text-white uppercase tracking-wider shadow-xs whitespace-nowrap shrink-0">
              1ST EDITION
            </span>
          </div>

          {/* Right side info (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center space-x-4 md:space-x-6 text-xs text-[#17472B] font-bold whitespace-nowrap shrink-0">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#387B52] shrink-0" />
              <span>11 , 12 Sept 2026</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <MapPinIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#387B52] shrink-0" />
              <span>Parapram, Kannur</span>
            </div>
          </div>

          {/* Mobile Edition Badge */}
          <div className="sm:hidden font-sans text-[9px] font-black bg-[#17472B] text-white px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap shrink-0">
            1ST EDITION
          </div>

        </div>
      </header>

      {/* Main Registration Form Area */}
      <main className="flex-grow py-4 sm:py-8 px-2.5 sm:px-6 w-full max-w-full overflow-x-hidden">
        <div className="max-w-3xl mx-auto w-full">

          {!submitted ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 md:p-10 shadow-xl border border-[#CCE5B4] relative w-full max-w-full overflow-hidden">

              {/* Title Header matching model mockup */}
              <div className="text-center mb-8 border-b border-[#E0EFE0] pb-6 flex flex-col items-center justify-center space-y-3">

                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EBF5DA] text-[#17472B] text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-[#387B52]" />
                  <span>Official Delegate Registration</span>
                </div>

                <div className="text-center pt-1">
                  <p className="text-[11px] sm:text-xs font-bold text-[#17472B]/80 tracking-widest uppercase mb-1">
                    The First Edition of
                  </p>

                  {/* CONFIQ Logo Image */}
                  <div className="flex items-center justify-center">
                    <img src={confiqLogo} alt="CON FIQ Logo" className="w-[240px] sm:w-[340px] md:w-[400px] max-w-full h-auto object-contain" />
                  </div>
                </div>

                {/* Keralam Fiqh Summit 2026 Banner */}
                <div className="flex items-center justify-center pt-1">
                  <img src={vectorSmartObject} alt="Keralam Fiqh Summit 2026" className="w-[220px] sm:w-[300px] md:w-[340px] max-w-full h-auto object-contain" />
                </div>

                {/* Date & Location Graphic */}
                <div className="flex items-center justify-center pt-1">
                  <img src={group8Img} alt="11 12 September 2026 AHLUSSUFFA Parapram Pinarayi" className="w-[180px] sm:w-[240px] md:w-[270px] max-w-full h-auto object-contain" />
                </div>

              </div>

              {/* Information Note */}
              <div className="bg-[#EBF5DA] p-4 rounded-2xl border border-[#CCE5B4] mb-8 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#17472B] shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-[#2A4222] font-medium leading-relaxed">
                  Delegate registration is open for eligible Islamic scholars, Muthawwal & Mukhtasar students, and research fellows. Please fill out your details below.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Name & Age */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="15"
                      max="90"
                      placeholder="e.g. 24"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 2. Address */}
                <div>
                  <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <textarea
                      required
                      rows="2"
                      placeholder="Enter your full residential / institutional address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* 3. Phone & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                      Phone No *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider">
                        WhatsApp Number *
                      </label>
                      <button
                        type="button"
                        onClick={copyPhoneToWhatsapp}
                        className="text-xs font-bold text-[#387B52] hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Same as Phone
                      </button>
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Study Range & Birudam */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                      Study Range *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`cursor-pointer py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${formData.studyRange === 'Mukhtasar'
                        ? 'bg-[#17472B] text-white border-[#17472B] shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}>
                        <input
                          type="radio"
                          name="studyRange"
                          value="Mukhtasar"
                          checked={formData.studyRange === 'Mukhtasar'}
                          onChange={(e) => setFormData({ ...formData, studyRange: e.target.value })}
                          className="sr-only"
                        />
                        Mukhtasar
                      </label>

                      <label className={`cursor-pointer py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${formData.studyRange === 'Muthawwal'
                        ? 'bg-[#17472B] text-white border-[#17472B] shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}>
                        <input
                          type="radio"
                          name="studyRange"
                          value="Muthawwal"
                          checked={formData.studyRange === 'Muthawwal'}
                          onChange={(e) => setFormData({ ...formData, studyRange: e.target.value })}
                          className="sr-only"
                        />
                        Muthawwal
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                      Birudam (Degree - If any)
                    </label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="e.g. Saqafi, Ahsani, B.A, M.A"
                        value={formData.birudam}
                        onChange={(e) => setFormData({ ...formData, birudam: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-sm font-medium outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Occupation Status */}
                <div>
                  <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                    Current Occupation Status *
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label className={`cursor-pointer py-3 px-3 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-2 transition-all ${formData.status === 'Student'
                      ? 'bg-[#17472B] text-white border-[#17472B] shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}>
                      <input
                        type="radio"
                        name="status"
                        value="Student"
                        checked={formData.status === 'Student'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="sr-only"
                      />
                      <GraduationCap className="w-4 h-4 shrink-0" />
                      <span>Student</span>
                    </label>

                    <label className={`cursor-pointer py-3 px-3 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-2 transition-all ${formData.status === 'Working'
                      ? 'bg-[#17472B] text-white border-[#17472B] shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}>
                      <input
                        type="radio"
                        name="status"
                        value="Working"
                        checked={formData.status === 'Working'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="sr-only"
                      />
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>Working</span>
                    </label>
                  </div>

                  {formData.status === 'Student' ? (
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                        Campus / Institution Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AHLUSSUFFA Dars / Calicut Univ"
                        value={formData.campus}
                        onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] text-sm font-medium outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1.5">
                        Position / Designation *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mudarris, Research Fellow, Teacher"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#17472B] text-sm font-medium outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 6. Eligibility Note */}
                <div className="p-4 bg-[#EBF5DA] rounded-2xl border border-[#B3D98E]">
                  <div className="text-xs sm:text-sm text-[#1F281B]">
                    <span className="font-extrabold text-[#17472B] block text-sm mb-1">
                      Eligibility Requirement *
                    </span>
                    Registration is intended for delegates studying <strong>Alfiyya ibn Malik</strong> and <strong>Fathul Mueen (Baabul Ibaadaath)</strong>.
                  </div>
                </div>

                {/* 7. Fee ₹200 & QR Code Section */}
                <div className="bg-gradient-to-br from-amber-50/80 via-emerald-50/50 to-white rounded-2xl p-3.5 sm:p-6 border-2 border-emerald-600/30 shadow-md space-y-4 max-w-full overflow-hidden">

                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 border-b border-emerald-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 sm:p-2.5 bg-[#17472B] text-white rounded-xl shadow-sm shrink-0">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-[#17472B]">
                          General Pass: ₹200
                        </h4>
                        <p className="text-[11px] sm:text-xs text-gray-600">
                          Scan QR Code to pay ₹200 & upload payment screenshot
                        </p>
                      </div>
                    </div>

                    <span className="self-start xs:self-auto px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm shrink-0">
                      Payment Required
                    </span>
                  </div>

                  {/* Fee Includes Collapsible Dropdown Option */}
                  <div className="bg-emerald-50/80 rounded-xl p-2.5 sm:p-3 border border-emerald-200/80">
                    <button
                      type="button"
                      onClick={() => setShowFeeIncludes(!showFeeIncludes)}
                      className="w-full flex items-center justify-between gap-2 text-left font-extrabold text-xs sm:text-sm text-[#17472B] hover:text-[#0E4023] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Fee Includes (Click to {showFeeIncludes ? 'Close' : 'Open'})</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform duration-200 shrink-0 ${showFeeIncludes ? 'rotate-180' : ''}`} />
                    </button>

                    {showFeeIncludes && (
                      <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#17472B] animate-fadeIn">
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Full access to CONFIQ-2026</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Food & Refreshments</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Accommodation</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>CONFIQ Summit Note / Study Material</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Razorpay Action Card */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                          Instant Checkout
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Secured
                        </span>
                      </div>
                      <h5 className="font-extrabold text-sm sm:text-base text-[#17472B]">
                        Pay ₹200 Online (UPI, Cards, NetBanking, Paytm)
                      </h5>
                      <p className="text-xs text-gray-600">
                        Fast & secure payment popup modal without leaving this page
                      </p>
                    </div>

                    <a
                      href="https://rzp.io/rzp/afiIk3Q"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-[#17472B] to-[#20603B] hover:from-[#0E4023] hover:to-[#17472B] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ₹200 via Razorpay</span>
                      <ExternalLink className="w-4 h-4 text-amber-300" />
                    </a>
                  </div>

                  {/* UPI Payment Copy Box & Screenshot Upload (No QR Code) */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 text-[#17472B] rounded-lg">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <h5 className="font-extrabold text-sm sm:text-base text-[#17472B]">
                          Pay via UPI ID & Upload Receipt
                        </h5>
                      </div>
                    </div>

                    {/* UPI ID Copy Link Box */}
                    <div className="bg-emerald-50/80 p-3 sm:p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0">
                        <span className="font-mono font-extrabold text-sm sm:text-base text-[#17472B] select-all block truncate">
                          7558889458@upi
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#17472B] hover:bg-[#20603B] text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                        title=""
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Screenshot Upload Field */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-xs font-extrabold uppercase text-[#17472B] tracking-wider mb-1">
                        Upload Payment Screenshot (Required if paying via UPI)
                      </label>
                      <p className="text-[11px] font-semibold text-gray-500 mb-2">
                        Optional if paying via Razorpay online. Required only if using direct UPI transfer.
                      </p>

                      {!paymentScreenshot ? (
                        <div className={`relative border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${paymentError
                          ? 'border-red-500 bg-red-50/50 hover:bg-red-50'
                          : 'border-emerald-600/40 bg-emerald-50/40 hover:bg-emerald-50/80 hover:border-emerald-600'
                          }`}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex flex-col items-center justify-center space-y-1.5">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#17472B] flex items-center justify-center">
                              <Upload className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs sm:text-sm font-extrabold text-[#17472B] hover:underline">
                                Click to upload payment screenshot
                              </span>
                              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 mt-0.5">
                                Supports JPG, PNG, WEBP receipts (Optional for Razorpay)
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-3 rounded-xl border-2 border-emerald-500 flex items-center justify-between gap-3 shadow-sm overflow-hidden">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-300 shrink-0 bg-gray-100">
                              <img
                                src={paymentScreenshot}
                                alt="Payment Screenshot Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">Screenshot Attached</span>
                              </div>
                              <div className="text-[11px] font-mono text-gray-600 truncate mt-0.5">
                                {screenshotFileName || 'receipt.png'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleRemoveScreenshot}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            title="Remove screenshot"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Box */}
                {paymentError && (
                  <div className="p-3.5 bg-red-50 rounded-xl border-2 border-red-400 text-red-800 text-xs font-extrabold flex items-start gap-2.5 shadow-sm">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-3 sm:pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#17472B] hover:bg-[#20603B] text-white py-3.5 sm:py-4 px-3 sm:px-6 rounded-2xl font-extrabold text-sm sm:text-base leading-snug shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Processing Registration...</span>
                    ) : (
                      <span>Submit Payment & Register</span>
                    )}
                  </button>
                </div>

              </form>

            </div>
          ) : (
            /* Success & Printable Delegate Pass */
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#CCE5B4] text-center">

              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="font-sans text-2xl sm:text-3xl font-black text-[#17472B]">
                Registration Received!
              </h2>
              <div className="inline-block my-2 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded-full text-xs font-black uppercase tracking-wider">
                🟡 PAYMENT UNDER VERIFICATION
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[#387B52] mt-1 mb-6 max-w-md mx-auto">
                Your payment details have been submitted. Your delegate pass will be fully activated upon Secretariat verification against bank records.
              </p>

              {/* Printable Pass Card */}
              <div id="printable-pass" className="bg-[#17472B] text-white rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border-4 border-[#354823] text-left max-w-xl mx-auto">

                <div className="flex items-center justify-between border-b border-[#354823] pb-4 mb-5">
                  <div className="flex items-center space-x-2 select-none">
                    <img src={confiqLogo} alt="CON FIQ Logo" className="h-6 sm:h-8 object-contain brightness-0 invert" />
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-[#354823] text-white uppercase tracking-wider">
                      1ST EDITION
                    </span>
                  </div>

                  <div className="font-mono text-xs sm:text-sm text-[#C5DF9F] font-bold bg-[#354823] px-3 py-1 rounded-lg">
                    {delegatePass.id}
                  </div>
                </div>

                <div className="space-y-4 my-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest block mb-0.5">Delegate Name</span>
                    <span className="font-sans text-2xl sm:text-3xl font-black text-white">{delegatePass.fullName} ({delegatePass.age} yrs)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs bg-[#20603B]/60 p-4 rounded-xl border border-[#354823]">
                    <div>
                      <span className="text-[10px] text-gray-300 block mb-0.5 uppercase tracking-wider">Study Range</span>
                      <span className="font-bold text-[#C5DF9F] text-base">{delegatePass.studyRange}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-300 block mb-0.5 uppercase tracking-wider">Status / Birudam</span>
                      <span className="font-bold text-white text-xs truncate block">
                        {delegatePass.status} {delegatePass.birudam !== 'N/A' ? `• ${delegatePass.birudam}` : ''}
                      </span>
                    </div>
                  </div>

                  {delegatePass.utrNumber && delegatePass.utrNumber !== 'N/A' && (
                    <div className="text-xs bg-[#123620] p-2.5 rounded-lg border border-emerald-700/60 flex items-center justify-between font-mono">
                      <span className="text-gray-300 text-[11px]">UTR Ref:</span>
                      <span className="font-bold text-[#C5DF9F]">{delegatePass.utrNumber}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-gray-300 block mb-0.5 uppercase tracking-wider">Institution / Designation</span>
                    <span className="text-sm font-semibold text-gray-200 block">
                      {delegatePass.status === 'Student' ? delegatePass.campus : delegatePass.position}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#354823] flex items-center justify-between text-xs text-gray-300 font-semibold">
                  <span>📍 Parapram, Pinarayi, Kannur</span>
                  <span>📅 11–12 Sept 2026</span>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-[#17472B] hover:bg-[#20603B] text-white py-3.5 rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save Pass</span>
                </button>

                <button
                  onClick={resetForm}
                  className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all"
                >
                  Register Another Delegate
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Footer (Light Green Navbar Theme) */}
      <footer className="bg-[#EBF5DA] text-[#17472B] py-6 border-t border-[#C5DF9F] text-xs">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-2">
          {/* CONFIQ Logo */}
          <div className="flex items-center justify-center">
            <img src={confiqLogo} alt="CON FIQ Logo" className="h-6 sm:h-7 object-contain" />
          </div>
          <p className="font-extrabold text-[#17472B]">
            Keralam Fiqh Summit 2026
          </p>
          <p className="text-[#387B52] font-extrabold text-xs sm:text-sm">
            AHLUSSUFFA Dars • Parapram, Pinarayi, Kannur, Kerala
          </p>
          <p className="text-gray-600 text-[18px]  font-semibold">

            Date: <span className="font-extrabold text-[#17472B]">
              11 , 12 September
            </span> 2026

          </p>
          <p>
            Email: confiq@ahlussuffadars.in
          </p>
        </div>
      </footer>

    </div>
  );
}
