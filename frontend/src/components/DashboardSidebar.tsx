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

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isOpen, onToggle }) => {
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
    { id: 'simulations', label: 'Simulations', icon: PlayCircle, path: '/dashboard/simulations' },
    { id: 'certifications', label: 'Certifications', icon: Award, path: '/dashboard/certifications' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/dashboard/reports' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/dashboard/calendar' },
    { id: 'help', label: 'Help Center', icon: HelpCircle, path: '/dashboard/help' },
  ];

  if (showExercises) {
    menuItems.splice(5, 0, { id: 'exercises', label: 'Exercises', icon: ClipboardList, path: '/dashboard/exercises' });
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