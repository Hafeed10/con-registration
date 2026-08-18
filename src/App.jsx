import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AcademicIntro from './components/AcademicIntro';
import AcademicTracks from './components/AcademicTracks';
import ScheduledSessions from './components/ScheduledSessions';
import GeometricPatternDivider from './components/GeometricPatternDivider';
import CountdownSection from './components/CountdownSection';
import RegistrationModal from './components/RegistrationModal';
import BrochureModal from './components/BrochureModal';
import Footer from './components/Footer';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  // Check initial URL hash / path for admin access (e.g. #admin or /admin)
  const [isAdminView, setIsAdminView] = useState(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    return hash === '#admin' || path === '/admin' || window.location.search.includes('admin');
  });

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBrochureOpen, setIsBrochureOpen] = useState(false);

  // Shared sessions state so CMS edits reflect on public site
  const [sessionsData, setSessionsData] = useState([
    {
      id: 'session-1',
      speakerName: 'Zack Wilson',
      flag: '🇬🇧',
      role: 'Senior Product Designer at Meta',
      affiliation: 'Lead Researcher in AI Fatwa Limits & UX Guardrails',
      photo: '/zack_wilson.jpg',
      tags: ['UX/UI design', 'Product design', 'Copywriting'],
      bio: 'Zack Wilson is a Senior Product Designer at Meta with over 12 years of experience designing complex algorithmic interfaces and human-AI interaction patterns.',
      abstract: 'This session explores how user interfaces can transparently signal AI confidence levels, prevent automated fatwa hallucinations, and preserve human scholarly authority in digital legal consultations.'
    },
    {
      id: 'session-2',
      speakerName: 'Dr. Abdullah Al-Makhdoomi',
      flag: '🇮🇳',
      role: 'Professor of Shafi\'i Jurisprudence',
      affiliation: 'Ahlussuffa Dars Complex & Ponnani Research Chair',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      tags: ['Shafi\'i Fiqh', 'Makhdoomi Legacy', 'Maritime Trade'],
      bio: 'Dr. Abdullah Al-Makhdoomi is a distinguished scholar of classical Shafi\'ite jurisprudence and author of 14 treatises on Indian Ocean maritime legal history.',
      abstract: 'An analytical review of how 16th-century Shafi\'i jurists in Malabar resolved novel trade contracts and maritime disputes.'
    },
    {
      id: 'session-3',
      speakerName: 'Sheikh Ibrahim Al-Kerali',
      flag: '🇦🇪',
      role: 'Islamic Finance & Crypto Ethicist',
      affiliation: 'Advisor to Global Decentralized Finance Protocols',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
      tags: ['DeFi Yields', 'Smart Contracts', 'Crypto Fiqh'],
      bio: 'Sheikh Ibrahim Al-Kerali is a pioneer in Islamic Fintech and cryptocurrency jurisprudence.',
      abstract: 'Evaluating liquidity pool staking, automated market makers (AMMs), and algorithmic stablecoins under traditional legal maxims.'
    }
  ]);

  // Listen for URL changes dynamically
  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      const search = window.location.search;
      setIsAdminView(hash === '#admin' || path === '/admin' || search.includes('admin'));
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleReturnToPublic = () => {
    window.location.hash = '';
    history.pushState("", document.title, window.location.pathname.replace('/admin', ''));
    setIsAdminView(false);
  };

  // Render Admin Dashboard ONLY when accessed via URL (#admin or /admin)
  if (isAdminView) {
    return (
      <AdminDashboard
        onReturnToPublic={handleReturnToPublic}
        sessionsData={sessionsData}
        setSessionsData={setSessionsData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textDark font-sans selection:bg-brand-dark selection:text-white flex flex-col">
      
      {/* Navigation Header (Secretariat link fully hidden) */}
      <Navbar 
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenBrochure={() => setIsBrochureOpen(true)}
        scrollToSection={scrollToSection}
      />

      {/* Main Content Sections */}
      <main className="flex-grow">
        
        {/* 1. Hero Section matching mockup */}
        <Hero 
          onOpenRegister={() => setIsRegisterOpen(true)}
          onOpenBrochure={() => setIsBrochureOpen(true)}
          scrollToSection={scrollToSection}
        />

        {/* 2. Academic Summit for Applied Fiqh Intro Section */}
        <AcademicIntro />

        {/* 3. Academic Tracks Grid */}
        <AcademicTracks 
          onOpenRegister={() => setIsRegisterOpen(true)}
        />

        {/* 4. Scheduled Sessions Carousel */}
        <ScheduledSessions 
          onOpenRegister={() => setIsRegisterOpen(true)}
          sessionsData={sessionsData}
        />

        {/* 5. Full Width Geometric Cross Pattern Banner */}
        <GeometricPatternDivider />

        {/* 6. Let's Witness the First Edition Countdown & Stats */}
        <CountdownSection 
          onOpenRegister={() => setIsRegisterOpen(true)}
        />

      </main>

      {/* Footer & Secretariat Desk (Secretariat link fully hidden) */}
      <Footer 
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenBrochure={() => setIsBrochureOpen(true)}
        scrollToSection={scrollToSection}
      />

      {/* Delegate Registration Modal */}
      <RegistrationModal 
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />

      {/* Official Brochure Viewer Modal */}
      <BrochureModal 
        isOpen={isBrochureOpen}
        onClose={() => setIsBrochureOpen(false)}
        onOpenRegister={() => setIsRegisterOpen(true)}
      />

    </div>
  );
}
