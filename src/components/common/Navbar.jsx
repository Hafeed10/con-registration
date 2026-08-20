import React, { useState } from 'react';
import { ArrowRight, Menu, X, Layers, Calendar, Clock, Download, Home, UserCheck } from 'lucide-react';

export default function Navbar({ onOpenRegister, onOpenBrochure, scrollToSection }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (scrollToSection) {
      scrollToSection(sectionId);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#EBF5DA]/95 backdrop-blur-md border-b border-[#C5DF9F]/80 shadow-xs transition-all py-1 sm:py-2">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18">

          {/* Logo: CON FIQH (Single line, whitespace-nowrap) */}
          <div
            className="flex items-center space-x-1.5 sm:space-x-2.5 cursor-pointer select-none shrink-0"
            onClick={() => handleNavClick('top')}
          >
            <span className="font-sans text-lg sm:text-2xl font-black tracking-tight uppercase whitespace-nowrap">
              <span className="text-[#387B52]">CON</span> <span className="text-[#17472B]">FIQ</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[9px] sm:text-[11px] font-black bg-[#17472B] text-white uppercase tracking-wider shadow-xs">
              1ST EDITION
            </span>
          </div>

          {/* Desktop Navigation Links (md and up) */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => handleNavClick('top')}
              className="px-3 py-2 rounded-xl text-xs lg:text-sm font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors"
            >
              Home
            </button>

            <button
              onClick={() => handleNavClick('tracks')}
              className="px-3 py-2 rounded-xl text-xs lg:text-sm font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[#387B52]" />
              <span>Academic Tracks</span>
            </button>

            <button
              onClick={() => handleNavClick('sessions')}
              className="px-3 py-2 rounded-xl text-xs lg:text-sm font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#387B52]" />
              <span>Sessions</span>
            </button>

            <button
              onClick={() => handleNavClick('countdown')}
              className="px-3 py-2 rounded-xl text-xs lg:text-sm font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#387B52]" />
              <span>Countdown</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenBrochure) onOpenBrochure();
              }}
              className="px-3 py-2 rounded-xl text-xs lg:text-sm font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#387B52]" />
              <span>Brochure</span>
            </button>
          </div>

          {/* Right Action CTA & Mobile Hamburger Menu Toggle */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenRegister}
              className="bg-[#17472B] hover:bg-[#20603B] text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap"
            >
              <span>Register <span className="hidden sm:inline">Now</span></span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-xl bg-[#DDF0C2] text-[#17472B] hover:bg-[#cbe3aa] transition-colors shrink-0"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#EBF5DA] border-b border-[#C5DF9F] px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fadeIn">

          <div className="flex items-center justify-between pb-2 border-b border-[#C5DF9F]/60 gap-2">
            <span className="text-[11px] font-black text-[#17472B] uppercase tracking-wider whitespace-nowrap">
              Menu Navigation
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#17472B] text-white whitespace-nowrap">
              11–12 Sept 2026
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1">
            <button
              onClick={() => handleNavClick('top')}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors text-left"
            >
              <Home className="w-4 h-4 text-[#387B52]" />
              <span>Home Overview</span>
            </button>

            <button
              onClick={() => handleNavClick('tracks')}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors text-left"
            >
              <Layers className="w-4 h-4 text-[#387B52]" />
              <span>Academic Tracks</span>
            </button>

            <button
              onClick={() => handleNavClick('sessions')}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors text-left"
            >
              <Calendar className="w-4 h-4 text-[#387B52]" />
              <span>Scheduled Sessions</span>
            </button>

            <button
              onClick={() => handleNavClick('countdown')}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors text-left"
            >
              <Clock className="w-4 h-4 text-[#387B52]" />
              <span>Summit Countdown</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenBrochure) onOpenBrochure();
              }}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#17472B] hover:bg-[#DDF0C2] transition-colors text-left"
            >
              <Download className="w-4 h-4 text-[#387B52]" />
              <span>Download Brochure</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#C5DF9F]/60">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenRegister) onOpenRegister();
              }}
              className="w-full bg-[#17472B] hover:bg-[#20603B] text-white py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Register Delegate Seat (₹200)</span>
            </button>
          </div>

        </div>
      )}
    </nav>
  );
}
