import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/useAuthStore';
import { Award, FileText } from 'lucide-react';
import './CourseCatalog.css'; // Reusing layout structures

const Grades = () => {
  const { profile } = useAuthStore();
  const [grades, setGrades] = useState([]);
  const [taskGrades, setTaskGrades] = useState([]);
  const [finalGrades, setFinalGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, [profile]);

  const fetchGrades = async () => {
    if (!profile) return;
    
    // Calificaciones de Entregas Individuales
    const { data: tg } = await supabase
      .from('calificaciones')
      .select('nota, comentarios, entregas!inner(fecha_entrega, tareas(titulo))')
      .eq('entregas.id_usuario', profile.id_usuario);
      
    // Calificaciones Finales Semestrales
    const { data: fg } = await supabase
      .from('inscripciones')
      .select('calificacion_final, cursos(nombre)')
      .eq('id_usuario', profile.id_usuario)
      .not('calificacion_final', 'is', null);
      
    if (tg) setTaskGrades(tg);
    if (fg) setFinalGrades(fg);
    setLoading(false);
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header glass animate-fade-in">
        <div className="catalog-title">
          <Award className="title-icon" size={28} />
          <div>
            <h1>Mis Calificaciones</h1>
            <p>Monitorea tu progreso académico y desempeño en actividades y cuestionarios.</p>
          </div>
        </div>
      </div>

      <div className="glass card animate-fade-in" style={{padding: '2rem'}}>
        {loading ? (
          <p>Cargando tus registros...</p>
        ) : (
          <div>
            <h2 style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>Calificaciones Semestrales (Generales)</h2>
            {finalGrades.length > 0 ? (
              <div className="courses-grid" style={{marginBottom: '3rem'}}>
                {finalGrades.map((fg, i) => (
                  <div key={i} style={{background: 'var(--bg-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-md)'}}>
                    <h3 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-hover)'}}><Award size={20} style={{verticalAlign: 'middle'}}/> {fg.cursos?.nombre}</h3>
                    <p style={{fontSize: '2rem', fontWeight: 'bold', margin: 0, color: fg.calificacion_final >= 6 ? 'var(--success)' : 'var(--danger)'}}>
                      {parseFloat(fg.calificacion_final).toFixed(1)} / 10
                    </p>
                  </div>
                ))}
              </div>
            ) : <p style={{color: 'var(--text-secondary)', marginBottom: '3rem'}}>Tus profesores aún no han asentado tus promedios semestrales.</p>}

            <h2 style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>Tareas Evaluadas</h2>
            {taskGrades.length > 0 ? (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border-color)'}}>
                    <th style={{padding: '1rem'}}>Actividad</th>
                    <th style={{padding: '1rem'}}>Calificación</th>
                    <th style={{padding: '1rem'}}>Comentarios del Docente</th>
                    <th style={{padding: '1rem'}}>Progreso Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {taskGrades.map((g, i) => (
                    <tr key={i} style={{borderBottom: '1px solid var(--border-color)'}}>
                      <td style={{padding: '1rem'}}><FileText size={16} style={{verticalAlign: 'middle', marginRight: '8px'}} /> {g.entregas?.tareas?.titulo}</td>
                      <td style={{padding: '1rem', fontWeight: 'bold', color: g.nota >= 6 ? 'var(--success)' : 'var(--danger)'}}>{g.nota} / 10</td>
                      <td style={{padding: '1rem', fontSize: '0.9rem'}}>"{g.comentarios}"</td>
                      <td style={{padding: '1rem'}}>
                        <div style={{ width: '100%', backgroundColor: 'var(--bg-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${g.nota * 10}%`, backgroundColor: g.nota >= 6 ? 'var(--success)' : 'var(--danger)', height: '100%' }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{color: 'var(--text-secondary)'}}>No se han calificado tus tareas individuales aún.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Grades;
