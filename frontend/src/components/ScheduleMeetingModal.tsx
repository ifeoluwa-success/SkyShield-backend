// src/components/ScheduleMeetingModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Video, Calendar, Clock, Users, Link, Copy, Check, ArrowRight, Loader } from 'lucide-react';
import api from '../services/api';
import '../assets/css/ScheduleMeetingModal.css';

interface CreatedMeeting {
  id: string;
  title: string;
  meeting_code: string;
  meeting_link?: string;
  scheduled_start?: string;
}

interface ScheduleMeetingModalProps {
  onClose: () => void;
  onCreated?: (meeting: CreatedMeeting) => void;
}

type TabType = 'instant' | 'schedule';

const todayStr = () => new Date().toISOString().slice(0, 10);
const defaultTime = () => {
  const d = new Date(Date.now() + 30 * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({ onClose, onCreated }) => {
  const navigate = useNavigate();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<TabType>('instant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedMeeting | null>(null);
  const [copied, setCopied] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(defaultTime());
  const [duration, setDuration] = useState('60');
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(false);
  const [enableRecording, setEnableRecording] = useState(false);

  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) { setError('Please enter a meeting title.'); return; }

    // Schedule tab: validate that the selected datetime is not in the past
    if (tab === 'schedule') {
      if (!date || !time) { setError('Please select date and time.'); return; }
      const selectedDateTime = new Date(`${date}T${time}`);
      if (selectedDateTime < new Date()) {
        setError('Cannot schedule meetings in the past. Please choose a future date and time.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        max_participants: parseInt(maxParticipants, 10) || 10,
        meeting_type: 'group',
        allow_recording: enableRecording,
        waiting_room_enabled: enableWaitingRoom,
      };

      if (tab === 'schedule') {
        const startDt = new Date(`${date}T${time}`);
        const endDt = new Date(startDt.getTime() + parseInt(duration, 10) * 60_000);
        payload.scheduled_start = startDt.toISOString();
        payload.scheduled_end = endDt.toISOString();
      } else {
        // Instant meeting: add a 1‑minute buffer to ensure it's in the future
        const now = new Date();
        const startDt = new Date(now.getTime() + 60 * 1000);
        const endDt = new Date(startDt.getTime() + 60 * 60_000);
        payload.scheduled_start = startDt.toISOString();
        payload.scheduled_end = endDt.toISOString();
      }

      const { data } = await api.post<CreatedMeeting>('/meetings/meetings/', payload);
      setCreated(data);
      onCreated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.meeting_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const startNow = () => {
    if (!created) return;
    onClose();
    navigate(`/meetings/join/${created.meeting_code}`);
  };

  if (created) {
    const joinUrl = created.meeting_link ?? `${window.location.origin}/meetings/join/${created.meeting_code}`;
    return (
      <div className="smm-overlay" onClick={onClose}>
        <div className="smm-card" onClick={e => e.stopPropagation()}>
          <div className="smm-header">
            <div className="smm-header-left">
              <div className="smm-header-icon"><Video size={20} /></div>
              <span className="smm-title">Meeting Created</span>
            </div>
            <button className="smm-close-btn" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="smm-success">
            <div className="smm-success-icon"><Check size={32} /></div>
            <div className="smm-success-title">{created.title}</div>
            <div className="smm-success-sub">Your meeting is ready to start</div>
            <div style={{ width: '100%' }}>
              <div className="smm-label" style={{ marginBottom: 8 }}>Meeting Code</div>
              <div className="smm-code-box">
                <span className="smm-code-text">{created.meeting_code}</span>
                <button className="smm-copy-btn" onClick={copyCode}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
            <div className="smm-link-row">
              <Link size={14} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{joinUrl}</span>
              <button className="smm-copy-btn" onClick={() => navigator.clipboard.writeText(joinUrl)}><Copy size={14} /></button>
            </div>
            <div className="smm-success-actions">
              <button className="smm-btn-secondary" onClick={onClose}>Done</button>
              <button className="smm-btn-start" onClick={startNow}>
                <Video size={16} /> Start Meeting <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="smm-overlay" onClick={onClose}>
      <div className="smm-card" onClick={e => e.stopPropagation()}>
        <div className="smm-header">
          <div className="smm-header-left">
            <div className="smm-header-icon"><Video size={20} /></div>
            <span className="smm-title">New Meeting</span>
          </div>
          <button className="smm-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="smm-tabs">
          <button className={`smm-tab ${tab === 'instant' ? 'active' : ''}`} onClick={() => setTab('instant')}>⚡ Start Instantly</button>
          <button className={`smm-tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>📅 Schedule for Later</button>
        </div>

        <div className="smm-body">
          <div className="smm-field">
            <label className="smm-label">Meeting Title *</label>
            <input ref={firstInputRef} className="smm-input" placeholder="e.g. Quick Catch-up" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
          </div>
          <div className="smm-field">
            <label className="smm-label">Description</label>
            <textarea className="smm-textarea" placeholder="What will this meeting cover? (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {tab === 'schedule' && (
            <div className="smm-input-row">
              <div className="smm-field"><label className="smm-label"><Calendar size={12} /> Date</label><input type="date" className="smm-input" min={todayStr()} value={date} onChange={e => setDate(e.target.value)} required /></div>
              <div className="smm-field"><label className="smm-label"><Clock size={12} /> Time</label><input type="time" className="smm-input" value={time} onChange={e => setTime(e.target.value)} required /></div>
              <div className="smm-field"><label className="smm-label">Duration</label><select className="smm-select" value={duration} onChange={e => setDuration(e.target.value)}><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option></select></div>
            </div>
          )}

          <div className="smm-field">
            <label className="smm-label"><Users size={12} /> Max Participants</label>
            <select className="smm-select" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)}>
              {[2, 5, 10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n} participants</option>)}
            </select>
          </div>

          <label className="smm-check-row">
            <input type="checkbox" checked={enableWaitingRoom} onChange={e => setEnableWaitingRoom(e.target.checked)} />
            <div><div className="smm-check-label">Waiting Room</div><div className="smm-check-sub">Participants wait for you to let them in</div></div>
          </label>
          <label className="smm-check-row">
            <input type="checkbox" checked={enableRecording} onChange={e => setEnableRecording(e.target.checked)} />
            <div><div className="smm-check-label">Record Meeting</div><div className="smm-check-sub">Auto-save recording when meeting ends</div></div>
          </label>

          {error && <div className="smm-error">{error}</div>}
        </div>

        <div className="smm-footer">
          <button className="smm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="smm-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader size={16} className="smm-btn-spin" /> Creating…</> : tab === 'instant' ? <><Video size={16} /> Start Now</> : <><Calendar size={16} /> Schedule Meeting</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;