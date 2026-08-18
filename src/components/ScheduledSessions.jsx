import React, { useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Info } from 'lucide-react';

export default function ScheduledSessions({ onOpenRegister, sessionsData }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bioModalSpeaker, setBioModalSpeaker] = useState(null);

  const defaultSessions = [
    {
      id: 'session-1',
      speakerName: 'Zack Wilson',
      flag: '🇬🇧',
      role: 'Senior Product Designer at Meta',
      affiliation: 'Lead Researcher in AI Fatwa Limits & UX Guardrails',
      photo: '/zack_wilson.jpg',
      tags: ['UX/UI design', 'Product design', 'Copywriting'],
      bio: 'Zack Wilson is a Senior Product Designer at Meta with over 12 years of experience designing complex algorithmic interfaces and human-AI interaction patterns.',
      abstract: 'This session explores how user interfaces can transparently signal AI confidence levels.'
    }
  ];

  const sessions = sessionsData && sessionsData.length > 0 ? sessionsData : defaultSessions;
  const currentSession = sessions[currentSlide] || sessions[0];

  return (
    <section id="sessions" className="py-20 bg-[#EEF3EA] border-t border-[#D5E0D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Row matching PDF */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-sans text-3xl sm:text-4xl font-extrabold text-[#123C2C] uppercase tracking-tight">
            SCHEDULED <span className="font-black text-[#123C2C]">SESSIONS</span>
          </h2>

          <button 
            onClick={() => setCurrentSlide(0)}
            className="flex items-center gap-1.5 text-sm font-bold text-[#123C2C] hover:underline"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Explore all Sessions</span>
          </button>
        </div>

        {/* Outer Card Teal Container matching PDF */}
        <div className="relative">
          <div className="bg-[#0D646D] p-6 sm:p-10 rounded-3xl shadow-2xl relative">
            
            {/* Inner White/Off-white Card matching PDF */}
            <div className="bg-[#F7F9F5] rounded-2xl p-6 sm:p-8 shadow-md grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Oval Speaker Frame matching PDF */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden bg-white shadow-md border-4 border-white">
                  <img
                    src={currentSession.photo}
                    alt={currentSession.speakerName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right Speaker Details matching PDF */}
              <div className="lg:col-span-7 space-y-5">
                
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-sans text-3xl sm:text-4xl font-black text-[#123C2C]">
                      {currentSession.speakerName}
                    </h3>
                    <span className="text-2xl">{currentSession.flag}</span>
                  </div>

                  <p className="text-sm font-bold text-gray-500 mt-1">
                    {currentSession.role}
                  </p>
                </div>

                {/* "Helping with:" Tags Section matching PDF */}
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Helping with:
                  </span>
                  
                  <div className="flex flex-wrap gap-2">
                    {currentSession.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-[#123C2C] border border-gray-200 shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Buttons matching PDF mockup: About & Book sector */}
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={() => setBioModalSpeaker(currentSession)}
                    className="px-6 py-2.5 rounded-xl border border-gray-400 text-[#123C2C] font-bold text-sm bg-white hover:bg-gray-50 shadow-sm transition-all"
                  >
                    About
                  </button>

                  <button
                    onClick={onOpenRegister}
                    className="px-6 py-2.5 rounded-xl bg-[#5B5CFF] hover:bg-[#4849E5] text-white font-bold text-sm shadow-md transition-all"
                  >
                    Book sector
                  </button>
                </div>

              </div>

            </div>

          </div>

          {/* Carousel Dots matching PDF */}
          <div className="flex items-center justify-center space-x-2 mt-6">
            {sessions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  currentSlide === idx ? 'w-8 bg-[#123C2C]' : 'w-2.5 bg-gray-300'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

        </div>

      </div>

      {/* Speaker Bio Modal */}
      {bioModalSpeaker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setBioModalSpeaker(null)}
              className="absolute top-4 right-4 text-gray-500 font-bold text-xl"
            >
              ✕
            </button>
            <h3 className="text-2xl font-black text-[#123C2C] mb-2">{bioModalSpeaker.speakerName} {bioModalSpeaker.flag}</h3>
            <p className="text-sm font-bold text-gray-600 mb-4">{bioModalSpeaker.role}</p>
            <p className="text-sm text-gray-700 leading-relaxed mb-6">{bioModalSpeaker.bio}</p>
            <button
              onClick={() => {
                setBioModalSpeaker(null);
                onOpenRegister();
              }}
              className="w-full py-3 bg-[#123C2C] text-white rounded-xl font-bold"
            >
              Book Delegate Seat
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
