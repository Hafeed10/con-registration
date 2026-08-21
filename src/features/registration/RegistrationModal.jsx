import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import phonepeQrImg from '../../assets/image.jpeg';
import {
  X, CheckCircle, Printer, QrCode, User, Mail, Phone, MapPin,
  BookOpen, Award, Briefcase, GraduationCap, Sparkles, Copy,
  Upload, AlertCircle, CreditCard, FileCheck, Image as ImageIcon, Trash2, Download, ExternalLink, ShieldCheck
} from 'lucide-react';

export default function RegistrationModal({ isOpen, onClose }) {
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
      navigator.clipboard.writeText('7558889458@upi');
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
    studiedAlfiyyaAndFathulMueen: false
  });

  const [utrNumber, setUtrNumber] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [delegatePass, setDelegatePass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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

    // Primary save to Supabase Cloud Database with schema fallback safety
    let dbSuccess = false;
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

      // Try inserting with payment columns first
      const res1 = await supabase.from('delegates').insert([fullPayload]).select();

      if (res1.error) {
        console.warn('Payment columns missing in Supabase schema. Retrying core payload insert:', res1.error.message);
        // Fallback insert if payment_screenshot column doesn't exist in Supabase schema yet
        const res2 = await supabase.from('delegates').insert([basePayload]).select();
        if (res2.error) {
          console.error('Supabase fallback DB Insert error:', res2.error.message);
        } else {
          dbSuccess = true;
          console.log('Successfully saved delegate record to Supabase DB (core payload):', res2.data);
        }
      } else {
        dbSuccess = true;
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
    setHasClickedRazorpay(false);
    setRazorpayPaymentId('');
    setRazorpayPaid(false);
    setPaymentError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar border border-[#B3D98E] scroll-smooth">

        {/* Close Button */}
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-base sm:text-lg font-bold transition-colors z-20"
          aria-label="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {!submitted ? (
          <div>

            {/* Form Header matching third image brand logo */}
            <div className="flex items-center justify-between mb-5 sm:mb-6 border-b border-[#CCE5B4] pb-4">
              <div className="flex items-center space-x-2.5 select-none">
                <span className="font-sans text-2xl sm:text-3xl font-black tracking-tight">
                  <span className="text-[#17472B]">conFiqh</span>
                </span>
                <span className="inline-block px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-black bg-[#17472B] text-white uppercase tracking-wider">
                  1ST EDITION
                </span>
              </div>

              <div className="text-right hidden sm:block">
                <div className="text-xs font-extrabold text-[#17472B] uppercase tracking-wider">Delegate Registration</div>
                <div className="text-[10px] font-bold text-[#387B52]">11–12 Sept 2026</div>
              </div>
            </div>

            <div className="bg-[#EBF5DA] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#CCE5B4] mb-5 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#17472B] shrink-0" />
              <p className="text-[11px] sm:text-xs text-[#2A4222] font-medium leading-relaxed">
                Free delegate registration is open for eligible students, scholars, and faculty. Please complete your academic details below.
              </p>
            </div>

            {/* Fully Responsive Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">

              {/* 1. Name & Age */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 sm:top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
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
                    className="w-full px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-xs sm:text-sm font-medium outline-none transition-all"
                  />
                </div>
              </div>

              {/* 2. Address */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <textarea
                    required
                    rows="2"
                    placeholder="Enter your full residential / institutional address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-xs sm:text-sm font-medium outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* 3. Phone No & WhatsApp Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Phone No *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 sm:top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider">
                      WhatsApp Number *
                    </label>
                    <button
                      type="button"
                      onClick={copyPhoneToWhatsapp}
                      className="text-[10px] font-bold text-[#387B52] hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Same as Phone
                    </button>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 sm:top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Study Range & Birudam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Study Range *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all ${formData.studyRange === 'Mukhtasar'
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

                    <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all ${formData.studyRange === 'Muthawwal'
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
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                    Birudam (Degree - If any)
                  </label>
                  <div className="relative">
                    <Award className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 sm:top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Saqafi, Ahsani, B.A, M.A"
                      value={formData.birudam}
                      onChange={(e) => setFormData({ ...formData, birudam: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] focus:ring-2 focus:ring-[#17472B]/20 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Occupation Status */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                  Current Occupation Status *
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2.5 sm:mb-3">
                  <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${formData.status === 'Student'
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

                  <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${formData.status === 'Working'
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
                    <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                      Campus / Institution Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AHLUSSUFFA Dars / Calicut Univ"
                      value={formData.campus}
                      onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                      className="w-full px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] text-xs sm:text-sm font-medium outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase text-[#17472B] tracking-wider mb-1">
                      Position / Designation *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mudarris, Research Fellow, Teacher"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 focus:border-[#17472B] text-xs sm:text-sm font-medium outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 6. Eligibility Note Box (Checkbox removed) */}
              <div className="pt-1 sm:pt-2">
                <div className="p-3 sm:p-3.5 bg-[#EBF5DA] rounded-xl sm:rounded-2xl border border-[#B3D98E]">
                  <div className="text-[11px] sm:text-xs text-[#1F281B]">
                    <span className="font-extrabold text-[#17472B] block text-xs sm:text-sm mb-0.5">
                      Eligibility Requirement *
                    </span>
                    Registration is intended for delegates studying <strong>Alfiyya ibn Malik</strong> and <strong>Fathul Mueen (Baabul Ibaadaath)</strong>.
                  </div>
                </div>
              </div>              {/* 7. Registration Fee: ₹200 & Payment QR Code Section */}
              <div className="pt-2 sm:pt-3">
                <div className="bg-[#F4F8F3] p-4 sm:p-6 rounded-2xl shadow-sm space-y-5">

                  {/* Unified Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#17472B] text-white rounded-xl shadow-sm shrink-0">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-[#17472B]">
                          Registration Fee: ₹200
                        </h4>
                        <p className="text-[11px] sm:text-xs text-[#2A4222]/80 font-medium">
                          Scan QR Code to pay ₹200 & upload payment screenshot below
                        </p>
                      </div>
                    </div>

                    <span className="self-start sm:self-auto px-2.5 py-0.5 bg-[#17472B] text-white text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0">
                      Direct UPI Transfer
                    </span>
                  </div>

                  {/* QR Code & UPI Copy Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    
                    {/* PhonePe QR Code Visual Box */}
                    <div className="bg-white p-4 rounded-2xl shadow-2xs text-center flex flex-col items-center justify-center">
                      <div className="text-[11px] font-extrabold text-[#17472B] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#17472B]" />
                        Scan QR Code to Pay ₹200
                      </div>

                      <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden p-1.5 bg-[#F4F8F3] shadow-inner flex items-center justify-center">
                        <img
                          src={phonepeQrImg}
                          alt="CONFIQ PhonePe Payment QR Code"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#17472B] hover:bg-[#20603B] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-300" />
                          <span>Download QR Code</span>
                        </button>
                      </div>
                    </div>

                    {/* UPI ID & UTR / Screenshot Inputs */}
                    <div className="space-y-3">
                      
                      {/* UPI ID Box */}
                      <div className="bg-white p-3 rounded-2xl shadow-2xs space-y-1">
                        <label className="block text-[10px] sm:text-[11px] font-extrabold uppercase text-[#17472B] tracking-wider">
                          Official UPI ID / VPA
                        </label>
                        <div className="bg-[#F4F8F3] p-2.5 rounded-xl flex items-center justify-between gap-1.5">
                          <span className="font-mono font-black text-xs sm:text-sm text-[#17472B] select-all">
                            9605093107
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="px-2.5 py-1 bg-[#17472B] hover:bg-[#20603B] text-white rounded-lg text-xs font-extrabold transition-all shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* UTR Number Input */}
                      <div className="bg-white p-3 rounded-2xl shadow-2xs space-y-1">
                        <label className="block text-[10px] sm:text-[11px] font-extrabold uppercase text-[#17472B] tracking-wider">
                          UPI Reference / UTR (12-digit)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 423819283019"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold outline-none bg-[#F4F8F3] focus:bg-[#EBF3EA] text-[#17472B]"
                        />
                      </div>

                      {/* Screenshot Upload Field */}
                      <div className="bg-white p-3 rounded-2xl shadow-2xs space-y-1">
                        <label className="block text-[10px] sm:text-[11px] font-extrabold uppercase text-[#17472B] tracking-wider">
                          Upload Screenshot (Optional)
                        </label>

                        {!paymentScreenshot ? (
                          <div className="relative bg-[#F4F8F3] hover:bg-[#EBF3EA] rounded-xl p-2.5 text-center cursor-pointer transition-all">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScreenshotChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex items-center justify-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-[#17472B]" />
                              <span className="text-xs font-extrabold text-[#17472B]">
                                Attach receipt image
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#F4F8F3] p-2 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white">
                                <img
                                  src={paymentScreenshot}
                                  alt="Payment Screenshot Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-extrabold text-[#17472B] flex items-center gap-1">
                                  <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Attached</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleRemoveScreenshot}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                              title="Remove screenshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              </div>

              {/* Payment Error Alert Box */}
              {paymentError && (
                <div className="p-3.5 bg-red-50 rounded-xl border-2 border-red-400 text-red-800 text-xs font-extrabold flex items-start gap-2.5 shadow-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 sm:pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#17472B] hover:bg-[#20603B] text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-extrabold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                  <div className="py-2 text-center">

                    {/* Print CSS Rules */}
                    <style>{`
                      @media print {
                        body * {
                          visibility: hidden !important;
                        }
                        #modal-printable-pass-container, #modal-printable-pass-container * {
                          visibility: visible !important;
                        }
                        #modal-printable-pass-container {
                          position: absolute !important;
                          left: 0 !important;
                          top: 0 !important;
                          width: 100% !important;
                          margin: 0 !important;
                          padding: 0 !important;
                          background: transparent !important;
                        }
                        #modal-printable-pass {
                          box-shadow: none !important;
                          border: 4px solid #17472B !important;
                          margin: 0 auto !important;
                          page-break-inside: avoid !important;
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                        }
                      }
                    `}</style>

                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      delegatePass.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {delegatePass.paymentStatus === 'PAID' ? (
                        <CheckCircle className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <ShieldCheck className="w-7 h-7 text-amber-600" />
                      )}
                    </div>

                    <h3 className="font-sans text-xl sm:text-2xl font-black text-[#17472B]">
                      Registration Received!
                    </h3>

                    <div className={`inline-flex items-center gap-1.5 my-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                      delegatePass.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                        : 'bg-amber-100 border border-amber-300 text-amber-900'
                    }`}>
                      {delegatePass.paymentStatus === 'PAID'
                        ? '🟢 PAYMENT CONFIRMED & PASS ACTIVATED'
                        : '🟡 PAYMENT UNDER VERIFICATION'}
                    </div>

                    <p className="text-[11px] sm:text-xs font-semibold text-[#387B52] mb-4">
                      {delegatePass.paymentStatus === 'PAID'
                        ? 'Your online payment was verified instantly. Your official CONFIQ 2026 Delegate Pass Badge is ready below.'
                        : 'Your payment details have been submitted. Pass activation is subject to Secretariat verification.'}
                    </p>

                    {/* Printable Delegate Pass Badge Card */}
                    <div id="modal-printable-pass-container" className="my-3">
                      <div id="modal-printable-pass" className="bg-gradient-to-b from-[#17472B] via-[#1c5534] to-[#0f341f] text-white rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden border-4 border-[#354823] text-left">

                        {/* Lanyard Hole Visual Indicator */}
                        <div className="flex justify-center mb-3">
                          <div className="w-12 h-2.5 bg-[#0d2a19] rounded-full border border-emerald-500/40 shadow-inner flex items-center justify-center">
                            <div className="w-6 h-1 bg-[#17472B] rounded-full"></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-b border-[#354823] pb-3 mb-4">
                          <div className="flex items-center space-x-2 select-none">
                            <span className="font-sans text-lg sm:text-xl font-black tracking-tight text-white">
                              con<span className="text-[#C5DF9F]">Fiqh</span>
                            </span>
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-[#354823] text-amber-300 uppercase tracking-widest">
                              DELEGATE PASS
                            </span>
                          </div>

                          <div className="font-mono text-xs text-[#C5DF9F] font-black bg-[#0d2a19] px-2.5 py-1 rounded-xl border border-emerald-800">
                            {delegatePass.id}
                          </div>
                        </div>

                        <div className="space-y-3.5 my-2">
                          <div>
                            <span className="text-[9px] font-extrabold text-amber-200 uppercase tracking-widest block mb-0.5">Delegate Name</span>
                            <span className="font-sans text-xl sm:text-2xl font-black text-white">{delegatePass.fullName} <span className="text-xs font-normal text-emerald-200">({delegatePass.age} yrs)</span></span>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 text-xs bg-[#0d2a19]/80 p-3 rounded-2xl border border-emerald-800/80">
                            <div>
                              <span className="text-[9px] text-gray-300 block mb-0.5 uppercase tracking-wider font-extrabold">Study Range</span>
                              <span className="font-black text-[#C5DF9F] text-sm block">{delegatePass.studyRange}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-300 block mb-0.5 uppercase tracking-wider font-extrabold">Status / Birudam</span>
                              <span className="font-bold text-white text-xs truncate block">
                                {delegatePass.status} {delegatePass.birudam !== 'N/A' ? `• ${delegatePass.birudam}` : ''}
                              </span>
                            </div>
                          </div>

                          {delegatePass.utrNumber && delegatePass.utrNumber !== 'N/A' && (
                            <div className="text-xs bg-[#091f13] p-2.5 rounded-xl border border-emerald-700/60 flex items-center justify-between font-mono">
                              <span className="text-gray-300 text-[10px]">Payment Reference / UTR:</span>
                              <span className="font-bold text-[#C5DF9F] text-xs">{delegatePass.utrNumber}</span>
                            </div>
                          )}

                          <div>
                            <span className="text-[9px] text-gray-300 block mb-0.5 uppercase tracking-wider font-extrabold">Institution / Campus</span>
                            <span className="text-xs sm:text-sm font-semibold text-gray-100 block">
                              {delegatePass.status === 'Student' ? delegatePass.campus : delegatePass.position}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#354823] flex items-center justify-between text-[10px] sm:text-[11px] text-gray-200 font-semibold">
                          <span>📍 AHLUSSUFFA Dars, Parapram, Pinarayi</span>
                          <span className="text-amber-300 font-bold">📅 Sept 11–12, 2026</span>
                        </div>

                      </div>
                    </div>

                    <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="flex-1 bg-[#17472B] hover:bg-[#20603B] text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm shadow flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-amber-300" />
                        <span>Print / Save Delegate Badge</span>
                      </button>

                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                  </div>
        )}

                </div>


              </div>
              );
}
