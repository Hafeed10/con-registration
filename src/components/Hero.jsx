import React from 'react';
import { Compass, Download, UserCheck } from 'lucide-react';

export default function Hero({ onOpenRegister, onOpenBrochure, scrollToSection }) {
  return (
    <section className="relative bg-[#EBF5DA] pt-10 pb-16 lg:pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Hero Layout matching user snippet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          
          {/* Left Column: CON FIQH Title & Central Badge */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CON FIQH Title */}
            <div className="flex items-start gap-4">
              <div>
                {/* CON in medium forest green with drop shadow */}
                <div 
                  className="font-sans font-medium text-[#387B52] text-7xl sm:text-8xl md:text-9xl tracking-tighter leading-none select-none"
                  style={{ textShadow: '0 4px 10px rgba(24, 77, 47, 0.15)' }}
                >
                  CON
                </div>
                
                {/* FIQH + The First Edition */}
                <div className="flex items-baseline gap-4 -mt-2 sm:-mt-4">
                  <div 
                    className="font-sans font-black text-[#17472B] text-8xl sm:text-9xl md:text-[10.5rem] tracking-tight leading-none uppercase"
                    style={{ textShadow: '0 6px 16px rgba(24, 77, 47, 0.22)' }}
                  >
                    FIQH
                  </div>
                  
                  <div className="font-serif text-sm sm:text-base font-semibold text-[#3D4C33] leading-snug tracking-tight">
                    The <br />
                    First <br />
                    Edition
                  </div>
                </div>
              </div>
            </div>

            {/* Central Dark Olive Pill Badge matching user snippet */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-3">
                
                {/* Left Dark Green 4-pointed Star Emblem */}
                <svg className="w-6 h-6 text-[#17472B] shrink-0" viewBox="0 0 40 40" fill="currentColor">
                  <path d="M20 0 L24 14 L38 14 L27 22 L31 36 L20 27 L9 36 L13 22 L2 14 L16 14 Z" />
                </svg>

                {/* Dark Olive Pill Container */}
                <div className="bg-[#45522E] text-white px-8 py-3 rounded-2xl shadow-md flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-normal tracking-wide text-white font-sans">
                    Keralam <strong className="font-black text-white">Fiqh Summit</strong> 2026
                  </span>
                </div>

                {/* Right Dark Green 4-pointed Star Emblem */}
                <svg className="w-6 h-6 text-[#17472B] shrink-0" viewBox="0 0 40 40" fill="currentColor">
                  <path d="M20 0 L24 14 L38 14 L27 22 L31 36 L20 27 L9 36 L13 22 L2 14 L16 14 Z" />
                </svg>

              </div>
            </div>

          </div>

          {/* Right Column: Floating Tessellation Strip & Connected Date Badges */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
            
            {/* Vertical Interlocking Tessellation Pattern Strip floating on #EBF5DA */}
            <div className="mb-6 w-[200px] flex justify-center">
              <svg width="200" height="260" viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="snippetExactTessellation" width="50" height="50" patternUnits="userSpaceOnUse">
                    {/* Light Green 8-pointed Octagon Star Fill */}
                    <path 
                      d="M15 0 L35 0 L50 15 L50 35 L35 50 L15 50 L0 35 L0 15 Z" 
                      fill="#C5DF9F" 
                    />
                    {/* Dark Green Interlocking 4-Pointed Cross Motif */}
                    <path 
                      d="M25 0 L30 15 L45 15 L35 25 L45 35 L30 35 L25 50 L20 35 L5 35 L15 25 L5 15 L20 15 Z" 
                      fill="#17472B" 
                    />
                    <path 
                      d="M0 25 L15 20 L15 5 L25 15 L35 5 L35 20 L50 25 L35 30 L35 45 L25 35 L15 45 L15 30 Z" 
                      fill="#17472B" 
                    />
                  </pattern>
                </defs>
                <rect width="200" height="260" fill="url(#snippetExactTessellation)" />
              </svg>
            </div>

            {/* Connected Date Badges (11 & 12) + September & Location */}
            <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
              
              {/* Connected 8-pointed Star Badges 11 & 12 matching Snippet */}
              <div className="flex items-center -space-x-1.5 mb-2">
                
                {/* 11 Badge */}
                <div className="relative w-15 h-15 flex items-center justify-center">
                  <svg className="w-14 h-14 text-[#354823]" viewBox="0 0 50 50" fill="currentColor">
                    <rect x="5" y="5" width="40" height="40" rx="3" />
                    <rect x="5" y="5" width="40" height="40" rx="3" transform="rotate(45 25 25)" />
                  </svg>
                  <span className="absolute font-mono font-extrabold text-white text-2xl">11</span>
                </div>

                {/* 12 Badge */}
                <div className="relative w-15 h-15 flex items-center justify-center z-10">
                  <svg className="w-14 h-14 text-[#354823]" viewBox="0 0 50 50" fill="currentColor">
                    <rect x="5" y="5" width="40" height="40" rx="3" />
                    <rect x="5" y="5" width="40" height="40" rx="3" transform="rotate(45 25 25)" />
                  </svg>
                  <span className="absolute font-mono font-extrabold text-white text-2xl">12</span>
                </div>

              </div>

              {/* 2026 September */}
              <div className="text-xl font-normal text-[#17472B] tracking-tight mt-1">
                2026 <span className="font-extrabold text-[#17472B]">September</span>
              </div>

              {/* Thin Horizontal Line Underline */}
              <div className="w-36 h-[1.5px] bg-[#17472B] my-1" />

              {/* Parapram,Pinarayi */}
              <div className="text-base font-semibold text-[#1F281B] tracking-tight">
                Parapram,Pinarayi
              </div>

            </div>

          </div>

        </div>

        {/* Subtitle Paragraph matching User Snippet */}
        <div className="max-w-4xl mt-6 mb-10">
          <p className="text-[#405238] text-sm sm:text-base font-normal leading-relaxed tracking-wide">
            An annual Kerala Fiqh Summit focused on contemporary discussions, scholarly sessions, and intellectual engagement around Fiqh. Free delegate registration is open for students, scholars, and faculty for the inaugural 2026 edition.
          </p>
        </div>

        {/* 4 Soft Green Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 my-8">
          <div 
            onClick={() => scrollToSection('tracks')}
            className="aspect-[4/3] bg-[#CCE5B4] hover:bg-[#BEDE9E] transition-all rounded-2xl border border-[#B3D98E]/50 shadow-sm cursor-pointer flex flex-col justify-end p-4 group"
          >
            <span className="text-xs font-bold text-[#17472B] group-hover:underline">Crypto Fiqh →</span>
          </div>

          <div 
            onClick={() => scrollToSection('tracks')}
            className="aspect-[4/3] bg-[#CCE5B4] hover:bg-[#BEDE9E] transition-all rounded-2xl border border-[#B3D98E]/50 shadow-sm cursor-pointer flex flex-col justify-end p-4 group"
          >
            <span className="text-xs font-bold text-[#17472B] group-hover:underline">AI Fatwa Limits →</span>
          </div>

          <div 
            onClick={() => scrollToSection('tracks')}
            className="aspect-[4/3] bg-[#CCE5B4] hover:bg-[#BEDE9E] transition-all rounded-2xl border border-[#B3D98E]/50 shadow-sm cursor-pointer flex flex-col justify-end p-4 group"
          >
            <span className="text-xs font-bold text-[#17472B] group-hover:underline">CRISPR Bioethics →</span>
          </div>

          <div 
            onClick={() => scrollToSection('about')}
            className="aspect-[4/3] bg-[#CCE5B4] hover:bg-[#BEDE9E] transition-all rounded-2xl border border-[#B3D98E]/50 shadow-sm cursor-pointer flex flex-col justify-end p-4 group"
          >
            <span className="text-xs font-bold text-[#17472B] group-hover:underline">Makhdoomi Tradition →</span>
          </div>
        </div>

        {/* 3 Dark Green Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={() => scrollToSection('sessions')}
            className="bg-[#17472B] hover:bg-[#20603B] text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2.5"
          >
            <Compass className="w-4 h-4 text-white" />
            <span>Explore <span className="font-extrabold">Sessions</span></span>
          </button>

          <button
            onClick={onOpenBrochure}
            className="bg-[#17472B] hover:bg-[#20603B] text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2.5"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download <span className="font-extrabold">Brochure</span></span>
          </button>

          <button
            onClick={onOpenRegister}
            className="bg-[#17472B] hover:bg-[#20603B] text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2.5"
          >
            <UserCheck className="w-4 h-4 text-white" />
            <span>Register <span className="font-extrabold">Now</span></span>
          </button>
        </div>

      </div>
    </section>
  );
}
