// src/components/DashboardLayout.tsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import "../assets/css/DashboardLayout.css";

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="dashboard-layout">
      <DashboardSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <div className="dashboard-main">
        <DashboardHeader onMobileToggle={toggleSidebar} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;