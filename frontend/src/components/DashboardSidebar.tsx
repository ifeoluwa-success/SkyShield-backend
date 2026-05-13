import {
  Home,
  PlayCircle,
  BookOpen,
  Award,
  Calendar,
  BarChart3,
  ClipboardList,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { hasAssignedExercises } from '../services/simulationService';
import { getProfile } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import '../assets/css/DashboardSidebar.css';

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="sidebar-logo__mark">
    <path d="M16 3L27.3 9.5V22.5L16 29L4.7 22.5V9.5Z" stroke="#fbbf24" strokeWidth="1.6" strokeLinejoin="round"/>
    <polyline points="10,21 16,13.5 22,21" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const BookCoursesIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    width={size}
    height={size}
    className="w-5 h-5 shrink-0"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const [showExercises, setShowExercises] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Training Progress');

  useEffect(() => {
    const checkExercises = async () => {
      try {
        const hasExercises = await hasAssignedExercises();
        setShowExercises(hasExercises);
      } catch {
        setShowExercises(false);
      }
    };
    checkExercises();

    const fetchUserProgress = async () => {
      try {
        const user = await getProfile();
        // Calculate progress based on completed simulations vs total required
        // For now, use certification level progression
        let progress = 0;
        let label = 'Training Progress';
        switch (user.training_level) {
          case 'Beginner':
            progress = 25;
            label = 'Beginner Level';
            break;
          case 'Intermediate':
            progress = 50;
            label = 'Intermediate Level';
            break;
          case 'Advanced':
            progress = 75;
            label = 'Advanced Level';
            break;
          case 'Expert':
            progress = 100;
            label = 'Expert Level';
            break;
          default:
            progress = Math.min(100, Math.floor((user.simulations_completed / 10) * 100));
        }
        setTrainingProgress(progress);
        setProgressLabel(label);
      } catch {
        // Fallback – keep default
        setTrainingProgress(0);
      }
    };
    fetchUserProgress();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'lecture-schedule', label: 'Lecture Schedule', icon: Calendar, path: '/dashboard/lecture-schedule' },
    { id: 'learning-materials', label: 'Learning Materials', icon: BookOpen, path: '/dashboard/learning-materials' },
    { id: 'courses', label: 'Courses', icon: BookCoursesIcon, path: '/dashboard/courses' },
    { id: 'simulations', label: 'Simulations', icon: PlayCircle, path: '/dashboard/simulations' },
    { id: 'certifications', label: 'Certifications', icon: Award, path: '/dashboard/certificates' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/dashboard/reports' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/dashboard/calendar' },
    { id: 'help', label: 'Help Center', icon: HelpCircle, path: '/dashboard/help' },
  ];

  if (showExercises) {
    const certIdx = menuItems.findIndex((i) => i.id === 'certifications');
    if (certIdx !== -1) {
      menuItems.splice(certIdx + 1, 0, {
        id: 'exercises',
        label: 'Exercises',
        icon: ClipboardList,
        path: '/dashboard/exercises',
      });
    }
  }

  if (user?.role === 'supervisor' || user?.role === 'admin') {
    const WarRoomIcon = ({ size = 20 }: { size?: number }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M12 3.5c3.8 0 6.9 3.1 6.9 6.9 0 2.7-1.6 5.1-3.9 6.2l-3 4.1-3-4.1C6.7 15.5 5.1 13.1 5.1 10.4c0-3.8 3.1-6.9 6.9-6.9Z"
          stroke="#f59e0b"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.6" r="2.6" stroke="#f59e0b" strokeWidth="1.6" />
      </svg>
    );
    menuItems.splice(4, 0, { id: 'war-room', label: 'War Room', icon: WarRoomIcon, path: '/dashboard/war-room' });
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onToggle} />
      <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <LogoMark />
            <span className="sidebar-logo__text">SkyShield <span>Edu</span></span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-menu">
            {menuItems.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="training-progress">
            <div className="progress-header">
              <span>{progressLabel}</span>
              <span className="progress-value">{trainingProgress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${trainingProgress}%` }} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;