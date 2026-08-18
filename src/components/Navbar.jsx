import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Navbar({ onOpenRegister }) {
  return (
    <nav className="sticky top-0 z-50 bg-[#EBF5DA]/95 backdrop-blur-md border-b border-[#C5DF9F]/80 shadow-sm transition-all py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">

          {/* Logo: CON FIQH + 1ST EDITION dark green badge matching third image */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="font-sans text-xl sm:text-2xl font-black tracking-tight uppercase">
              <span className="text-[#387B52]">CON</span> <span className="text-[#17472B]">FIQH</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-black bg-[#17472B] text-white uppercase tracking-wider shadow-xs">
              1ST EDITION
            </span>
          </div>

          {/* Right Action CTA */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenRegister}
              className="bg-[#17472B] hover:bg-[#20603B] text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <span>Register Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
