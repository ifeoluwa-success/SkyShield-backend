import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, Menu, Sun, Moon, LogOut, Settings, User, BookOpen, PlayCircle, Map, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationPanel from './NotificationPanel';
import { searchContent, type SearchResult } from '../services/contentService';
import '../assets/css/DashboardHeader.css';

interface DashboardHeaderProps {
  onMobileToggle: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMobileToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ss-theme') as 'dark' | 'light') ?? 'light';
  });

  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('ss-theme', theme);
  }, [theme]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setSearchOpen(false); return; }
    setSearching(true);
    try {
      const data = await searchContent(q.trim());
      setResults(data);
      setSearchOpen(true);
    } catch {
      setResults(null);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 400);
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setSearchOpen(false);
  };

  const totalHits =
    (results?.materials?.length ?? 0) + (results?.paths?.length ?? 0);

  const toggleDarkMode = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest';
  const avatarUrl = user?.profile_picture || null;

  const isTrainee = user?.role === 'trainee';
  const profilePath = isTrainee ? '/dashboard/profile' : '/tutor/profile';
  const settingsPath = isTrainee ? '/dashboard/settings' : '/tutor/settings';

  return (
    <>
      <header className="dashboard-header">
        <div className="header-left">
          <button className="mobile-toggle" onClick={onMobileToggle}>
            <Menu size={24} />
          </button>

          {/* Search */}
          <div className="search-container" ref={searchRef}>
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => { if (results && totalHits > 0) setSearchOpen(true); }}
                placeholder="Search materials, simulations, paths…"
                className="search-input"
              />
              {query && (
                <button className="search-clear" onClick={clearSearch} aria-label="Clear">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results dropdown */}
            {searchOpen && (
              <div className="search-results">
                {searching && (
                  <div className="search-status">Searching…</div>
                )}

                {!searching && totalHits === 0 && (
                  <div className="search-status">No results for "{query}"</div>
                )}

                {!searching && (results?.materials?.length ?? 0) > 0 && (
                  <div className="search-group">
                    <div className="search-group-label">
                      <BookOpen size={13} /> Materials
                    </div>
                    {results!.materials!.slice(0, 5).map(m => (
                      <button
                        key={m.id ?? m.slug}
                        className="search-item"
                        onClick={() => { navigate('/dashboard/learning-materials'); clearSearch(); }}
                      >
                        <BookOpen size={15} className="search-item-icon" />
                        <span className="search-item-title">{m.title}</span>
                        {m.difficulty && <span className="search-item-meta">{m.difficulty}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {!searching && (results?.paths?.length ?? 0) > 0 && (
                  <div className="search-group">
                    <div className="search-group-label">
                      <Map size={13} /> Learning Paths
                    </div>
                    {results!.paths!.slice(0, 3).map(p => (
                      <button
                        key={p.id ?? p.slug}
                        className="search-item"
                        onClick={() => { navigate('/dashboard/learning-materials'); clearSearch(); }}
                      >
                        <Map size={15} className="search-item-icon" />
                        <span className="search-item-title">{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!searching && totalHits > 0 && (
                  <button
                    className="search-view-all"
                    onClick={() => { navigate('/dashboard/learning-materials'); clearSearch(); }}
                  >
                    <PlayCircle size={14} /> View all {totalHits} results
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="header-right">
          <button className="theme-toggle" onClick={toggleDarkMode} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="notifications">
            <button className="notification-btn" onClick={() => setNotificationsPanelOpen(true)}>
              <Bell size={20} />
              {notificationsCount > 0 && <span className="notification-badge">{notificationsCount}</span>}
            </button>
          </div>

          <div className="user-menu">
            <div className="user-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">
                  <User size={20} />
                </div>
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{displayRole}</span>
            </div>
            <div className="user-dropdown">
              <div className="dropdown-content">
                <button className="dropdown-item" onClick={() => navigate(profilePath)}>
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <button className="dropdown-item" onClick={() => navigate(settingsPath)}>
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
                <button className="dropdown-item" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <NotificationPanel
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
        onUnreadCountChange={setNotificationsCount}
      />
    </>
  );
};

export default DashboardHeader;
