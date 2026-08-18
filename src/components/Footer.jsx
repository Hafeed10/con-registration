import React from 'react';
import { Mail } from 'lucide-react';

export default function Footer({ onOpenRegister, onOpenBrochure, scrollToSection }) {
  return (
    <footer className="bg-white text-gray-800 pt-16 pb-12 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top 3-column layout matching PDF */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-gray-200">
          
          {/* Left Column matching user text logo */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="font-sans text-2xl font-black tracking-tight uppercase">
                <span className="text-[#387B52]">CON</span> <span className="text-[#17472B]">FIQH</span>
              </span>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#17472B] text-white uppercase tracking-wider">
                1ST EDITION
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed max-w-sm">
              An annual Kerala Fiqh Summit focused on contemporary discussions, scholarly sessions, and intellectual engagement around Fiqh.
            </p>

            <div className="text-xs font-bold text-[#17472B]">
              AHLUSSUFFA Dars • Parapram, Pinarayi, Kannur, Kerala
            </div>
          </div>

          {/* Navigation Column (Admin fully hidden) */}
          <div className="md:col-span-3">
            <h4 className="font-mono text-xs font-black uppercase tracking-widest text-[#17472B] mb-4">
              NAVIGATION
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-gray-600">
              <li>
                <button onClick={() => scrollToSection('about')} className="hover:text-[#17472B] transition-colors">
                  About the Summit
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('tracks')} className="hover:text-[#17472B] transition-colors">
                  Academic Tracks
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('countdown')} className="hover:text-[#17472B] transition-colors">
                  2-Day Schedule
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('sessions')} className="hover:text-[#17472B] transition-colors">
                  Distinguished Faculty
                </button>
              </li>
              <li>
                <button onClick={onOpenBrochure} className="hover:text-[#17472B] transition-colors">
                  Call for Papers
                </button>
              </li>
            </ul>
          </div>

          {/* Secretariat Desk Column */}
          <div className="md:col-span-4">
            <h4 className="font-mono text-xs font-black uppercase tracking-widest text-[#17472B] mb-4">
              SECRETARIAT DESK
            </h4>

            <div className="space-y-1.5 text-xs text-gray-600">
              <p className="font-bold text-[#17472B]">Ahlussuffa Dars Complex</p>
              <p>Parapram, Pinarayi, Kannur</p>
              <p>Kerala 670741, India</p>
              
              <div className="pt-2">
                <a 
                  href="mailto:contact@confiqh.com"
                  className="inline-flex items-center gap-1.5 text-[#17472B] font-bold hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>contact@confiqh.com</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Utility Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#17472B] text-white flex items-center justify-center font-bold text-[10px]">
              N
            </div>
            <span>© 2026 CON FIQH • AHLUSSUFFA Dars. All Rights Reserved.</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="font-mono">www.confiqh.com</span>
            <span>•</span>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Privacy Policy: Delegate data is strictly used for summit organization.'); }} className="hover:text-[#17472B]">
              Privacy
            </a>
            <span>•</span>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms: Free registration for eligible delegates.'); }} className="hover:text-[#17472B]">
              Terms
            </a>
          </div>

        </div>

      </div>
    </footer>
  );
}
