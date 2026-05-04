// src/components/TutorSidebar.tsx
import { useState, useEffect } from 'react';
import {
  Home,
  Upload,
  BookOpen,
  Calendar,
  Users,
  BarChart3,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import '../assets/css/TutorSidebar.css';
import { getTutorProfile, getExercisesWithAttempts } from '../services/tutorService';

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="sidebar-logo__mark">
    <path d="M16 3L27.3 9.5V22.5L16 29L4.7 22.5V9.5Z" stroke="#fbbf24" strokeWidth="1.6" strokeLinejoin="round"/>
    <polyline points="10,21 16,13.5 22,21" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface TutorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const TutorSidebar: React.FC<TutorSidebarProps> = ({ isOpen, onToggle }) => {
  const [specialization, setSpecialization] = useState<string>('Loading...');
  const [hasPendingGrading, setHasPendingGrading] = useState(false);
  const [loadingGrading, setLoadingGrading] = useState(true);

  useEffect(() => {
    const fetchSpecialization = async () => {
      try {
        const profile = await getTutorProfile();
        setSpecialization(
          profile.specialization && profile.specialization.length > 0
            ? profile.specialization.join(', ')
            : 'No specialization set'
        );
      } catch {
        setSpecialization('Aviation Cybersecurity');
      }
    };
    fetchSpecialization();

    // Check if there are any exercises with submissions (pending grading)
    const checkPendingGrading = async () => {
      try {
        const exercises = await getExercisesWithAttempts();
        setHasPendingGrading(exercises.some(ex => ex.attempts_count > 0));
      } catch {
        setHasPendingGrading(false);
      } finally {
        setLoadingGrading(false);
      }
    };
    checkPendingGrading();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/tutor/dashboard' },
    { id: 'materials', label: 'Materials', icon: Upload, path: '/tutor/materials' },
    { id: 'exercises', label: 'Exercises', icon: BookOpen, path: '/tutor/exercises' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/tutor/schedule' },
    { id: 'students', label: 'Students', icon: Users, path: '/tutor/students' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/tutor/analytics' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/tutor/reports' },
  ];

  // Insert Grading item after Exercises only if there are pending submissions
  const allMenuItems = [...menuItems];
  if (!loadingGrading && hasPendingGrading) {
    const exercisesIndex = allMenuItems.findIndex(item => item.id === 'exercises');
    if (exercisesIndex !== -1) {
      allMenuItems.splice(exercisesIndex + 1, 0, {
        id: 'grading',
        label: 'Grading',
        icon: ClipboardCheck,
        path: '/tutor/grading',
      });
    }
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onToggle} />
      <aside className={`tutor-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <LogoMark />
            <span className="sidebar-logo__text">SkyShield <span>Tutor</span></span>
          </div>
        </div>

        <div className="specialization-badge">
          <span className="badge-label">Specialization:</span>
          <span className="badge-value">{specialization}</span>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-menu">
            {allMenuItems.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.id === 'dashboard'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                  {item.id === 'materials' && <span className="nav-badge">New</span>}
                  {item.id === 'grading' && hasPendingGrading && (
                    <span className="nav-badge grading-badge">!</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-version">v1.2.3 • Tutor Portal</p>
        </div>
      </aside>
    </>
  );
};

export default TutorSidebar;