import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, UserCheck, ShieldAlert, Key } from 'lucide-react';
import './Auth.css';

const ROLES = {
  admin: 'd8a6c97e-aa0f-4bf2-b2df-80466422dd33',
  docente: '75705286-db0f-41e3-acb7-a88e810ec5ce',
  estudiante: '04d269d5-7339-4661-b9ee-5b725c3f05f2'
};

const Auth = () => {
  const [view, setView] = useState('login'); // login, signup, reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES.estudiante);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: name,
          id_rol: role
        }
      }
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ 
        text: '¡Registro exitoso! Por favor, verifica tu correo electrónico para poder iniciar sesión.', 
        type: 'success' 
      });
      setView('login');
      setPassword('');
      setEmail('');
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ 
        text: 'Te hemos enviado un enlace para recuperar tu contraseña al correo ingresado.', 
        type: 'success' 
      });
      setView('login');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setMessage({ text: error.message, type: 'error' });
  };

  const toggleView = (newView) => {
    setView(newView);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className="auth-container">
      <div className="auth-glass-box glass">
        <div className="auth-header">
          <h2>Sistema Escolar React</h2>
          <p>{view === 'login' ? 'Bienvenido de vuelta' : view === 'signup' ? 'Crea una nueva cuenta' : 'Recuperar contraseña'}</p>
        </div>

        {message.text && (
          <div className={`auth-message ${message.type}`}>
            {message.type === 'error' ? <ShieldAlert size={18} /> : <UserCheck size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="auth-form animate-fade-in">
            <div className="input-group">
              <Mail className="input-icon" size={18} />
              <input type="email" placeholder="Correo Electrónico" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <Lock className="input-icon" size={18} />
              <input type="password" placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
            <div className="auth-links">
              <span onClick={() => toggleView('reset')}>¿Olvidaste tu contraseña?</span>
              <span onClick={() => toggleView('signup')}>No tengo cuenta. Registrarme</span>
            </div>

            <hr style={{margin: '1rem 0', borderColor: 'var(--border-color)', opacity: 0.5}} />
            
            <button type="button" className="btn btn-outline" onClick={handleGoogleLogin}>
              Continuar con Google
            </button>
            <small style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center'}}>
              * Si inicias sesión con Google mediante este botón, entrarás directamente con el perfil de <strong>Estudiante</strong>. 
              Si eres docente o administrador, usa el registro manual.
            </small>
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignUp} className="auth-form animate-fade-in">
            <div className="input-group">
              <User className="input-icon" size={18} />
              <input type="text" placeholder="Nombre completo" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="input-group">
              <Mail className="input-icon" size={18} />
              <input type="email" placeholder="Correo Electrónico" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <Lock className="input-icon" size={18} />
              <input type="password" placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="input-group select-group">
              <Key className="input-icon" size={18} />
              <select value={role} onChange={e => setRole(e.target.value)} required>
                <option value={ROLES.estudiante}>Soy Estudiante</option>
                <option value={ROLES.docente}>Soy Docente</option>
                <option value={ROLES.admin}>Soy Administrador</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Cuenta'}
            </button>
            <div className="auth-links center">
              <span onClick={() => toggleView('login')}>Ya tengo una cuenta. Iniciar Sesión</span>
            </div>
            
            <hr style={{margin: '1rem 0', borderColor: 'var(--border-color)', opacity: 0.5}} />
            
            <button type="button" className="btn btn-outline" onClick={handleGoogleLogin}>
              Registrarse con Google
            </button>
            <small style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center'}}>
              * Al registrarte con Google se te asignará automáticamente el perfil de <strong>Estudiante</strong>. 
              Si eres docente o administrador, completa el formulario superior.
            </small>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleReset} className="auth-form animate-fade-in">
            <p className="reset-desc">Ingresa tu correo electrónico asociado para enviarte un enlace mágico para reestablecer tu contraseña.</p>
            <div className="input-group">
              <Mail className="input-icon" size={18} />
              <input type="email" placeholder="Correo Electrónico" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Enviando enlace...' : 'Recuperar Contraseña'}
            </button>
            <div className="auth-links center">
              <span onClick={() => toggleView('login')}>Volver a Inicio de Sesión</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
