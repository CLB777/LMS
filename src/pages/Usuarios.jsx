import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Shield, BookOpen } from 'lucide-react';
import './CourseCatalog.css';

const Usuarios = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('usuarios').select('*, roles(nombre)').order('nombre');
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleToggleBlock = async (id, name, isActive) => {
    if (!window.confirm(`¿Estás seguro de ${isActive ? "BLOQUEAR" : "DESBLOQUEAR"} el acceso a ${name} permanentemente?`)) return;
    await supabase.from('usuarios').update({ activo: !isActive }).eq('id_usuario', id);
    fetchUsers();
  };

  const handleWarnUser = async (id, name) => {
    const msg = window.prompt(`Escribe el mensaje de advertencia para ${name}:`);
    if (!msg) return;
    await supabase.from('notificaciones').insert([{ id_usuario: id, mensaje: `🚨 MESA DE AYUDA (ADMIN): ${msg}` }]);
    alert("Advertencia enviada exitosamente.");
  };

  const renderUserCard = (user, idx) => {
    const isActive = user.activo !== false;
    return (
      <div key={user.id_usuario || `usr-${idx}`} className="course-card glass animate-fade-in" style={{padding: '1.5rem', opacity: isActive ? 1 : 0.6}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.nombre || 'U'}&backgroundColor=e0e7ff`} alt="Avatar" style={{width: 50, height: 50, borderRadius: 25}} />
            <div>
              <h3 style={{margin: 0, fontSize: '1.1rem'}}>{user.nombre || 'Sin Nombre'} {isActive ? '' : '(BLOQUEADO)'}</h3>
              <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{user.correo}</p>
            </div>
        </div>
        <div style={{display: 'inline-block', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem'}}>
          Rol: {user.roles?.nombre || 'Usuario Registrado'}
        </div>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button className="btn btn-outline" style={{flex: 1, borderColor: 'var(--warning)', color: 'var(--warning)', padding: '0.5rem'}} onClick={() => handleWarnUser(user.id_usuario, user.nombre)}>
            Advertir
          </button>
          <button className="btn btn-outline" style={{flex: 1, borderColor: isActive ? 'var(--danger)' : 'var(--success)', color: isActive ? 'var(--danger)' : 'var(--success)', padding: '0.5rem'}} onClick={() => handleToggleBlock(user.id_usuario, user.nombre, isActive)}>
            {isActive ? 'Bloquear' : 'Desbloquear'}
          </button>
        </div>
      </div>
    )
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header glass animate-fade-in">
        <div className="catalog-title">
          <Shield className="title-icon" size={28} />
          <div>
            <h1>Administración de Usuarios</h1>
            <p>Monitorea y gestiona todos los perfiles registrados en el Sistema Escolar React.</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div style={{padding: '2rem'}}><p>Cargando administradores...</p></div>
      ) : (
        <>
          <div style={{marginBottom: '3rem'}}>
            <h2 style={{borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem'}}>Administradores</h2>
            <div className="courses-grid" style={{marginTop: '1rem'}}>
              {users.filter(u => u.roles?.nombre === 'Administrador').map(renderUserCard)}
            </div>
          </div>
          
          <div style={{marginBottom: '3rem'}}>
            <h2 style={{borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem'}}>Docentes</h2>
            <div className="courses-grid" style={{marginTop: '1rem'}}>
              {users.filter(u => u.roles?.nombre === 'Docente').map(renderUserCard)}
            </div>
          </div>

          <div style={{marginBottom: '3rem'}}>
            <h2 style={{borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem'}}>Estudiantes</h2>
            <div className="courses-grid" style={{marginTop: '1rem'}}>
              {users.filter(u => u.roles?.nombre === 'Estudiante').map(renderUserCard)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Usuarios;
