import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './Layout.css';

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="layout-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="main-content">
        <Topbar toggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="page-container animate-fade-in" onClick={() => setMobileOpen(false)}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
