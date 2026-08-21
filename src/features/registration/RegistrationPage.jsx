import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import confiqLogo from '../../assets/CONFIQ.png';
import vectorSmartObject from '../../assets/Vector Smart Object.png';
import group8Img from '../../assets/Group 8.png';
import phonepeQrImg from '../../assets/image.jpeg';
import {
  CheckCircle, Printer, User, Phone, MapPin,
  Award, Briefcase, GraduationCap, Sparkles, Copy,
  Upload, AlertCircle, CreditCard, FileCheck, Trash2, Calendar, MapPin as MapPinIcon, ShieldCheck, Lock, ChevronDown, Download, ExternalLink
} from 'lucide-react';

export default function RegistrationPage({ onOpenAdmin }) {
  const MAX_DELEGATES_LIMIT = 200;
  const [showFeeIncludes, setShowFeeIncludes] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(phonepeQrImg);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CONFIQ_Payment_QR.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(phonepeQrImg, '_blank');
    }
  };

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('96050 93107');
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3500);
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

    setPaymentError('');
    const trimmedUtr = utrNumber.trim();

    setIsSubmitting(true);
    const finalPaymentStatus = 'PENDING_VERIFICATION';
    const finalUtr = trimmedUtr || 'N/A';

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
      utrNumber: finalUtr,
      paymentScreenshot: paymentScreenshot,
      paymentStatus: finalPaymentStatus,
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
        utr_number: finalUtr !== 'N/A' ? finalUtr : null,
        payment_screenshot: paymentScreenshot,
        payment_status: finalPaymentStatus,
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
                    Registration is intended for delegates studied <strong>Alfiyya ibn Malik</strong> and <strong>Fathul Mueen</strong>.
                  </div>
                </div>

                {/* 7. Registration Fee: ₹200 & QR Payment Section */}
                <div className="bg-[#F4F8F3] p-5 sm:p-7 rounded-2xl shadow-sm space-y-6 max-w-full overflow-hidden">
                  
                  {/* Unified Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#17472B] text-white rounded-xl shadow-sm shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base sm:text-lg text-[#17472B]">
                          Registration Fee: ₹200
                        </h4>
                        <p className="text-xs text-[#2A4222]/80 font-medium">
                          Scan QR Code to pay ₹200 & upload payment screenshot below
                        </p>
                      </div>
                    </div>

                    <span className="self-start sm:self-auto px-3 py-1 bg-[#17472B] text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-2xs shrink-0">
                      Direct UPI Transfer
                    </span>
                  </div>

                  {/* QR Code & UPI Details Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    
                    {/* QR Code Visual Box */}
                    <div className="bg-white p-5 rounded-2xl shadow-2xs text-center flex flex-col items-center justify-center">
                      <div className="text-xs font-extrabold text-[#17472B] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#17472B]" />
                        Scan QR Code to Pay ₹200
                      </div>

                      <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-2xl overflow-hidden p-2 bg-[#F4F8F3] shadow-inner flex items-center justify-center">
                        <img
                          src={phonepeQrImg}
                          alt="CONFIQ PhonePe Payment QR Code"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>

                      <div className="mt-3.5 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#17472B] hover:bg-[#20603B] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-300" />
                          <span>Download QR Code</span>
                        </button>
                      </div>
                    </div>

                    {/* UPI ID & UTR / Screenshot Inputs */}
                    <div className="space-y-4">
                      
                      {/* UPI ID Box */}
                      <div className="bg-white p-4 rounded-2xl shadow-2xs space-y-1.5">
                        <label className="block text-[11px] font-extrabold uppercase text-[#17472B] tracking-wider">
                          Official UPI ID / VPA
                        </label>
                        <div className="bg-[#F4F8F3] p-3 rounded-xl flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-base text-[#17472B] select-all">
                            9605093107
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="px-3.5 py-1.5 bg-[#17472B] hover:bg-[#20603B] text-white rounded-lg text-xs font-extrabold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* UTR Number Input */}
                      <div className="bg-white p-4 rounded-2xl shadow-2xs space-y-1.5">
                        <label className="block text-[11px] font-extrabold uppercase text-[#17472B] tracking-wider">
                          UPI Reference / UTR Number (12-digit)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 423819283019 (Found in UPI receipt)"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold outline-none bg-[#F4F8F3] focus:bg-[#EBF3EA] text-[#17472B]"
                        />
                      </div>

                      {/* Screenshot Upload Field */}
                      <div className="bg-white p-4 rounded-2xl shadow-2xs space-y-1.5">
                        <label className="block text-[11px] font-extrabold uppercase text-[#17472B] tracking-wider">
                          Upload Payment Screenshot (Optional)
                        </label>

                        {!paymentScreenshot ? (
                          <div className="relative bg-[#F4F8F3] hover:bg-[#EBF3EA] rounded-xl p-3.5 text-center cursor-pointer transition-all">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScreenshotChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex items-center justify-center gap-2">
                              <Upload className="w-4 h-4 text-[#17472B]" />
                              <span className="text-xs font-extrabold text-[#17472B]">
                                Click to attach receipt image
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#F4F8F3] p-2.5 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white">
                                <img
                                  src={paymentScreenshot}
                                  alt="Payment Screenshot Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-extrabold text-[#17472B] flex items-center gap-1">
                                  <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Screenshot Attached</span>
                                </div>
                                <div className="text-[10px] font-mono text-gray-600 truncate">
                                  {screenshotFileName || 'receipt.png'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleRemoveScreenshot}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold shrink-0 cursor-pointer"
                              title="Remove screenshot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

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
                      <span>Submit Registration</span>
                    )}
                  </button>
                </div>

              </form>

            </div>
          ) : (
            /* Success & Printable Delegate Pass Badge */
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#CCE5B4] text-center">

              {/* Print CSS Rules */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-pass-container, #printable-pass-container * {
                    visibility: visible !important;
                  }
                  #printable-pass-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: transparent !important;
                  }
                  #printable-pass {
                    box-shadow: none !important;
                    border: 4px solid #17472B !important;
                    margin: 0 auto !important;
                    page-break-inside: avoid !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              `}</style>

              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                delegatePass.paymentStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {delegatePass.paymentStatus === 'PAID' ? (
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                ) : (
                  <ShieldCheck className="w-8 h-8 text-amber-600" />
                )}
              </div>

              <h2 className="font-sans text-2xl sm:text-3xl font-black text-[#17472B]">
                Registration Received!
              </h2>

              <div className={`inline-flex items-center gap-1.5 my-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                delegatePass.paymentStatus === 'PAID'
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                  : 'bg-amber-100 border border-amber-300 text-amber-900'
              }`}>
                {delegatePass.paymentStatus === 'PAID'
                  ? '🟢 PAYMENT CONFIRMED & PASS ACTIVATED'
                  : '🟡 PAYMENT UNDER VERIFICATION'}
              </div>

              <p className="text-xs sm:text-sm font-semibold text-[#387B52] mt-1 mb-6 max-w-md mx-auto">
                {delegatePass.paymentStatus === 'PAID'
                  ? 'Your online payment was verified instantly. Your official CONFIQ 2026 Delegate Pass Badge is ready below.'
                  : 'Your payment details have been submitted. Your delegate pass badge will be fully activated upon Secretariat verification.'}
              </p>

              {/* Printable Pass Badge Card Container */}
              <div id="printable-pass-container" className="my-4">
                <div id="printable-pass" className="bg-gradient-to-b from-[#17472B] via-[#1c5534] to-[#0f341f] text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border-4 border-[#354823] text-left max-w-md sm:max-w-xl mx-auto">

                  {/* Lanyard Hole Visual Indicator */}
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-3 bg-[#0d2a19] rounded-full border border-emerald-500/40 shadow-inner flex items-center justify-center">
                      <div className="w-8 h-1 bg-[#17472B] rounded-full"></div>
                    </div>
                  </div>

                  {/* Header Badge Row */}
                  <div className="flex items-center justify-between border-b border-[#354823] pb-4 mb-5">
                    <div className="flex items-center space-x-2 select-none">
                      <img src={confiqLogo} alt="CON FIQ Logo" className="h-7 sm:h-9 object-contain brightness-0 invert" />
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-[#354823] text-amber-300 uppercase tracking-widest">
                        DELEGATE PASS
                      </span>
                    </div>

                    <div className="font-mono text-xs sm:text-sm text-[#C5DF9F] font-black bg-[#0d2a19] px-3 py-1.5 rounded-xl border border-emerald-800">
                      {delegatePass.id}
                    </div>
                  </div>

                  {/* Main Delegate Info */}
                  <div className="space-y-4 my-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-amber-200 uppercase tracking-widest block mb-0.5">Delegate Name</span>
                      <span className="font-sans text-2xl sm:text-3xl font-black text-white leading-tight block">
                        {delegatePass.fullName} <span className="text-sm font-normal text-emerald-200">({delegatePass.age} yrs)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-[#0d2a19]/80 p-4 rounded-2xl border border-emerald-800/80 shadow-inner">
                      <div>
                        <span className="text-[10px] text-gray-300 block mb-0.5 uppercase tracking-wider font-extrabold">Study Range</span>
                        <span className="font-black text-[#C5DF9F] text-base block">{delegatePass.studyRange}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-300 block mb-0.5 uppercase tracking-wider font-extrabold">Status / Birudam</span>
                        <span className="font-bold text-white text-xs truncate block">
                          {delegatePass.status} {delegatePass.birudam !== 'N/A' ? `• ${delegatePass.birudam}` : ''}
                        </span>
                      </div>
                    </div>

                    {delegatePass.utrNumber && delegatePass.utrNumber !== 'N/A' && (
                      <div className="text-xs bg-[#091f13] p-3 rounded-xl border border-emerald-700/60 flex items-center justify-between font-mono">
                        <span className="text-gray-300 text-[11px]">Payment Reference / UTR:</span>
                        <span className="font-bold text-[#C5DF9F]">{delegatePass.utrNumber}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-gray-300 block mb-0.5 uppercase tracking-wider font-extrabold">Institution / Campus</span>
                      <span className="text-sm font-semibold text-gray-100 block">
                        {delegatePass.status === 'Student' ? delegatePass.campus : delegatePass.position}
                      </span>
                    </div>
                  </div>

                  {/* Badge Footer */}
                  <div className="mt-6 pt-4 border-t border-[#354823] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-200 font-semibold">
                    <span className="flex items-center gap-1">📍 AHLUSSUFFA Dars, Parapram, Pinarayi</span>
                    <span className="flex items-center gap-1 text-amber-300 font-bold">📅 Sept 11–12, 2026</span>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 bg-[#17472B] hover:bg-[#20603B] text-white py-3.5 rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4.5 h-4.5 text-amber-300" />
                  <span>Print / Save Delegate Badge</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-extrabold text-sm transition-all cursor-pointer"
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
