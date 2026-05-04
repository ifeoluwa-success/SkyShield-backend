// src/components/TutorDashboardLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TutorSidebar from './TutorSidebar';
import DashboardHeader from './DashboardHeader';
import '../assets/css/TutorDashboardLayout.css';

const TutorDashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="tutor-dashboard-layout">
      <TutorSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className="tutor-main-content">
        <DashboardHeader onMobileToggle={toggleSidebar} />
        
        <main className="tutor-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TutorDashboardLayout;