import React, { useEffect, useState, useRef } from 'react';
import { Moon, Sun, Bell } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

const Topbar = () => {
  const { profile, role } = useAuthStore();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    if (profile?.id_usuario) {
      fetchNotifications();
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notificaciones')
      .select('*')
      .eq('id_usuario', profile.id_usuario)
      .order('fecha', { ascending: false })
      .limit(10);
    if (data) setNotifications(data);
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    await supabase.from('notificaciones').update({ leido: true }).eq('id_usuario', profile.id_usuario);
    fetchNotifications();
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="topbar">
      <div className="topbar-search">
        {/* Placeholder for future global search */}
      </div>
      
      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Dark Mode">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div style={{position: 'relative'}} ref={notificationsRef}>
          <button className="icon-btn" aria-label="Notificaciones" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            {notifications.filter(n => !n.leido).length > 0 && (
              <span style={{position:'absolute', top:0, right:0, background:'var(--danger)', color:'white', borderRadius:'50%', fontSize:'10px', padding:'2px 5px'}}>
                {notifications.filter(n => !n.leido).length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="glass" style={{position:'absolute', top:'120%', right:0, width:'300px', padding:'1rem', zIndex:1000}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                <h4 style={{margin:0}}>Notificaciones</h4>
                <button style={{background:'none', border:'none', color:'var(--primary)', cursor:'pointer', fontSize:'0.8rem'}} onClick={markAllAsRead}>Marcar leídas</button>
              </div>
              <hr style={{margin: '0.5rem 0', borderColor: 'var(--border-color)'}}/>
              <div style={{maxHeight:'300px', overflowY:'auto'}}>
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id_notificacion} style={{padding:'0.5rem', borderBottom:'1px solid var(--border-color)', opacity: n.leido ? 0.6 : 1}}>
                    <p style={{margin:0, fontSize:'0.9rem'}}>{n.mensaje}</p>
                    <small style={{color:'var(--text-secondary)', fontSize:'0.75rem'}}>{new Date(n.fecha).toLocaleDateString()}</small>
                  </div>
                )) : <p style={{fontSize:'0.85rem'}}>No tienes notificaciones recientes.</p>}
              </div>
            </div>
          )}
        </div>
        <div className="user-profile-sm">
          <div className="user-info">
            <span className="user-name">{profile?.nombre || 'Usuario'}</span>
            <span className="user-role">{role}</span>
          </div>
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile?.nombre || 'U'}&backgroundColor=e0e7ff`} alt="Avatar" className="avatar-sm" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
