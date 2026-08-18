import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { 
  X, CheckCircle, Printer, QrCode, User, Mail, Phone, MapPin, 
  BookOpen, Award, Briefcase, GraduationCap, Sparkles, Copy
} from 'lucide-react';

export default function RegistrationModal({ isOpen, onClose }) {
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

  const [submitted, setSubmitted] = useState(false);
  const [delegatePass, setDelegatePass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const copyPhoneToWhatsapp = () => {
    setFormData((prev) => ({ ...prev, whatsapp: prev.phone }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

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
      registeredAt: new Date().toLocaleDateString()
    };

    // Save to LocalStorage
    const saved = localStorage.getItem('confiqh_delegates');
    const existing = saved ? JSON.parse(saved) : [];
    localStorage.setItem('confiqh_delegates', JSON.stringify([newDelegate, ...existing]));

    // Async push to Supabase Cloud Database
    try {
      await supabase.from('delegates').insert([
        {
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
        }
      ]);
    } catch (err) {
      console.log('Supabase sync note:', err.message);
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
            
            {/* Form Header with CON FIQH Brand Logo */}
            <div className="flex items-center justify-between mb-5 sm:mb-6 border-b border-[#CCE5B4] pb-4">
              <div className="flex items-center space-x-2 select-none">
                <span className="font-sans text-2xl sm:text-3xl font-black tracking-tight uppercase">
                  <span className="text-[#387B52]">CON</span> <span className="text-[#17472B]">FIQH</span>
                </span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#17472B] text-white uppercase tracking-wider">
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
                    <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                      formData.studyRange === 'Mukhtasar'
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

                    <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                      formData.studyRange === 'Muthawwal'
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
                      placeholder="e.g. Wafy, Hadiya, B.A, M.A"
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
                  <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
                    formData.status === 'Student'
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

                  <label className={`cursor-pointer py-2 sm:py-2.5 px-3 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
                    formData.status === 'Working'
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

              {/* 6. Eligibility Check Toggle Box */}
              <div className="pt-1 sm:pt-2">
                <label className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-[#EBF5DA] rounded-xl sm:rounded-2xl border border-[#B3D98E] cursor-pointer hover:bg-[#E2F0CB] transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.studiedAlfiyyaAndFathulMueen}
                    onChange={(e) => setFormData({ ...formData, studiedAlfiyyaAndFathulMueen: e.target.checked })}
                    className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 rounded border-gray-300 text-[#17472B] focus:ring-[#17472B] cursor-pointer accent-[#17472B] shrink-0"
                  />
                  <div className="text-[11px] sm:text-xs text-[#1F281B]">
                    <span className="font-extrabold text-[#17472B] block text-xs sm:text-sm">
                      Eligibility Check *
                    </span>
                    I have studied / am studying <strong>Alfiyya ibn Malik</strong> and <strong>Fathul Mueen (Baabul Ibaadaath)</strong>.
                  </div>
                </label>
              </div>

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

            {/* Digital Printable Delegate Pass Card */}
            <div id="printable-pass" className="bg-[#17472B] text-white rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden border-4 border-[#354823]">
              
              <div className="flex items-center justify-between border-b border-[#354823] pb-3 sm:pb-4 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#C5DF9F] text-[#17472B] flex items-center justify-center font-black text-xs sm:text-sm">
                    CF
                  </div>
                  <div>
                    <div className="font-sans text-base sm:text-lg font-black text-[#C5DF9F]">conFiqh 2026</div>
                    <div className="text-[9px] sm:text-[10px] text-gray-300 font-mono">DELEGATE ADMISSION PASS</div>
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] sm:text-xs text-[#C5DF9F] font-bold bg-[#354823] px-2 sm:px-2.5 py-1 rounded">
                  {delegatePass.id}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-8 space-y-2">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-gray-300 uppercase tracking-widest block">Delegate Name</span>
                    <span className="font-sans text-lg sm:text-xl font-black text-white">{delegatePass.fullName} ({delegatePass.age} yrs)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] sm:text-[10px] text-gray-300 block">Study Range</span>
                      <span className="font-bold text-[#C5DF9F]">{delegatePass.studyRange}</span>
                    </div>
                    <div>
                      <span className="text-[9px] sm:text-[10px] text-gray-300 block">Status / Birudam</span>
                      <span className="font-bold text-white truncate block">
                        {delegatePass.status} {delegatePass.birudam !== 'N/A' ? `• ${delegatePass.birudam}` : ''}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 block">Institution / Job</span>
                    <span className="text-xs font-semibold text-gray-200">
                      {delegatePass.status === 'Student' ? delegatePass.campus : delegatePass.position}
                    </span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center bg-white p-2.5 sm:p-3 rounded-xl text-[#17472B]">
                  <QrCode className="w-16 h-16 sm:w-20 sm:h-20 text-[#17472B]" />
                  <span className="text-[8px] sm:text-[9px] font-mono font-bold mt-1 text-center text-gray-700">
                    SCAN AT AHLUSSUFFA
                  </span>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#354823] flex items-center justify-between text-[9px] sm:text-[10px] text-gray-300">
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
