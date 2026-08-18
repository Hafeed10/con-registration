import React from 'react';
import { X, Download, FileText, Calendar, MapPin, Award, CheckCircle2 } from 'lucide-react';

export default function BrochureModal({ isOpen, onClose, onOpenRegister }) {
  if (!isOpen) return null;

  const handleDownload = () => {
    // Generate simulated PDF brochure download
    const element = document.createElement('a');
    const file = new Blob([
      `conFiqh — Keralam Fiqh Summit 2026 OFFICIAL BROCHURE\n\n` +
      `Date: 11–12 September 2026\n` +
      `Venue: AHLUSSUFFA Dars, Parapram, Pinarayi, Kannur, Kerala\n\n` +
      `ACADEMIC TRACKS:\n` +
      `1. Decentralized Crypto Finance & Smart Contracts\n` +
      `2. Artificial Intelligence & Fatwa Limits\n` +
      `3. CRISPR Gene Editing & Bioethical Jurisprudence\n` +
      `4. Makhdoomi Shafi'i Heritage & Applied Jurisprudence\n\n` +
      `SECRETARIAT DESK:\n` +
      `Ahlussuffa Dars Complex, Parapram, Pinarayi, Kannur, Kerala 670741\n` +
      `Email: contact@confiqh.com\n`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "conFiqh_Summit_2026_Official_Brochure.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar border border-brand-light">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-lg font-bold transition-colors"
          aria-label="Close brochure modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-dark text-brand-gold flex items-center justify-center font-bold text-xl shadow">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-brand-dark">
              Summit Official Brochure
            </h3>
            <p className="text-xs font-bold text-brand-medium">
              1st Edition • conFiqh 2026 Academic Prospectus
            </p>
          </div>
        </div>

        {/* Brochure Content Preview Cards */}
        <div className="space-y-6">
          
          {/* Cover Banner */}
          <div className="bg-brand-dark text-white p-6 rounded-2xl relative overflow-hidden shadow-md">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none" />
            <span className="inline-block px-3 py-1 bg-brand-gold/20 text-brand-gold rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              Official Publication
            </span>
            <h4 className="font-display text-2xl font-extrabold mb-2">
              Keralam Fiqh Summit 2026 Prospectus
            </h4>
            <p className="text-xs text-brand-light max-w-xl leading-relaxed">
              Explore the complete 2-day session schedule, academic paper guidelines, keynote speaker biographies, and venue maps for AHLUSSUFFA Dars, Parapram, Pinarayi.
            </p>
          </div>

          {/* Schedule Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-brand-pale p-5 rounded-2xl border border-brand-light">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold font-mono px-2.5 py-1 bg-brand-dark text-brand-gold rounded">
                  DAY 1 • 11 SEPT 2026
                </span>
                <span className="text-xs font-bold text-brand-medium">09:00 AM – 05:00 PM</span>
              </div>
              <h5 className="font-bold text-brand-dark text-base mb-2">Shafi'i Heritage & AI Limits</h5>
              <ul className="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
                <li>Inaugural Keynote: Makhdoomi Tradition in Kerala</li>
                <li>Panel 1: AI Fatwa Limits & Algorithmic Guardrails</li>
                <li>Paper Presentations: Shafi'i Maritime Legal History</li>
              </ul>
            </div>

            <div className="bg-brand-pale p-5 rounded-2xl border border-brand-light">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold font-mono px-2.5 py-1 bg-brand-dark text-brand-gold rounded">
                  DAY 2 • 12 SEPT 2026
                </span>
                <span className="text-xs font-bold text-brand-medium">09:30 AM – 04:30 PM</span>
              </div>
              <h5 className="font-bold text-brand-dark text-base mb-2">Crypto Finance & CRISPR Bioethics</h5>
              <ul className="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
                <li>Panel 2: Decentralized Crypto Yields & Smart Contract Gharar</li>
                <li>Panel 3: CRISPR Germline Editing & Genomic Jurisprudence</li>
                <li>Valedictory Resolution & Declaration</li>
              </ul>
            </div>
          </div>

          {/* Secretariat info */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-brand-dark">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-emerald shrink-0" />
              <span>AHLUSSUFFA Dars Complex, Parapram, Pinarayi, Kannur, Kerala 670741</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-emerald shrink-0" />
              <span>11–12 September 2026</span>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto bg-brand-dark hover:bg-brand-emerald text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-brand-gold" />
            <span>Download Official PDF Brochure</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all text-center"
          >
            Register as Delegate
          </button>
        </div>

      </div>
    </div>
  );
}
