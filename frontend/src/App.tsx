import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';

import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import DashboardLayout from './components/DashboardLayout';
import TutorDashboardLayout from './components/TutorDashboardLayout';

// Public Pages
import HomePage from './pages/HomePage';
import SimulationsPage from './pages/SimulationsPage';
import FeaturesPage from './pages/FeaturesPage';
import UseCasesPage from './pages/UseCasesPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import PublicHelpPage from './pages/PublicHelpPage';
import ComingSoonPage from './pages/ComingSoonPage';

// Trainee Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import DashboardSimulationsPage from './pages/dashboard/SimulationsPage';
import DashboardAnalyticsPage from './pages/dashboard/AnalyticsPage';
import CertificationsPage from './pages/dashboard/CertificationsPage';
import CalendarPage from './pages/dashboard/CalendarPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import SettingsPage from './pages/dashboard/SettingsPage';
import LectureSchedulePage from './pages/dashboard/LectureSchedulePage';
import LearningMaterialsPage from './pages/dashboard/LearningMaterialsPage';
import ExercisesPage from './pages/dashboard/ExercisesPage';
import SimulationPlayerPage from './pages/dashboard/SimulationPlayerPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import HelpPage from './pages/dashboard/HelpPage';

// Tutor Pages
import TutorDashboardPage from './pages/tutor/TutorDashboardPage';
import TutorMaterialsPage from './pages/tutor/TutorMaterialsPage';
import TutorExercisesPage from './pages/tutor/TutorExercisesPage';
import TutorStudentsPage from './pages/tutor/TutorStudentsPage';
import TutorAnalyticsPage from './pages/tutor/TutorAnalyticsPage';
import TutorSchedulePage from './pages/tutor/TutorSchedulePage';
import TutorReportsPage from './pages/tutor/TutorReportsPage';
import TutorProfilePage from './pages/tutor/TutorProfilePage';
import TutorSettingsPage from './pages/tutor/TutorSettingsPage';

// New Pages
import TutorExerciseSubmissionsPage from './pages/tutor/TutorExerciseSubmissionsPage';
import TutorGradingPage from './pages/tutor/TutorGradingPage';
import TutorStudentDetailPage from './pages/tutor/TutorStudentDetailPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// Meeting Room
import MeetingRoom from './pages/meetings/MeetingRoom';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Page not found</p>
        <Link 
          to="/" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* ====================== PUBLIC ROUTES ====================== */}
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/simulations" element={<Layout><SimulationsPage /></Layout>} />
          <Route path="/features" element={<Layout><FeaturesPage /></Layout>} />
          <Route path="/usecases" element={<Layout><UseCasesPage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />
          <Route path="/pricing" element={<Layout><PricingPage /></Layout>} />
          <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
          <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
          <Route path="/terms" element={<Layout><TermsPage /></Layout>} />
          <Route path="/help" element={<Layout><PublicHelpPage /></Layout>} />
          <Route path="/careers" element={<Layout><ComingSoonPage title="Careers" description="We're growing fast. Job openings will be listed here — check back soon or follow us on LinkedIn for announcements." /></Layout>} />
          <Route path="/blog" element={<Layout><ComingSoonPage title="Blog" description="Aviation cybersecurity insights, training tips, and platform updates — all coming soon." /></Layout>} />
          <Route path="/docs" element={<Layout><ComingSoonPage title="Documentation" description="Full API reference, integration guides, and platform documentation are on the way." /></Layout>} />
          <Route path="/community" element={<Layout><ComingSoonPage title="Community" description="A space for aviation security professionals to share knowledge and best practices — launching soon." /></Layout>} />
          <Route path="/status" element={<Layout><ComingSoonPage title="System Status" description="Real-time platform uptime and incident history will be available here." /></Layout>} />
          <Route path="/cookies" element={<Layout><ComingSoonPage title="Cookie Policy" description="Our full cookie policy is being finalized. See our Privacy Policy for current cookie information." /></Layout>} />
          <Route path="/gdpr" element={<Layout><ComingSoonPage title="GDPR Compliance" description="Our GDPR compliance documentation is being prepared. Contact privacy@skyshieldedu.com for data requests." /></Layout>} />
          <Route path="/accessibility" element={<Layout><ComingSoonPage title="Accessibility Statement" description="Our accessibility statement and WCAG compliance details are coming soon." /></Layout>} />
          <Route path="/sitemap" element={<Layout><ComingSoonPage title="Sitemap" description="A full site directory is on its way." /></Layout>} />
          <Route path="/partners" element={<Layout><ComingSoonPage title="Partners" description="Our partner program and integration marketplace are launching soon." /></Layout>} />
          <Route path="/press" element={<Layout><ComingSoonPage title="Press Kit" description="Media assets, press releases, and brand guidelines will be available here." /></Layout>} />
          <Route path="/investors" element={<Layout><ComingSoonPage title="Investors" description="Investor relations information is coming soon. Contact us at investors@skyshieldedu.com." /></Layout>} />
          <Route path="/login" element={<Layout><LoginPage /></Layout>} />
          <Route path="/signup" element={<Layout><SignUpPage /></Layout>} />
          <Route path="/forgot-password" element={<Layout><ForgotPasswordPage /></Layout>} />
          <Route path="/reset-password" element={<Layout><ResetPasswordPage /></Layout>} />
          <Route path="/verify-email" element={<Layout><VerifyEmailPage /></Layout>} />

          {/* ====================== TRAINEE DASHBOARD ====================== */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['trainee']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="lecture-schedule" element={<LectureSchedulePage />} />
            <Route path="learning-materials" element={<LearningMaterialsPage />} />
            <Route path="simulations" element={<DashboardSimulationsPage />} />
            <Route path="analytics" element={<DashboardAnalyticsPage />} />
            <Route path="certifications" element={<CertificationsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="simulation/:sessionId" element={<SimulationPlayerPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>

          {/* ====================== TUTOR / INSTRUCTOR ROUTES ====================== */}
          <Route
            path="/tutor"
            element={
              <ProtectedRoute allowedRoles={['supervisor', 'admin', 'instructor']}>
                <TutorDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TutorDashboardPage />} />
            <Route path="dashboard" element={<TutorDashboardPage />} />
            <Route path="materials" element={<TutorMaterialsPage />} />
            <Route path="exercises" element={<TutorExercisesPage />} />
            
            {/* NEW: Grading Overview Page */}
            <Route path="grading" element={<TutorGradingPage />} />
            
            {/* Detailed Submissions / Grading for specific exercise */}
            <Route 
              path="exercises/:exerciseId/submissions" 
              element={<TutorExerciseSubmissionsPage />} 
            />

            <Route path="students" element={<TutorStudentsPage />} />
            <Route path="students/:studentId" element={<TutorStudentDetailPage />} />
            <Route path="analytics" element={<TutorAnalyticsPage />} />
            <Route path="schedule" element={<TutorSchedulePage />} />
            <Route path="reports" element={<TutorReportsPage />} />
            <Route path="profile" element={<TutorProfilePage />} />
            <Route path="settings" element={<TutorSettingsPage />} />
          </Route>

          {/* ====================== ADMIN ROUTES ====================== */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TutorDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TutorDashboardPage />} />
            <Route path="dashboard" element={<TutorDashboardPage />} />
            <Route path="materials" element={<TutorMaterialsPage />} />
            <Route path="exercises" element={<TutorExercisesPage />} />
            
            {/* Admin also gets Grading Overview */}
            <Route path="grading" element={<TutorGradingPage />} />
            
            {/* Admin also gets detailed submissions */}
            <Route 
              path="exercises/:exerciseId/submissions" 
              element={<TutorExerciseSubmissionsPage />} 
            />

            <Route path="students" element={<TutorStudentsPage />} />
            <Route path="students/:studentId" element={<TutorStudentDetailPage />} />
            <Route path="analytics" element={<TutorAnalyticsPage />} />
            <Route path="schedule" element={<TutorSchedulePage />} />
            <Route path="reports" element={<TutorReportsPage />} />
            <Route path="profile" element={<TutorProfilePage />} />
            <Route path="settings" element={<TutorSettingsPage />} />
            <Route path="stats" element={<AdminDashboardPage />} />
          </Route>

          {/* ====================== MEETING ROOM ====================== */}
          <Route
            path="/meetings/join/:code"
            element={
              <ProtectedRoute allowedRoles={['trainee', 'supervisor', 'admin', 'instructor']}>
                <MeetingRoom />
              </ProtectedRoute>
            }
          />

          {/* ====================== 404 ====================== */}
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;