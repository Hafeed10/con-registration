import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import confiqLogo from '../assets/CONFIQ.png';
import vectorSmartObject from '../assets/Vector Smart Object.png';
import group8Img from '../assets/Group 8.png';
import qrCodeImg from '../assets/q.code 3.jpeg';
import {
  CheckCircle, Printer, User, Phone, MapPin,
  Award, Briefcase, GraduationCap, Sparkles, Copy,
  Upload, AlertCircle, CreditCard, FileCheck, Trash2, Calendar, MapPin as MapPinIcon, ShieldCheck, Lock, ChevronDown, Download
} from 'lucide-react';

export default function RegistrationPage({ onOpenAdmin }) {
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
      navigator.clipboard.writeText('thulaib123@okicici');
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3500);
  };
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyPhone = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('7558889458');
    }
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 3500);
  };

  const handleUpiPayClick = (e, app = 'gpay') => {
    if (e) e.preventDefault();
    if (navigator.clipboard) {
      navigator.clipboard.writeText('thulaib123@okicici');
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3500);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    if (app === 'gpay') {
      window.location.href = `gpay://upi/pay?${upiParams}`;
    } else if (app === 'phonepe') {
      window.location.href = `phonepe://upi/pay?${upiParams}`;
    } else if (app === 'paytm') {
      window.location.href = `paytmmp://upi/pay?${upiParams}`;
    } else if (app === 'bhim') {
      window.location.href = `bhim://upi/pay?${upiParams}`;
    } else {
      window.location.href = `upi://pay?${upiParams}`;
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

  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [delegatePass, setDelegatePass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // STRICT VALIDATION: Payment screenshot is MANDATORY
    if (!paymentScreenshot) {
      setPaymentError('⚠️ Payment Screenshot Required! Please scan the QR code to pay ₹200 and attach your payment receipt screenshot before submitting.');
      return;
    }

    setIsSubmitting(true);
    setPaymentError('');

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
      paymentScreenshot: paymentScreenshot,
      paymentStatus: 'Paid (₹200)',
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
        payment_screenshot: paymentScreenshot,
        payment_status: 'Paid (₹200)'
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

                  {/* QR Code & UPI Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-2.5 bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border border-orange-200/80 shadow-inner">
                      <div className="relative group overflow-hidden rounded-xl border-2 border-orange-500/40 p-1 bg-white">
                        <img
                          src={qrCodeImg}
                          alt="conFiqh Registration Payment QR Code - ₹200"
                          className="w-36 h-36 xs:w-40 xs:h-40 sm:w-44 sm:h-44 max-w-full object-contain rounded shadow-sm"
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-orange-800 mt-2 bg-orange-100/90 px-2 py-0.5 rounded">
                        SCAN TO PAY ₹200
                      </span>

                      {/* Download QR Code Button */}
                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-extrabold shadow-2xs transition-all text-center cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download QR Code</span>
                      </button>

                      {/* Direct GPay / PhonePe App Launch Button */}
                      <a
                        href={upiDeepLink}
                        onClick={handleUpiPayClick}
                        className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#17472B] hover:bg-[#0E4023] text-white rounded-lg text-xs font-extrabold shadow-sm transition-all text-center shrink-0 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay ₹200 via GPay / PhonePe</span>
                      </a>

                      {/* Copy UPI ID Button */}
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="mt-1.5 w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-[#17472B] border border-emerald-300 rounded-lg text-[11px] font-mono font-bold shadow-2xs transition-all cursor-pointer"
                        title="Click to copy UPI ID"
                      >
                        <span className="truncate">UPI ID: thulaib123@okicici</span>
                        {copiedUpi ? (
                          <span className="text-[10px] font-sans font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">Copied!</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </button>

                      {/* Copy Phone Number Button */}
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="mt-1.5 w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-[#17472B] border border-emerald-300 rounded-lg text-[11px] font-mono font-bold shadow-2xs transition-all cursor-pointer"
                        title="Click to copy GPay/PhonePe Mobile Number"
                      >
                        <span className="truncate">Number: 7558889458</span>
                        {copiedPhone ? (
                          <span className="text-[10px] font-sans font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">Copied!</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    </div>

                    <div className="sm:col-span-7 space-y-2.5">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>1. Pay ₹200 via UPI App, Mobile Number, or QR Code</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-600 pl-5 sm:pl-6 leading-relaxed">
                          Mobile Number: <strong className="text-[#17472B] font-mono">7558889458</strong><br />
                          UPI ID: <strong className="text-[#17472B] font-mono">thulaib123@okicici</strong>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>2. Complete ₹200 Payment</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-600 pl-5 sm:pl-6">
                          General Fee: <strong>₹200 (INR)</strong>
                        </p>
                      </div>

                      {/* Bank Limit Notice Fix */}
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 font-medium space-y-1">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Bank Limit Error Fix:
                        </span>
                        <p className="pl-4 leading-normal text-amber-900/90">
                          If GPay / Bank shows <em>"Exceeded bank limit"</em>, tap <strong>UPI ID</strong> or <strong>Number</strong> to copy, then paste directly into GPay/PhonePe to complete payment.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>3. Upload Screenshot Below</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Screenshot Upload Box */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-[#17472B] tracking-wider mb-1.5">
                      Upload Payment Screenshot *
                    </label>

                    {!paymentScreenshot ? (
                      <div className={`relative border-2 border-dashed rounded-xl p-3.5 sm:p-5 text-center cursor-pointer transition-all ${paymentError
                        ? 'border-red-500 bg-red-50/50 hover:bg-red-50'
                        : 'border-emerald-600/40 bg-emerald-50/30 hover:bg-emerald-50/70 hover:border-emerald-600'
                        }`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 text-[#17472B] flex items-center justify-center">
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold text-[#17472B] hover:underline">
                              Click to select payment screenshot
                            </span>
                            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 mt-0.5">
                              Supports JPG, PNG, WEBP receipts
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl border-2 border-emerald-500 flex items-center justify-between gap-2.5 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-emerald-300 shrink-0 bg-gray-100">
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
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shrink-0"
                          title="Remove screenshot"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    )}
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
                      <span>Submit Registration & Issue Pass</span>
                    )}
                  </button>
                </div>

              </form>

            </div>
          ) : (
            /* Success & Printable Delegate Pass */
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#CCE5B4] text-center">

              <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="font-sans text-2xl sm:text-3xl font-black text-[#17472B]">
                Registration Confirmed!
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-[#387B52] mt-1 mb-8">
                Your official delegate pass for conFiqh 2026 has been generated.
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
                  <span>Print / Save Delegate Pass</span>
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
