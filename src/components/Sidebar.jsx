import React from 'react';
import { NavLink } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Home, BookOpen, GraduationCap, Users, LogOut, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { role, setSession } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <>
    <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)}></div>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <GraduationCap className="logo-icon" size={32} />
        <h2>Sistema Escolar React</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Inicio</span>
        </NavLink>

        {(role === 'Docente' || role === 'Admin') && (
          <NavLink to="/cursos" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BookOpen size={20} />
            <span>Mis Cursos</span>
          </NavLink>
        )}

        {role === 'Estudiante' && (
          <>
            <NavLink to="/catalogo" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <BookOpen size={20} />
              <span>Catálogo</span>
            </NavLink>
            <NavLink to="/calificaciones" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={20} />
              <span>Calificaciones</span>
            </NavLink>
          </>
        )}

        {role === 'Admin' && (
          <NavLink to="/usuarios" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>Usuarios</span>
          </NavLink>
        )}

        <NavLink to="/foros" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          <span>Foros</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="nav-item logout-btn">
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
