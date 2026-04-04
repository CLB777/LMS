import React, { useEffect, useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { Quote, BookOpen, Clock, Award } from 'lucide-react';
import './Dashboard.css';

const INSPIRATIONAL_QUOTES = [
  { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
  { text: "La educación es el pasaporte hacia el futuro, el mañana pertenece a aquellos que se preparan.", author: "Malcolm X" },
  { text: "Nunca consideres el estudio como una obligación, sino como una oportunidad para penetrar en el bello y maravilloso mundo del saber.", author: "Albert Einstein" },
  { text: "Lo único que interfiere con mi aprendizaje es mi educación.", author: "Albert Einstein" },
  { text: "Cree en ti mismo y en lo que eres. Sé consciente de que hay algo en tu interior que es más grande que cualquier obstáculo.", author: "Christian D. Larson" },
];

const Dashboard = () => {
  const { profile, role } = useAuthStore();
  const [quote, setQuote] = useState({ text: 'Cargando inspiración...', author: '' });
  const [stats, setStats] = useState({ courses: 0, pending: 0 });

  useEffect(() => {
    // Frase aleatoria del listado interno para carga instantánea
    const randomIdx = Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length);
    setQuote(INSPIRATIONAL_QUOTES[randomIdx]);

    fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;
    
    if (role === 'Estudiante') {
      const { count } = await supabase.from('inscripciones').select('*', { count: 'exact', head: true }).eq('id_usuario', profile.id_usuario);
      
      const { data: misCursos } = await supabase.from('inscripciones').select('id_curso').eq('id_usuario', profile.id_usuario);
      const misCIds = misCursos?.map(c => c.id_curso) || [];
      const { data: qMods } = misCIds.length ? await supabase.from('modulos').select('id_modulo').in('id_curso', misCIds) : { data: [] };
      const mIds = qMods?.map(m => m.id_modulo) || [];
      const { data: myTasks } = mIds.length ? await supabase.from('tareas').select('id_tarea, fecha_limite').in('id_modulo', mIds) : { data: [] };
      
      // Filter only tasks that have NOT expired
      const now = new Date();
      const activeTasks = myTasks ? myTasks.filter(t => !t.fecha_limite || new Date(t.fecha_limite) > now) : [];
      const countActiveTareas = activeTasks.length;
      
      const { count: countEntregadas } = await supabase.from('entregas').select('*', { count: 'exact', head: true }).eq('id_usuario', profile.id_usuario);
      const pendientes = Math.max(0, countActiveTareas - (countEntregadas || 0));

      const { data: finales } = await supabase.from('inscripciones').select('calificacion_final').eq('id_usuario', profile.id_usuario).not('calificacion_final', 'is', null);
      let avgFinals = 0;
      if (finales && finales.length > 0) {
         avgFinals = finales.reduce((a,c) => a + c.calificacion_final, 0) / finales.length;
      }
      
      setStats({ 
        courses: count || 0, 
        pending: pendientes, 
        avg: avgFinals.toFixed(1),
        isOfficial: true
      });
    } else if (role === 'Docente') {
      const { count } = await supabase.from('cursos').select('*', { count: 'exact', head: true }).eq('id_docente', profile.id_usuario);
      
      const { data: dCursos } = await supabase.from('cursos').select('id_curso').eq('id_docente', profile.id_usuario);
      const dCIds = dCursos?.map(c => c.id_curso) || [];
      let pendingToGrade = 0;

      if (dCIds.length > 0) {
        const { data: dMods } = await supabase.from('modulos').select('id_modulo').in('id_curso', dCIds);
        const dMIds = dMods?.map(m => m.id_modulo) || [];
        if (dMIds.length > 0) {
          const { data: dTks } = await supabase.from('tareas').select('id_tarea').in('id_modulo', dMIds);
          const dTIds = dTks?.map(t => t.id_tarea) || [];
          if (dTIds.length > 0) {
            const { data: allE } = await supabase.from('entregas').select('id_entrega').in('id_tarea', dTIds);
            const { data: allC } = await supabase.from('calificaciones').select('id_entrega');
            const cIds = allC?.map(c => c.id_entrega) || [];
            pendingToGrade = allE?.filter(e => !cIds.includes(e.id_entrega)).length || 0;
          }
        }
      }

      setStats({ courses: count || 0, pending: pendingToGrade });
    }
  };

  return (
    <div className="dashboard">
      <div className="welcome-banner glass animate-fade-in">
        <div className="welcome-content">
          <h1>Bienvenido {profile?.nombre}!</h1>
          <p>Sistema Escolar React - Eres: <strong>{role}</strong></p>
        </div>
        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile?.nombre || 'U'}&backgroundColor=e0e7ff`} alt="Avatar" className="user-avatar-large" />
      </div>

      <div className="quote-card glass animate-fade-in" style={{animationDelay: '0.1s'}}>
        <Quote className="quote-icon" size={24} />
        <div className="quote-text">
          <p>"{quote.text}"</p>
          <small>- {quote.author}</small>
        </div>
      </div>

      <div className="stats-grid animate-fade-in" style={{animationDelay: '0.2s'}}>
        <div className="stat-card glass">
          <div className="stat-icon-wrapper blue">
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.courses}</h3>
            <p>{role === 'Docente' ? 'Cursos Creados' : 'Cursos Inscritos'}</p>
          </div>
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon-wrapper orange">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.pending}</h3>
            <p>{role === 'Docente' ? 'Entregas por revisar' : 'Tareas Pendientes'}</p>
          </div>
        </div>

        {role === 'Estudiante' && (
          <div className="stat-card glass">
            <div className="stat-icon-wrapper green">
              <Award size={24} />
            </div>
            <div className="stat-info">
              <h3>{stats.avg || 0} <small>/ 10</small></h3>
              <p>{stats.isOfficial ? 'Promedio Final Semestral' : 'Promedio Visual de Tareas'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
