import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import useAuthStore from './store/useAuthStore';
import AuthPage from './pages/Auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CourseCatalog from './pages/CourseCatalog';
import ManageCourses from './pages/ManageCourses';
import CourseDetails from './pages/CourseDetails';
import Quizzes from './pages/Quizzes';
import Grades from './pages/Grades';
import Forums from './pages/Forums';
import Usuarios from './pages/Usuarios';

function App() {
  const { session, setSession, setUser, setRole, setProfile, isLoading, setIsLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`*, roles ( nombre )`)
        .eq('id_usuario', userId)
        .single();
      
      if (userData) {
        if (userData.activo === false) {
          await supabase.auth.signOut();
          alert("Este correo está bloqueado. Contacta con el administrador del sistema.");
          return;
        }
        setProfile(userData);
        setRole(userData.roles?.nombre === 'Administrador' ? 'Admin' : userData.roles?.nombre);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="app-container" style={{justifyContent: 'center', alignItems: 'center'}}>
      <p>Cargando Plataforma...</p>
    </div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={session ? <Navigate to="/dashboard" /> : <AuthPage />} />
        
        {/* Rutas protegidas */}
        <Route path="/" element={session ? <Layout /> : <Navigate to="/auth" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="catalogo" element={<CourseCatalog />} />
          <Route path="curso/:id" element={<CourseDetails />} />
          <Route path="cursos" element={<ManageCourses />} />
          <Route path="calificaciones" element={<Grades />} />
          <Route path="evaluaciones" element={<Quizzes />} />
          <Route path="foros" element={<Forums />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
