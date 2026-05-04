// src/components/ScheduleSessionModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Video, Calendar, Clock, Users, Loader, CheckCircle } from 'lucide-react';
import { createTeachingSession, getTutorProfile } from '../services/tutorService';
import '../assets/css/ScheduleSessionModal.css';

interface ScheduleSessionModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const defaultTime = () => {
  const d = new Date(Date.now() + 30 * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const ScheduleSessionModal: React.FC<ScheduleSessionModalProps> = ({ onClose, onCreated }) => {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionType, setSessionType] = useState('live');
  const [platform, setPlatform] = useState('google_meet');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(defaultTime());
  const [duration, setDuration] = useState('60');
  const [maxAttendees, setMaxAttendees] = useState('50');
  const [meetingLink, setMeetingLink] = useState('');
  const [customLink, setCustomLink] = useState('');

  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('Please enter a session title.'); return; }
    if (!date || !time) { setError('Please select date and time.'); return; }

    setLoading(true);
    try {
      const tutorProfile = await getTutorProfile();
      const startDt = new Date(`${date}T${time}`);
      const endDt = new Date(startDt.getTime() + parseInt(duration, 10) * 60_000);

      let meetingLinkValue = '';
      if (platform === 'custom') {
        meetingLinkValue = customLink;
      } else if (platform === 'google_meet' || platform === 'zoom' || platform === 'teams') {
        meetingLinkValue = meetingLink;
      }

      await createTeachingSession({
        tutor: tutorProfile.id,
        title: title.trim(),
        description: description.trim(),
        session_type: sessionType,
        platform: platform,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        max_attendees: parseInt(maxAttendees, 10),
        meeting_link: meetingLinkValue,
        is_cancelled: false,
        recording_available: false,
        materials: [],
        current_attendees: 0,        // added required field
        status: 'scheduled',          // added required field
      });

      setSuccess(true);
      onCreated();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="ssm-overlay" onClick={onClose}>
        <div className="ssm-card success" onClick={e => e.stopPropagation()}>
          <div className="ssm-success-icon"><CheckCircle size={48} /></div>
          <h3>Session Created!</h3>
          <p>Your teaching session has been scheduled.</p>
          <button className="ssm-btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ssm-overlay" onClick={onClose}>
      <div className="ssm-card" onClick={e => e.stopPropagation()}>
        <div className="ssm-header">
          <div className="ssm-header-left">
            <div className="ssm-header-icon"><Video size={20} /></div>
            <span className="ssm-title">Schedule Teaching Session</span>
          </div>
          <button className="ssm-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ssm-body">
            <div className="ssm-field">
              <label className="ssm-label">Session Title *</label>
              <input ref={firstInputRef} className="ssm-input" placeholder="e.g. Advanced GPS Security" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="ssm-field">
              <label className="ssm-label">Description</label>
              <textarea className="ssm-textarea" placeholder="What will this session cover?" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="ssm-input-row">
              <div className="ssm-field">
                <label className="ssm-label"><Calendar size={12} /> Date</label>
                <input type="date" className="ssm-input" min={todayStr()} value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="ssm-field">
                <label className="ssm-label"><Clock size={12} /> Time</label>
                <input type="time" className="ssm-input" value={time} onChange={e => setTime(e.target.value)} required />
              </div>
              <div className="ssm-field">
                <label className="ssm-label">Duration</label>
                <select className="ssm-select" value={duration} onChange={e => setDuration(e.target.value)}>
                  <option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option>
                  <option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option>
                </select>
              </div>
            </div>

            <div className="ssm-input-row">
              <div className="ssm-field">
                <label className="ssm-label">Session Type</label>
                <select className="ssm-select" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                  <option value="live">Live Session</option>
                  <option value="recorded">Recorded Session</option>
                  <option value="workshop">Workshop</option>
                  <option value="qanda">Q&A Session</option>
                </select>
              </div>
              <div className="ssm-field">
                <label className="ssm-label">Platform</label>
                <select className="ssm-select" value={platform} onChange={e => setPlatform(e.target.value)}>
                  <option value="google_meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="custom">Custom Link</option>
                </select>
              </div>
              <div className="ssm-field">
                <label className="ssm-label"><Users size={12} /> Max Attendees</label>
                <input type="number" min="1" max="200" className="ssm-input" value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} />
              </div>
            </div>

            {(platform === 'google_meet' || platform === 'zoom' || platform === 'teams') && (
              <div className="ssm-field">
                <label className="ssm-label">Meeting Link</label>
                <input type="url" className="ssm-input" placeholder="https://meet.google.com/..." value={meetingLink} onChange={e => setMeetingLink(e.target.value)} />
              </div>
            )}

            {platform === 'custom' && (
              <div className="ssm-field">
                <label className="ssm-label">Custom Link</label>
                <input type="url" className="ssm-input" placeholder="https://..." value={customLink} onChange={e => setCustomLink(e.target.value)} required />
              </div>
            )}

            {error && <div className="ssm-error">{error}</div>}
          </div>

          <div className="ssm-footer">
            <button type="button" className="ssm-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="ssm-btn-primary" disabled={loading}>
              {loading ? <><Loader size={16} className="ssm-btn-spin" /> Creating…</> : <><Calendar size={16} /> Schedule Session</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleSessionModal;