/**
 * CampusFind: Admin-Controlled AI-Assisted Lost & Found Platform
 * Victoria University Sydney • NIT3003 / NIT3004 IT Capstone
 */

import React, { useEffect, useState } from 'react';
import { User, ReportType } from './types';
import { authService } from './services/authService';
import { notificationService } from './services/notificationService';
import { Navbar } from './components/common/Navbar';
import { SimulatedInboxModal } from './components/common/SimulatedInboxModal';

// Shared & Auth Screens
import { SignInSignUpScreen } from './screens/auth/SignInSignUpScreen';
import { EmailVerificationScreen } from './screens/auth/EmailVerificationScreen';

// Student & Staff Screens
import { HomeScreen } from './screens/student/HomeScreen';
import { ReportItemScreen } from './screens/student/ReportItemScreen';
import { MyReportsScreen } from './screens/student/MyReportsScreen';
import { ReportStatusScreen } from './screens/student/ReportStatusScreen';
import { EditReportScreen } from './screens/student/EditReportScreen';
import { ProfileScreen } from './screens/student/ProfileScreen';

// Administrator Screens
import { AdminDashboardScreen } from './screens/admin/AdminDashboardScreen';
import { MatchReviewQueueScreen } from './screens/admin/MatchReviewQueueScreen';
import { OwnershipVerificationScreen } from './screens/admin/OwnershipVerificationScreen';
import { SearchFilterReportsScreen } from './screens/admin/SearchFilterReportsScreen';
import { FlaggedAccountsScreen } from './screens/admin/FlaggedAccountsScreen';
import { ArchiveScreen } from './screens/admin/ArchiveScreen';
import { AuditLogScreen } from './screens/admin/AuditLogScreen';
import { SystemTestsScreen } from './screens/admin/SystemTestsScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [activeScreen, setActiveScreen] = useState<string>('signin');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [reportTypeToCreate, setReportTypeToCreate] = useState<ReportType>('lost');

  // Email verification params from URL
  const [verifyParams, setVerifyParams] = useState<{ token: string; email: string } | null>(null);

  // Simulated Inbox Modal
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Check URL on load for verification query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    const emailConfirmed = urlParams.get('emailConfirmed');

    if (action === 'verify' && token && email) {
      setVerifyParams({ token, email });
      setActiveScreen('verify_email');
    } else if (emailConfirmed === '1') {
      setActiveScreen('signin');
    } else if (currentUser) {
      if (currentUser.role === 'admin') {
        setActiveScreen('admin_dashboard');
      } else {
        setActiveScreen('student_home');
      }
    } else {
      setActiveScreen('signin');
    }
  }, []);

  // Sync notifications count for admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      notificationService.getAdminNotifications().then((notifs) => {
        setUnreadNotifsCount(notifs.filter((n) => !n.read).length);
      });
    }
  }, [currentUser, activeScreen]);

  // Route Guard enforcement (Technical Constraint 2 & Section 3)
  const navigate = (screen: string, reportId?: string, matchId?: string) => {
    if (reportId) setActiveReportId(reportId);
    if (matchId) setActiveMatchId(matchId);

    // If unauthenticated and trying to reach protected page
    if (!currentUser && screen !== 'signin' && screen !== 'verify_email') {
      setActiveScreen('signin');
      return;
    }

    // Role guard: Algorithm Tests only accessible to admins
    if (screen === 'system_tests') {
      if (!currentUser || currentUser.role !== 'admin') {
        setActiveScreen('signin');
        return;
      }
    }

    // Role guard: Student/Staff cannot access admin routes
    if (currentUser && currentUser.role !== 'admin' && screen.startsWith('admin_')) {
      setActiveScreen('student_home');
      return;
    }

    // Role guard: Admin directed to admin dashboard if accessing student home
    if (currentUser && currentUser.role === 'admin' && screen === 'student_home') {
      setActiveScreen('admin_dashboard');
      return;
    }

    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [accountDeletedBanner, setAccountDeletedBanner] = useState(false);

  const handleSignOut = () => {
    authService.signOut();
    setCurrentUser(null);
    setVerifyParams(null);
    navigate('signin');
  };

  const handleAccountDeleted = () => {
    setCurrentUser(null);
    setVerifyParams(null);
    setAccountDeletedBanner(true);
    navigate('signin');
  };

  const handleAuthSuccess = (user: User) => {
    setAccountDeletedBanner(false);
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveScreen('admin_dashboard');
    } else {
      setActiveScreen('student_home');
    }
  };

  const handleStartReport = (type: 'lost' | 'found') => {
    setReportTypeToCreate(type);
    navigate('student_report');
  };

  const handleVerificationUrlOpen = (token: string, email: string) => {
    setVerifyParams({ token, email });
    setActiveScreen('verify_email');
  };

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Universal Navbar */}
      <Navbar
        currentUser={currentUser}
        activeScreen={activeScreen}
        onNavigate={navigate}
        unreadNotifsCount={unreadNotifsCount}
        onSignOut={handleSignOut}
      />

      {/* Main Content View with Route Guarding */}
      <main className="flex-1 pb-12">
        {/* Verification Link Screen */}
        {activeScreen === 'verify_email' && verifyParams && (
          <EmailVerificationScreen
            token={verifyParams.token}
            email={verifyParams.email}
            onNavigateToSignIn={() => {
              setVerifyParams(null);
              navigate('signin');
            }}
            onNavigateToSignUp={() => {
              setVerifyParams(null);
              navigate('signin');
            }}
          />
        )}

        {/* Sign In / Sign Up Screen */}
        {activeScreen === 'signin' && (
          <SignInSignUpScreen
            onSuccess={handleAuthSuccess}
            onOpenInbox={() => setIsInboxOpen(true)}
            setCurrentUser={setCurrentUser}
            accountDeleted={accountDeletedBanner}
          />
        )}

        {/* --- STUDENT & STAFF ROUTES --- */}
        {currentUser && currentUser.role !== 'admin' && (
          <>
            {activeScreen === 'student_home' && (
              <HomeScreen
                currentUser={currentUser}
                onNavigate={navigate}
                onStartReport={handleStartReport}
              />
            )}

            {activeScreen === 'student_report' && (
              <ReportItemScreen
                initialType={reportTypeToCreate}
                onBack={() => navigate('student_home')}
                onSuccess={(repId) => navigate('student_status', repId)}
              />
            )}

            {activeScreen === 'student_my_reports' && (
              <MyReportsScreen
                onNavigate={navigate}
                onStartReport={() => handleStartReport('lost')}
              />
            )}

            {activeScreen === 'student_status' && activeReportId && (
              <ReportStatusScreen
                reportId={activeReportId}
                onBack={() => navigate('student_my_reports')}
                onEdit={(repId) => navigate('student_edit', repId)}
              />
            )}

            {activeScreen === 'student_edit' && activeReportId && (
              <EditReportScreen
                reportId={activeReportId}
                onBack={() => navigate('student_status', activeReportId)}
                onSuccess={() => navigate('student_status', activeReportId)}
              />
            )}

            {activeScreen === 'student_profile' && (
              <ProfileScreen
                currentUser={currentUser}
                onSignOut={handleSignOut}
                onAccountDeleted={handleAccountDeleted}
              />
            )}
          </>
        )}

        {/* --- ADMINISTRATOR ROUTES --- */}
        {currentUser && currentUser.role === 'admin' && (
          <>
            {activeScreen === 'admin_dashboard' && (
              <AdminDashboardScreen
                currentUser={currentUser}
                onNavigate={navigate}
              />
            )}

            {activeScreen === 'admin_queue' && (
              <MatchReviewQueueScreen
                currentUser={currentUser}
                onStartVerification={(mId, lostId, foundId) =>
                  navigate('admin_verification', lostId, mId)
                }
              />
            )}

            {activeScreen === 'admin_verification' && activeReportId && (
              <OwnershipVerificationScreen
                currentUser={currentUser}
                lostReportId={activeReportId}
                matchId={activeMatchId || undefined}
                onBack={() => navigate('admin_queue')}
                onSuccess={() => navigate('admin_queue')}
              />
            )}

            {activeScreen === 'admin_search' && (
              <SearchFilterReportsScreen
                currentUser={currentUser}
                onNavigateToVerification={(lostId) =>
                  navigate('admin_verification', lostId)
                }
              />
            )}

            {activeScreen === 'admin_flagged' && (
              <FlaggedAccountsScreen
                currentUser={currentUser}
                onNavigateToAudit={() => navigate('admin_audit')}
              />
            )}

            {activeScreen === 'admin_archive' && (
              <ArchiveScreen currentUser={currentUser} />
            )}

            {activeScreen === 'admin_audit' && (
              <AuditLogScreen currentUser={currentUser} />
            )}
          </>
        )}

        {/* System & Algorithm Test Suite (Accessible only to admins) */}
        {currentUser && currentUser.role === 'admin' && activeScreen === 'system_tests' && (
          <SystemTestsScreen />
        )}
      </main>

      {/* Simulated Email Inbox Drawer Modal */}
      <SimulatedInboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        onOpenVerifyUrl={handleVerificationUrlOpen}
      />

      {/* Campus Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            CampusFind • Victoria University (Sydney Campus)
          </p>
          <p className="text-[11px] text-slate-400">
            NIT3003 / NIT3004 Capstone Project • Strict privacy boundary: students and staff see only their own reports.
          </p>
        </div>
      </footer>
    </div>
  );
}
