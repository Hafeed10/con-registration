import React, { useState, useEffect } from 'react';
import { RegistrationPage } from './features/registration';
import { AdminDashboard } from './features/admin';

export default function App() {
  // Admin view activated via URL route (#admin or /admin or ?admin or ?scan)
  const [isAdminView, setIsAdminView] = useState(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    const search = window.location.search;
    return hash.includes('admin') || path.includes('/admin') || search.includes('admin') || search.includes('scan');
  });

  const [sessionsData, setSessionsData] = useState([]);
  const [tracksData, setTracksData] = useState([]);

  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      const search = window.location.search;
      setIsAdminView(hash.includes('admin') || path.includes('/admin') || search.includes('admin') || search.includes('scan'));
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleReturnToPublic = () => {
    window.location.hash = '';
    history.pushState("", document.title, window.location.pathname.replace('/admin', ''));
    setIsAdminView(false);
  };

  // Render Admin Dashboard ONLY when accessed via URL (#admin or /admin or ?admin)
  if (isAdminView) {
    return (
      <AdminDashboard
        onReturnToPublic={handleReturnToPublic}
        sessionsData={sessionsData}
        setSessionsData={setSessionsData}
        tracksData={tracksData}
        setTracksData={setTracksData}
      />
    );
  }

  // Default view: Registration Page (No visible Admin button)
  return <RegistrationPage />;
}
