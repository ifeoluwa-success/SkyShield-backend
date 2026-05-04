// src/pages/tutor/TutorProfilePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { uploadAvatar, updateUserProfile, changePassword } from '../../services/tutorService';
import { getTutorProfile, updateTutorProfile } from '../../services/tutorService';
import { User, Camera, Loader2, Plus, X, Eye, EyeOff, ChevronDown } from 'lucide-react';
import Toast from '../../components/Toast';
import SuccessModal from '../../components/SuccessModal';
import '../../assets/css/TutorProfilePage.css';

const TutorProfilePage: React.FC = () => {
  const { user: authUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User fields (personal information)
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    organization: '',
    department: '',
    phone_number: '',
    bio: '',
    date_of_birth: '',
    address: '',
  });

  // Tutor specific fields
  const [tutorData, setTutorData] = useState({
    specialization: [] as string[],
    bio: '',
    qualifications: [] as string[],
    experience_years: 0,
    default_meeting_duration: 60,
    default_max_participants: 50,
    allow_recording: true,
    allow_chat: true,
    allow_screen_share: true,
  });

  const [newSpecialization, setNewSpecialization] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password2: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Accordion sections open state
  const [openSections, setOpenSections] = useState({
    personal: true,
    professional: true,
    meeting: true,
    password: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Load profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getTutorProfile();
        setUserData({
          first_name: profile.user.first_name || '',
          last_name: profile.user.last_name || '',
          email: profile.user.email || '',
          username: profile.user.username || '',
          organization: profile.user.organization || '',
          department: profile.user.department || '',
          phone_number: profile.user.phone_number || '',
          bio: profile.user.bio || '',
          date_of_birth: profile.user.date_of_birth || '',
          address: profile.user.address || '',
        });
        setTutorData({
          specialization: profile.specialization || [],
          bio: profile.bio || '',
          qualifications: profile.qualifications || [],
          experience_years: profile.experience_years || 0,
          default_meeting_duration: profile.default_meeting_duration || 60,
          default_max_participants: profile.default_max_participants || 50,
          allow_recording: profile.allow_recording,
          allow_chat: profile.allow_chat,
          allow_screen_share: profile.allow_screen_share,
        });
        setAvatarPreview(profile.user.profile_picture);
      } catch {
        setToast({ type: 'error', message: 'Failed to load profile data.' });
      }
    };
    fetchProfile();
  }, []);

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleTutorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTutorData({ ...tutorData, [e.target.name]: e.target.value });
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setAvatarLoading(true);
    try {
      const updatedUser = await uploadAvatar(file);
      updateUser(updatedUser);
      setToast({ type: 'success', message: 'Profile picture updated!' });
    } catch {
      setToast({ type: 'error', message: 'Failed to upload picture.' });
      setAvatarPreview(authUser?.profile_picture || null);
    } finally {
      setAvatarLoading(false);
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !tutorData.specialization.includes(newSpecialization.trim())) {
      setTutorData({
        ...tutorData,
        specialization: [...tutorData.specialization, newSpecialization.trim()],
      });
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (item: string) => {
    setTutorData({
      ...tutorData,
      specialization: tutorData.specialization.filter(s => s !== item),
    });
  };

  const addQualification = () => {
    if (newQualification.trim() && !tutorData.qualifications.includes(newQualification.trim())) {
      setTutorData({
        ...tutorData,
        qualifications: [...tutorData.qualifications, newQualification.trim()],
      });
      setNewQualification('');
    }
  };

  const removeQualification = (item: string) => {
    setTutorData({
      ...tutorData,
      qualifications: tutorData.qualifications.filter(q => q !== item),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update user personal info
      const updatedUser = await updateUserProfile({
        first_name: userData.first_name,
        last_name: userData.last_name,
        organization: userData.organization,
        department: userData.department,
        phone_number: userData.phone_number,
        bio: userData.bio,
        date_of_birth: userData.date_of_birth ? userData.date_of_birth : undefined,
        address: userData.address,
      });

      // Update tutor profile
      const updatedTutor = await updateTutorProfile({
        specialization: tutorData.specialization,
        bio: tutorData.bio,
        qualifications: tutorData.qualifications,
        experience_years: tutorData.experience_years,
        default_meeting_duration: tutorData.default_meeting_duration,
        default_max_participants: tutorData.default_max_participants,
        allow_recording: tutorData.allow_recording,
        allow_chat: tutorData.allow_chat,
        allow_screen_share: tutorData.allow_screen_share,
      });

      // Update local state with fresh server data
      setUserData({
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        username: updatedUser.username,
        organization: updatedUser.organization,
        department: updatedUser.department,
        phone_number: updatedUser.phone_number,
        bio: updatedUser.bio,
        date_of_birth: updatedUser.date_of_birth || '',
        address: updatedUser.address,
      });

      setTutorData({
        specialization: updatedTutor.specialization,
        bio: updatedTutor.bio,
        qualifications: updatedTutor.qualifications,
        experience_years: updatedTutor.experience_years,
        default_meeting_duration: updatedTutor.default_meeting_duration,
        default_max_participants: updatedTutor.default_max_participants,
        allow_recording: updatedTutor.allow_recording,
        allow_chat: updatedTutor.allow_chat,
        allow_screen_share: updatedTutor.allow_screen_share,
      });

      updateUser(updatedUser);

      setSuccessModal({
        title: 'Profile Updated',
        message: 'Your profile has been successfully updated.',
      });
    } catch {
      setToast({ type: 'error', message: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.new_password2) {
      setToast({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
        new_password2: passwordData.new_password2,
      });
      setSuccessModal({
        title: 'Password Changed',
        message: 'Your password has been successfully changed.',
      });
      setPasswordData({ old_password: '', new_password: '', new_password2: '' });
    } catch {
      setToast({ type: 'error', message: 'Failed to change password. Check your old password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="tutor-profile-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {successModal && (
        <SuccessModal
          isOpen={true}
          onClose={() => setSuccessModal(null)}
          title={successModal.title}
          message={successModal.message}
        />
      )}

      <div className="page-header">
        <h1>Tutor Profile</h1>
        <p>Manage your personal and professional information</p>
      </div>

      <div className="profile-content">
        <div className="profile-form">
          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div className={`form-section ${openSections.personal ? 'open' : ''}`}>
              <button type="button" className="section-header" onClick={() => toggleSection('personal')}>
                <h2>Personal Information</h2>
                <ChevronDown size={20} className={`chevron ${openSections.personal ? 'rotated' : ''}`} />
              </button>
              {openSections.personal && (
                <div className="section-content">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>First Name</label>
                      <input type="text" name="first_name" value={userData.first_name} onChange={handleUserChange} placeholder="John" />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" name="last_name" value={userData.last_name} onChange={handleUserChange} placeholder="Doe" />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={userData.email} disabled readOnly />
                    </div>
                    <div className="form-group">
                      <label>Username</label>
                      <input type="text" value={userData.username} disabled readOnly />
                    </div>
                    <div className="form-group">
                      <label>Organization</label>
                      <input type="text" name="organization" value={userData.organization} onChange={handleUserChange} placeholder="Company/Institution" />
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <input type="text" name="department" value={userData.department} onChange={handleUserChange} placeholder="e.g., IT, Security" />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input type="tel" name="phone_number" value={userData.phone_number} onChange={handleUserChange} placeholder="+1234567890" />
                    </div>
                    <div className="form-group full-width">
                      <label>Bio</label>
                      <textarea name="bio" rows={4} value={userData.bio} onChange={handleUserChange} placeholder="Tell us about yourself..." />
                    </div>
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" name="date_of_birth" value={userData.date_of_birth} onChange={handleUserChange} />
                    </div>
                    <div className="form-group full-width">
                      <label>Address</label>
                      <input type="text" name="address" value={userData.address} onChange={handleUserChange} placeholder="Street, City, Country" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Professional Information Section */}
            <div className={`form-section ${openSections.professional ? 'open' : ''}`}>
              <button type="button" className="section-header" onClick={() => toggleSection('professional')}>
                <h2>Professional Information</h2>
                <ChevronDown size={20} className={`chevron ${openSections.professional ? 'rotated' : ''}`} />
              </button>
              {openSections.professional && (
                <div className="section-content">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Tutor Bio</label>
                      <textarea name="bio" rows={4} value={tutorData.bio} onChange={handleTutorChange} placeholder="Your teaching experience and expertise..." />
                    </div>
                    <div className="form-group">
                      <label>Years of Experience</label>
                      <input type="number" name="experience_years" value={tutorData.experience_years} onChange={handleTutorChange} min="0" />
                    </div>
                    <div className="form-group full-width">
                      <label>Specializations</label>
                      <div className="tags-input">
                        <div className="tags-list">
                          {tutorData.specialization.map(spec => (
                            <span key={spec} className="tag">
                              {spec}
                              <button type="button" onClick={() => removeSpecialization(spec)}>
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="add-tag">
                          <input
                            type="text"
                            value={newSpecialization}
                            onChange={(e) => setNewSpecialization(e.target.value)}
                            placeholder="Add specialization (e.g., Cybersecurity, Network Security)"
                          />
                          <button type="button" onClick={addSpecialization}><Plus size={16} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="form-group full-width">
                      <label>Qualifications</label>
                      <div className="tags-input">
                        <div className="tags-list">
                          {tutorData.qualifications.map(qual => (
                            <span key={qual} className="tag">
                              {qual}
                              <button type="button" onClick={() => removeQualification(qual)}>
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="add-tag">
                          <input
                            type="text"
                            value={newQualification}
                            onChange={(e) => setNewQualification(e.target.value)}
                            placeholder="Add qualification (e.g., CISSP, CEH)"
                          />
                          <button type="button" onClick={addQualification}><Plus size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Meeting Preferences Section */}
            <div className={`form-section ${openSections.meeting ? 'open' : ''}`}>
              <button type="button" className="section-header" onClick={() => toggleSection('meeting')}>
                <h2>Meeting Preferences</h2>
                <ChevronDown size={20} className={`chevron ${openSections.meeting ? 'rotated' : ''}`} />
              </button>
              {openSections.meeting && (
                <div className="section-content">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Default Meeting Duration (minutes)</label>
                      <input type="number" name="default_meeting_duration" value={tutorData.default_meeting_duration} onChange={handleTutorChange} min="15" step="15" />
                    </div>
                    <div className="form-group">
                      <label>Default Max Participants</label>
                      <input type="number" name="default_max_participants" value={tutorData.default_max_participants} onChange={handleTutorChange} min="1" max="200" />
                    </div>
                    <div className="form-group full-width">
                      <label>Allowed Features</label>
                      <div className="checkbox-group">
                        <label><input type="checkbox" checked={tutorData.allow_recording} onChange={(e) => setTutorData({ ...tutorData, allow_recording: e.target.checked })} /> Allow Recording</label>
                        <label><input type="checkbox" checked={tutorData.allow_chat} onChange={(e) => setTutorData({ ...tutorData, allow_chat: e.target.checked })} /> Allow Chat</label>
                        <label><input type="checkbox" checked={tutorData.allow_screen_share} onChange={(e) => setTutorData({ ...tutorData, allow_screen_share: e.target.checked })} /> Allow Screen Sharing</label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="profile-sidebar">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              <div className="avatar" onClick={handleAvatarClick}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt={authUser?.full_name || 'Avatar'} />
                ) : (
                  <div className="avatar-placeholder"><User size={48} /></div>
                )}
              </div>
            </div>
            <button className="change-avatar-btn" onClick={handleAvatarClick} disabled={avatarLoading}>
              {avatarLoading ? <Loader2 size={16} className="spinner" /> : <Camera size={16} />}
              <span>Change Photo</span>
            </button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
            <h3>{authUser?.full_name || authUser?.email}</h3>
            <p className="role">{authUser?.role}</p>
          </div>

          <div className="stats-card">
            <h3>Teaching Stats</h3>
            <div className="stats-grid">
              <div className="stat-item"><span className="stat-value">{tutorData.experience_years}+</span><span className="stat-label">Years</span></div>
              <div className="stat-item"><span className="stat-value">{tutorData.specialization.length}</span><span className="stat-label">Spec.</span></div>
              <div className="stat-item"><span className="stat-value">{tutorData.qualifications.length}</span><span className="stat-label">Qual.</span></div>
            </div>
          </div>

          {/* Password Change Accordion */}
          <div className={`change-password-section ${openSections.password ? 'open' : ''}`}>
            <button className="section-header" onClick={() => toggleSection('password')}>
              <h3>Change Password</h3>
              <ChevronDown size={20} className={`chevron ${openSections.password ? 'rotated' : ''}`} />
            </button>
            {openSections.password && (
              <form onSubmit={handlePasswordChange}>
                <div className="form-group password-group">
                  <label>Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      required
                      autoComplete="current-password"
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowOldPassword(!showOldPassword)}>
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-group password-group">
                  <label>New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-group password-group">
                  <label>Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.new_password2}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password2: e.target.value })}
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-secondary" disabled={passwordLoading}>
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfilePage;