import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import qrCodeImg from '../assets/q.code1.jpeg';
import {
  X, CheckCircle, Printer, QrCode, User, Mail, Phone, MapPin,
  BookOpen, Award, Briefcase, GraduationCap, Sparkles, Copy,
  Upload, AlertCircle, CreditCard, FileCheck, Image as ImageIcon, Trash2, ChevronDown
} from 'lucide-react';

export default function RegistrationModal({ isOpen, onClose }) {
  const [showFeeIncludes, setShowFeeIncludes] = useState(false);
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
        payment_screenshot: paymentScreenshot,
        payment_status: 'Paid (₹200)'
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
    setPaymentScreenshot(null);
    setScreenshotFileName('');
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
              </div>

              {/* 7. Registration Fee (₹200) & Payment QR Code Section */}
              <div className="pt-2 sm:pt-3">
                <div className="bg-gradient-to-br from-amber-50/80 via-emerald-50/50 to-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-600/30 shadow-md space-y-4">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-emerald-200/60 pb-3">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="p-2 bg-[#17472B] text-white rounded-xl shadow-sm shrink-0 mt-0.5 sm:mt-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-[#17472B]">
                          General Fee: ₹200
                        </h4>
                        <p className="text-[11px] sm:text-xs text-gray-600">
                          Scan QR Code to pay ₹200 & upload payment screenshot
                        </p>
                      </div>
                    </div>

                    <span className="self-start sm:self-auto px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse shrink-0">
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
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200">
                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-2 bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border border-orange-200/80 shadow-inner">
                      <div className="relative group overflow-hidden rounded-lg border-2 border-orange-500/40 p-1 bg-white">
                        <img 
                          src={qrCodeImg} 
                          alt="conFiqh Registration Payment QR Code - ₹200"
                          className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded shadow-sm"
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-orange-800 mt-2 bg-orange-100/90 px-2 py-0.5 rounded">
                        SCAN TO PAY ₹200
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-2.5">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>1. Scan QR with any UPI App</span>
                        </div>
                        <p className="text-[11px] text-gray-600 pl-5">
                          Google Pay, PhonePe, Paytm, BHIM, or Mobile Banking.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>2. Complete ₹200 Payment</span>
                        </div>
                        <p className="text-[11px] text-gray-600 pl-5">
                          General Fee: <strong>₹200 (INR)</strong>
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
                    <label className="block text-[11px] sm:text-xs font-extrabold uppercase text-[#17472B] tracking-wider mb-1.5">
                      Upload Payment Screenshot *
                    </label>

                    {!paymentScreenshot ? (
                      <div className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        paymentError 
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
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#17472B] flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold text-[#17472B] hover:underline">
                              Click to select payment screenshot
                            </span>
                            <p className="text-[10px] font-semibold text-gray-500 mt-0.5">
                              Supports JPG, PNG, WEBP receipts
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-xl border-2 border-emerald-500 flex items-center justify-between gap-2 shadow-sm overflow-hidden">
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
                            <div className="text-[10px] sm:text-[11px] font-mono text-gray-600 truncate">
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
                    <span>Submit Registration & Issue Pass</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        ) : (
          /* Success & Digital Pass Display */
          <div className="py-2">

            <div className="text-center mb-5 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-sans text-xl sm:text-2xl font-black text-[#17472B]">
                Registration Confirmed!
              </h3>
              <p className="text-[11px] sm:text-xs font-semibold text-[#387B52]">
                Your official delegate pass for conFiqh 2026 has been generated.
              </p>
            </div>

            {/* Digital Printable Delegate Pass Card (QR Code Removed) */}
            <div id="printable-pass" className="bg-[#17472B] text-white rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden border-4 border-[#354823]">

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#354823] pb-3 sm:pb-4 mb-4">
                <div className="flex flex-wrap items-center gap-2 select-none">
                  <span className="font-sans text-lg sm:text-xl font-black tracking-tight whitespace-nowrap select-none">
                    <span className="text-[#C5DF9F]">con</span><span className="text-white">Fiqh</span>
                  </span>
                  <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-[#354823] text-white uppercase tracking-wider whitespace-nowrap">
                    1ST EDITION
                  </span>
                </div>

                <div className="font-mono text-[10px] sm:text-xs text-[#C5DF9F] font-bold bg-[#354823] px-2.5 sm:px-3 py-1 rounded-lg shrink-0 self-start sm:self-auto">
                  {delegatePass.id}
                </div>
              </div>

              {/* Delegate Details (QR Code Removed) */}
              <div className="space-y-3.5 my-2">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-gray-300 uppercase tracking-widest block mb-0.5">Delegate Name</span>
                  <span className="font-sans text-xl sm:text-2xl font-black text-white">{delegatePass.fullName} ({delegatePass.age} yrs)</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#20603B]/60 p-3 rounded-xl border border-[#354823]">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 block mb-0.5">Study Range</span>
                    <span className="font-bold text-[#C5DF9F] text-sm">{delegatePass.studyRange}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 block mb-0.5">Status / Birudam</span>
                    <span className="font-bold text-white text-xs truncate block">
                      {delegatePass.status} {delegatePass.birudam !== 'N/A' ? `• ${delegatePass.birudam}` : ''}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] sm:text-[10px] text-gray-300 block mb-0.5">Institution / Job</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-200 block">
                    {delegatePass.status === 'Student' ? delegatePass.campus : delegatePass.position}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#354823] flex items-center justify-between text-[10px] sm:text-[11px] text-gray-300 font-semibold">
                <span>📍 Parapram, Pinarayi, Kannur</span>
                <span>📅 11–12 Sept 2026</span>
              </div>

            </div>

            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 bg-[#17472B] hover:bg-[#20603B] text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm shadow flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Pass</span>
              </button>

              <button
                onClick={resetForm}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs sm:text-sm"
              >
                Done
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
