import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile, changePassword } from '../../services/authService';
import { User, Camera, Eye, EyeOff } from 'lucide-react';
import Toast from '../../components/Toast';
import SuccessModal from '../../components/SuccessModal';
import '../../assets/css/ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    organization: '',
    department: '',
    job_title: '',
    phone_number: '',
    bio: '',
    date_of_birth: '',
    address: '',
  });
  
  // Avatar state
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
  
  // Load user data
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        username: user.username || '',
        organization: user.organization || '',
        department: user.department || '',
        job_title: user.job_title || '',
        phone_number: user.phone_number || '',
        bio: user.bio || '',
        date_of_birth: user.date_of_birth || '',
        address: user.address || '',
      });
      if (user.profile_picture) {
        setAvatarPreview(user.profile_picture);
      }
    }
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        // Here you would upload the file to backend
        setToast({ type: 'info', message: 'Avatar upload will be implemented soon.' });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updated = await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        organization: formData.organization,
        department: formData.department,
        job_title: formData.job_title,
        phone_number: formData.phone_number,
        bio: formData.bio,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        email_notifications: true, // will be handled in settings
      });
      
      updateUser(updated);
      setSuccessModal({
        title: 'Profile Updated',
        message: 'Your profile has been successfully updated.',
      });
    } catch {
      setToast({ type: 'error', message: 'Failed to update profile. Please try again.' });
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
    <div className="profile-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {successModal && (
        <SuccessModal
          isOpen={true}
          onClose={() => setSuccessModal(null)}
          title={successModal.title}
          message={successModal.message}
        />
      )}
      
      <div className="page-header">
        <h1>Profile Settings</h1>
        <p>Manage your personal information and account details</p>
      </div>
      
      <div className="profile-content">
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h2>Personal Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} disabled readOnly />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  disabled
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Organization</label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="Company/Institution"
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., IT, Security"
                />
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="e.g., Security Analyst"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="+1234567890"
                />
              </div>
              <div className="form-group full-width">
                <label>Bio</label>
                <textarea
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street, City, Country"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        
        <div className="profile-sidebar">
          <div className="avatar-section">
            <div className="avatar" onClick={handleAvatarClick}>
              {avatarPreview ? (
                <img src={avatarPreview} alt={user?.full_name || 'Avatar'} />
              ) : (
                <div className="avatar-placeholder">
                  <User size={48} />
                </div>
              )}
              <button className="change-avatar-btn" type="button">
                <Camera size={16} />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <h3>{user?.full_name || user?.email}</h3>
            <p className="role">{user?.role}</p>
          </div>
          
          <div className="change-password-section">
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group password-group">
                <label>Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    tabIndex={-1}
                  >
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
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
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
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-secondary" disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;