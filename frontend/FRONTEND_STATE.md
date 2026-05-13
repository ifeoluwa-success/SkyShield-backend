# SkyShield-edu Frontend - Current State Documentation

**Last Updated:** May 13, 2026  
**Project:** SkyShield-edu Frontend  
**Location:** `frontend/`  
**Framework:** React + TypeScript + Vite  
**Styling:** Tailwind CSS + Custom CSS  

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Public Pages](#public-pages)
3. [Authentication Pages](#authentication-pages)
4. [Dashboard Pages (Protected)](#dashboard-pages-protected)
5. [Tutor Pages (Protected)](#tutor-pages-protected)
6. [Admin Pages (Protected)](#admin-pages-protected)
7. [Meeting Pages](#meeting-pages)
8. [Components](#components)
9. [Services & APIs](#services--apis)
10. [Key Features](#key-features)
11. [Tech Stack](#tech-stack)

---

## Project Overview

SkyShield-edu is an educational platform focused on cybersecurity training and simulations. The frontend provides:
- Public information pages about the platform
- User authentication and account management
- Interactive cybersecurity simulations
- Student dashboard with learning materials and progress tracking
- Tutor dashboard for managing materials, exercises, and students
- Admin dashboard for system management
- Video conferencing for tutoring sessions
- Analytics and performance tracking

---

## Public Pages

Publicly accessible pages (no authentication required):

### **HomePage.tsx**
- Landing page with hero section
- Platform overview and features
- Call-to-action for signup/login

### **FeaturesPage.tsx**
- Detailed features overview
- Highlights platform capabilities
- Feature descriptions and benefits

### **AboutPage.tsx**
- Company/platform information
- Mission and vision
- Team information (if applicable)

### **PricingPage.tsx**
- Subscription plans
- Pricing tiers
- Feature comparison

### **UseCasesPage.tsx**
- Real-world use cases
- Success stories
- Industry applications

### **ContactPage.tsx**
- Contact form
- Support information
- Email/messaging support

### **PublicHelpPage.tsx**
- FAQ section
- Help resources
- Getting started guide

### **TermsPage.tsx**
- Terms of service
- Legal terms and conditions

### **PrivacyPage.tsx**
- Privacy policy
- Data handling information
- User rights

### **ComingSoonPage.tsx**
- Placeholder for upcoming features
- Generic coming soon page

---

## Authentication Pages

Authentication-related pages (public access):

### **LoginPage.tsx**
- Email/password login form
- "Remember me" functionality
- Forgot password link
- Social authentication (if enabled)
- Sign up redirect

### **SignUpPage.tsx**
- User registration form
- Fields: email, password, name, organization, job title
- Terms acceptance
- Email verification flow

### **ForgotPasswordPage.tsx**
- Password reset request
- Email-based password recovery
- Link to reset password page

### **ResetPasswordPage.tsx**
- Set new password
- Password reset with token
- Validation and confirmation

### **VerifyEmailPage.tsx**
- Email verification flow
- Token validation
- Resend verification option

### **SocialAuthCallback.tsx**
- OAuth callback handler
- Social authentication (Google, GitHub, etc.)
- Session establishment

---

## Dashboard Pages (Protected)

Protected pages for regular students/users. Path: `/dashboard/*`

### **DashboardPage.tsx** (Main Dashboard)
- Welcome section
- Quick stats (simulations completed, average score, etc.)
- Recent activity
- Recommended scenarios
- Quick access to key features

### **SimulationsPage.tsx**
- Browse available scenarios/simulations
- Filter by difficulty, category, threat type
- Search functionality
- Bookmarked scenarios
- Start new simulation

### **SimulationPlayerPage.tsx**
- Interactive simulation experience
- Display current scenario/challenge
- Decision options
- Hint system
- Progress tracking
- Score display

### **MissionPlayerPage.tsx** (New “Digital Twin” player)
- Route: `/dashboard/mission/:runId`
- Full-screen mission experience (no dashboard sidebar)
- Two modes (based on operator role):
  - ATC: `RadarScope` (SVG radar scope)
  - OPS: `OpsDashboard` (SVG topology + status cards + logs)
- Shared UI: `PhaseBar`, `DecisionPanel`, `EventFeed`, `ParticipantBadges`, `StressHUD`
- Real-time state/events via WebSocket hook `useMissionSocket`

### **SupervisorWarRoomPage.tsx** (Supervisor/Admin)
- Route: `/dashboard/war-room`
- Uses `DashboardLayout`
- Live mission monitoring (polling active runs every 10 seconds)
- Right-side live panel (`LiveMissionPanel`) with interventions

### **LearningMaterialsPage.tsx**
- Content library
- Materials by category
- Search and filter options
- Bookmark functionality
- Learning paths
- Enroll in paths

### **AnalyticsPage.tsx**
- Performance dashboard
- Score trends
- Skill assessments
- Category performance
- Comparison stats (vs global/peers)
- Learning path recommendations
- Weak and strong areas

### **CertificationsPage.tsx**
- View earned certifications
- Certificate details
- Download certificates
- Certification history

### **CalendarPage.tsx**
- Schedule view
- Upcoming sessions/meetings
- Calendar integration
- Event management

### **LectureSchedulePage.tsx**
- Scheduled lectures/sessions
- Session details
- Join meeting functionality
- Schedule tracking

### **ExercisesPage.tsx**
- List of assigned exercises
- Exercise details
- Submission history
- Grades and feedback

### **HelpPage.tsx**
- In-app help resources
- FAQ
- Documentation links
- Support contact

### **ProfilePage.tsx**
- User profile information
- Edit profile details
- Profile picture
- Account information

### **SettingsPage.tsx**
- Account settings
- Notification preferences
- Privacy settings
- Device management
- Session management

---

## Tutor Pages (Protected)

Protected pages for tutors. Path: `/tutor/*`

### **TutorDashboardPage.tsx** (Main Dashboard)
- Teaching overview
- Key statistics
- Recent activity
- Student performance summary
- Quick actions

### **TutorMaterialsPage.tsx**
- Manage teaching materials
- Upload/create materials
- Edit materials
- Publish/unpublish
- Material list with filters

### **TutorExercisesPage.tsx**
- Manage exercises
- Create new exercises
- Edit exercises
- Delete exercises
- Exercise list with stats

### **TutorExerciseSubmissionsPage.tsx**
- View student submissions
- Filter by student/status
- Track submission status

### **TutorGradingPage.tsx**
- Grade student exercises
- Provide feedback
- View answers
- Update grades
- Bulk grading interface

### **TutorStudentsPage.tsx**
- Manage student list
- Student information
- Search and filter
- Add/remove students
- View student profiles

### **TutorStudentDetailPage.tsx**
- Individual student profile
- Learning progress
- Exercise attempts
- Performance history
- Student notes/annotations

### **TutorAnalyticsPage.tsx**
- Teaching analytics
- Class/student performance
- Comparative analytics
- Reports and insights
- Export data

### **TutorSchedulePage.tsx**
- Manage teaching schedule
- Schedule sessions/meetings
- Calendar view
- Session management

### **TutorReportsPage.tsx**
- Generate reports
- Student performance reports
- Class analytics
- Export options

### **TutorProfilePage.tsx**
- Tutor profile information
- Bio and qualifications
- Profile settings
- Availability

### **TutorSettingsPage.tsx**
- Account settings
- Notification preferences
- Privacy settings
- Device management

---

## Admin Pages (Protected)

Protected pages for administrators. Path: `/admin/*`

### **AdminDashboardPage.tsx**
- System overview
- User statistics
- Platform analytics
- System health
- Key metrics
- Admin controls

---

## Meeting Pages

Pages for video conferencing and meetings. Path: `/meetings/*`

### **MeetingRoom.tsx**
- Video conferencing interface
- Participant list
- Screen sharing
- Chat/messaging (if available)
- Recording controls (if available)
- Meeting controls (mute, camera, etc.)

---

## Components

Reusable React components:

### Layout Components
- **Header.tsx** - Navigation header with logo and links
- **Footer.tsx** - Footer with links and info
- **DashboardLayout.tsx** - Layout wrapper for dashboard pages
- **DashboardHeader.tsx** - Dashboard-specific header
- **DashboardSidebar.tsx** - Navigation sidebar for dashboard
- **TutorDashboardLayout.tsx** - Layout for tutor dashboard
- **TutorSidebar.tsx** - Navigation for tutor dashboard

### Feature Components
- **Hero.tsx** - Hero section (landing page)
- **SkyShieldHowItWorks.tsx** - "How it works" section
- **SkyShieldValueProps.tsx** - Value propositions
- **SkyShieldStatsBar.tsx** - Statistics display
- **SkyShieldInstructors.tsx** - Instructors section
- **SkyShieldCareerFocus.tsx** - Career focus information
- **SuccessStoriesSection.tsx** - Success stories display
- **CourseAudienceSection.tsx** - Target audience info
- **ContactSection.tsx** - Contact form/section

### UI Components
- **ProtectedRoute.tsx** - Route guard for authenticated pages
- **AuthGraphic.tsx** - Auth page graphics
- **ConfirmationModal.tsx** - Confirmation dialog
- **SuccessModal.tsx** - Success notification modal
- **Toast.tsx** - Toast notifications
- **NotificationPanel.tsx** - Notification display
- **ScrollToTop.tsx** - Scroll-to-top button

### Mission Components (`src/components/mission/*`)
- **BriefingScreen.tsx** - Pre-mission narrative + readiness
- **PhaseBar.tsx** - Phase pills + timer + score
- **RadarScope.tsx** - ATC view (SVG radar scope)
- **OpsDashboard.tsx** - OPS view (status cards + topology + logs)
- **DecisionPanel.tsx** - Decision options + hint request UI
- **EventFeed.tsx** - Live event list (right column)
- **ParticipantBadges.tsx** - Mission participants badges
- **StressHUD.tsx** - Stress overlay + Web Audio heartbeat
- **ReviewScreen.tsx** - Post-mission final score + breakdown
- **MissionCard.tsx** - War Room active-run card
- **LiveMissionPanel.tsx** - War Room right-side live mission panel

### Session Components
- **ScheduleMeetingModal.tsx** - Modal to schedule meetings
- **ScheduleSessionModal.tsx** - Modal to schedule sessions

---

## Services & APIs

### API Configuration
- **api.ts** - Axios configuration with interceptors, token refresh, error handling

### Service Modules

#### Authentication Service (`authService.ts`)
- User login/register/logout
- Password management (change, forgot, reset)
- Email verification
- Profile management
- Device management (trust, untrust, remove)
- Session management
- Notifications (get, mark read)
- ~20 endpoints

#### Content Service (`contentService.ts`)
- Content categories and materials
- Learning paths (get, enroll)
- Glossary terms
- FAQs
- Announcements
- Search functionality
- Meeting invitations
- ~15 endpoints

#### Simulation Service (`simulationService.ts`)
- Scenarios (get, bookmark, filter)
- Simulation sessions (start, get, history)
- Decision submission with feedback
- Hint system
- Achievements tracking
- Scenario feedback/ratings
- ~18 endpoints

#### Incident/Mission Service (`incidentService.ts`)
- New “Incident Run” mission flow (separate from legacy SimulationSession)
- Start mission run, get state, submit actions, request hint, score, timeline, participants
- Supervisor interventions (pause, inject threat, force phase, reduce timer)
- Active runs polling (War Room): `getActiveRuns()`

### Hooks
- **useMissionSocket.ts** - WebSocket client for mission runs (`/ws/mission/{runId}/?token=...`)

#### Tutor Service (`tutorService.ts`)
- Tutor profile management
- Teaching materials (CRUD operations)
- Exercises (CRUD, attempts, grading)
- Student management
- Dashboard stats
- Meeting attendance tracking
- ~25 endpoints

#### Analytics Service (`analyticsService.ts`)
- Dashboard analytics
- User performance metrics
- Performance trends
- Skill assessments
- Learning path recommendations
- Comparison stats (peers/global)
- ~6 endpoints

---

## Key Features

### Authentication & Security
✅ User registration and login  
✅ Email verification  
✅ Password recovery  
✅ Token refresh mechanism  
✅ Device/session management  
✅ Social authentication (configured)  

### Learning & Simulations
✅ Interactive cybersecurity simulations  
✅ Multiple scenarios with difficulty levels  
✅ Decision-based learning  
✅ Hint system  
✅ Feedback and scoring  
✅ Achievement tracking  

### Incident Missions (New)
✅ Full-screen “Digital Twin” mission player (ATC/OPS views)  
✅ Real-time events/state via WebSocket  
✅ Supervisor War Room monitoring + interventions  

### Content Management
✅ Learning materials library  
✅ Learning paths  
✅ Glossary and FAQs  
✅ Announcements  
✅ Content search  

### Dashboard & Analytics
✅ Student dashboard with stats  
✅ Performance analytics  
✅ Skill assessments  
✅ Trend analysis  
✅ Peer comparison  
✅ Tutor dashboard for management  

### Teaching Tools (Tutor)
✅ Create/manage materials  
✅ Create/manage exercises  
✅ Grade submissions  
✅ Student progress tracking  
✅ Student notes/annotations  
✅ Teaching schedule  

### Video Conferencing
✅ Meeting room interface  
✅ Tutor-student sessions  

### User Management
✅ Profile management  
✅ Account settings  
✅ Notification preferences  
✅ Device management  

---

## Tech Stack

### Frontend Framework
- **React 18+** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation

### Styling
- **Tailwind CSS** for utility styling
- **Custom CSS** for component-specific styles

### State Management
- **React Context API** for authentication state
- **Custom hooks** (useAuth)

### HTTP Client
- **Axios** with interceptors for API requests

### Build & Development
- **ESLint** for code quality
- **TypeScript** for type safety
- **Vercel** deployment (configured)

### Configuration
- Environment variables via `.env` files
- Vite config for development and production

---

## Project Structure

```
frontend/
├── src/
│   ├── pages/                 # Page components
│   │   ├── admin/            # Admin pages
│   │   ├── dashboard/        # Student dashboard pages
│   │   ├── meetings/         # Meeting pages
│   │   ├── tutor/            # Tutor pages
│   │   └── *.tsx             # Public & auth pages
│   ├── components/           # Reusable components
│   ├── context/              # React Context (Auth)
│   ├── hooks/                # Custom hooks
│   ├── services/             # API services
│   ├── types/                # TypeScript types
│   ├── assets/
│   │   ├── css/              # Component styles
│   │   └── images/           # Images and graphics
│   ├── App.tsx               # Main App component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── public/                    # Static files
├── package.json              # Dependencies
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── tailwind.config.js        # Tailwind configuration
├── eslint.config.js          # ESLint configuration
└── vercel.json               # Deployment config

```

---

## API Endpoints Summary

**Total Implemented Endpoints: ~70+**

| Service | Endpoint Count | Main Operations |
|---------|----------------|-----------------|
| Auth | ~20 | Login, Register, Profile, Devices, Sessions, Notifications |
| Content | ~15 | Materials, Paths, FAQs, Glossary, Announcements, Search |
| Simulation | ~18 | Scenarios, Sessions, Decisions, Hints, Achievements |
| Tutor | ~25 | Profile, Materials, Exercises, Students, Grading |
| Analytics | ~6 | Dashboard, Performance, Trends, Skills, Comparisons |

---

## Current Status

### ✅ Completed Features
- Core authentication system
- Student dashboard with simulations
- Learning materials and content
- Analytics and performance tracking
- Tutor interface for teaching
- Exercise creation and grading
- Student progress tracking
- Video meeting room integration
- Notification system

### 🚀 Ready for Deployment
- All major features implemented
- Protected routes configured
- API integration complete
- Error handling in place
- Responsive design with Tailwind CSS

### 📝 Notes
- API base URL: `https://skyshield-backend.onrender.com/api`
- Environment variables required: `VITE_API_URL`
- Local development: `npm run dev`
- Build: `npm run build`
- Production ready with Vercel deployment

---

## Contact & Support

For questions or issues regarding the frontend, refer to the `README.md` in the frontend directory or contact the development team.
