/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AiStudyChatView } from './components/AiStudyChatView';
import { AppShell } from './components/AppShell';
import { DailyTrackerView } from './components/DailyTrackerView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeDashboard } from './components/HomeDashboard';
import { LoginScreen } from './components/LoginScreen';
import { ProfileView } from './components/ProfileView';
import { ProgressAnalytics } from './components/ProgressAnalytics';
import { SplashScreen } from './components/SplashScreen';
import { StudyTimerModal } from './components/StudyTimerModal';
import { SubjectsView } from './components/SubjectsView';
import { BrandLogoMark } from './components/SubjectVisuals';
import { APP_CONFIG } from './config/appConfig';
import { StudyProvider, useStudy } from './context/StudyContext';
import type { AnalyticsRange, AppTab } from './types/study';

function StudyAppRouter() {
  const { user, authReady, isBootstrapping } = useStudy();
  const [splashDone, setSplashDone] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectsSection, setSubjectsSection] = useState<'syllabus' | 'pdfs' | null>(null);
  const [selectedDailyDate, setSelectedDailyDate] = useState<string | null>(null);
  const [selectedProgressRange, setSelectedProgressRange] = useState<AnalyticsRange | null>(null);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  const handleOpenSubject = useCallback((subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSubjectsSection('syllabus');
    setActiveTab('subjects');
  }, []);

  const handleOpenPdfs = useCallback(() => {
    setSelectedSubjectId(null);
    setSubjectsSection('pdfs');
    setActiveTab('subjects');
  }, []);

  const handleOpenDaily = useCallback((dateKey?: string) => {
    setSelectedDailyDate(dateKey || null);
    setActiveTab('daily');
  }, []);

  const handleOpenLeaderboard = useCallback(() => {
    setSelectedProgressRange('leaderboard');
    setActiveTab('progress');
  }, []);

  const handleChangeTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    if (tab !== 'subjects') {
      setSelectedSubjectId(null);
      setSubjectsSection(null);
    }
    if (tab !== 'daily') {
      setSelectedDailyDate(null);
    }
    if (tab !== 'progress') {
      setSelectedProgressRange(null);
    }
  }, []);

  const showSplash = !splashDone || !authReady;

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="splash" onComplete={handleSplashComplete} />}
      </AnimatePresence>

      {!showSplash && !user && <LoginScreen />}

      {!showSplash && user && (
        <>
          <AppShell activeTab={activeTab} onChangeTab={handleChangeTab}>
            {isBootstrapping ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <BrandLogoMark className="w-12 h-12 mb-4 shadow-lg shadow-blue-600/20 rounded-xl" />
                <p className="font-display text-sm font-bold text-blue-600 dark:text-blue-400">
                  {APP_CONFIG.APP_NAME}
                </p>
                <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
                  Setting up your Class 12 syllabus
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Preparing Physics, Chemistry, Biology, and Zoology chapters...
                </p>
                <div className="mt-5 w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}_${selectedSubjectId || 'root'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {activeTab === 'home' && (
                    <HomeDashboard
                      onOpenSubject={handleOpenSubject}
                      onNavigateProgress={() => handleChangeTab('progress')}
                      onNavigateSubjects={() => {
                        setSubjectsSection('syllabus');
                        handleChangeTab('subjects');
                      }}
                      onNavigatePdfs={handleOpenPdfs}
                      onNavigateAiChat={() => handleChangeTab('ai_chat')}
                      onNavigateDaily={() => handleOpenDaily()}
                      onNavigateLeaderboard={handleOpenLeaderboard}
                    />
                  )}
                  {activeTab === 'ai_chat' && <AiStudyChatView />}
                  {activeTab === 'daily' && (
                    <DailyTrackerView initialDate={selectedDailyDate} />
                  )}
                  {activeTab === 'subjects' && (
                    <SubjectsView
                      selectedSubjectId={selectedSubjectId}
                      onSelectSubject={setSelectedSubjectId}
                      initialSection={subjectsSection}
                    />
                  )}
                  {activeTab === 'progress' && (
                    <ProgressAnalytics
                      onOpenDailyDate={handleOpenDaily}
                      initialRange={selectedProgressRange}
                    />
                  )}
                  {activeTab === 'profile' && <ProfileView />}
                </motion.div>
              </AnimatePresence>
            )}
          </AppShell>
          <StudyTimerModal />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudyProvider>
        <StudyAppRouter />
      </StudyProvider>
    </ErrorBoundary>
  );
}
