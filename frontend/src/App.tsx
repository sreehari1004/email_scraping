import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './views/HomeView';
import { ProgressView } from './views/ProgressView';
import { HistoryView } from './views/HistoryView';
import { AnalyticsView } from './views/AnalyticsView';
import { EmailOutreachView } from './views/EmailOutreachView';
import { SettingsView } from './views/SettingsView';
import { JobDetailsModal } from './components/JobDetailsModal';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [modalJobId, setModalJobId] = useState<number | null>(null);

  const handleStartScraping = (jobId: number) => {
    setActiveJobId(jobId);
    setCurrentView('progress');
  };

  const handleViewJobFromProgress = (jobId: number) => {
    setModalJobId(jobId);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Fixed Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'progress') {
            // Keep activeJobId for returning, but switch main view
          }
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {currentView === 'home' && (
          <HomeView onStartScraping={handleStartScraping} />
        )}

        {currentView === 'progress' && (
          <ProgressView
            jobId={activeJobId || 1}
            onBack={() => setCurrentView('home')}
            onViewJob={handleViewJobFromProgress}
          />
        )}

        {currentView === 'history' && <HistoryView />}

        {currentView === 'analytics' && <AnalyticsView />}

        {currentView === 'outreach' && <EmailOutreachView />}

        {(currentView === 'settings' || currentView === 'notifications') && (
          <SettingsView />
        )}
      </main>

      {/* Standalone Job Details Modal if triggered */}
      {modalJobId !== null && (
        <JobDetailsModal
          jobId={modalJobId}
          onClose={() => setModalJobId(null)}
        />
      )}
    </div>
  );
};

export default App;
