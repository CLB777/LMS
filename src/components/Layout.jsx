import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-container animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
