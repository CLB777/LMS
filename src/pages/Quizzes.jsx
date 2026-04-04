import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/useAuthStore';
import { Target, CheckCircle } from 'lucide-react';
import './CourseCatalog.css';

const Quizzes = () => {
  const { profile, role } = useAuthStore();
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, [profile]);

  const fetchQuizzes = async () => {
    // Buscar cuestionarios asociados a TODOS los módulos
    // En una app real filtraríamos por inscripciones
    const { data } = await supabase.from('cuestionarios').select('*, modulos(titulo)');
    if (data) setQuizzes(data);
    setLoading(false);
  };

  const startQuiz = async (qId) => {
    const { data: qs } = await supabase.from('preguntas').select('*, opciones(*)').eq('id_cuestionario', qId);
    setQuestions(qs || []);
    setActiveQuiz(qId);
    setAnswers({});
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    let score = 0;
    const total = questions.length;
    
    if (total === 0) {
      alert("Este cuestionario no tiene preguntas.");
      setSubmitting(false);
      setActiveQuiz(null);
      return;
    }

    questions.forEach(q => {
      const selectedOptionId = answers[q.id_pregunta];
      const selectedOption = q.opciones.find(o => o.id_opcion === selectedOptionId);
      if (selectedOption?.es_correcta) {
        score += 1;
      }
    });

    const finalGrade = (score / total) * 100;

    await supabase.from('resultados_cuestionario').insert([{
      id_cuestionario: activeQuiz,
      id_usuario: profile.id_usuario,
      puntaje: finalGrade
    }]);

    alert(`¡Evaluación completada! Obteniste ${finalGrade.toFixed(2)} / 100`);
    setActiveQuiz(null);
    setSubmitting(false);
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header glass animate-fade-in">
        <div className="catalog-title">
          <Target className="title-icon" size={28} />
          <div>
            <h1>Evaluaciones y Cuestionarios</h1>
            <p>Mide tu conocimiento realizando los cuestionarios de tus módulos.</p>
          </div>
        </div>
      </div>
      
      {!activeQuiz ? (
        <div className="courses-grid">
          {loading ? <p>Cargando cuestionarios...</p> : quizzes.length > 0 ? quizzes.map(q => (
             <div key={q.id_cuestionario} className="glass card animate-fade-in">
               <h3>{q.titulo}</h3>
               <p style={{color: 'var(--text-secondary)'}}>Módulo: {q.modulos?.titulo}</p>
               {role === 'Estudiante' && (
                 <button className="btn btn-outline" style={{marginTop: '1rem', width: '100%'}} onClick={() => startQuiz(q.id_cuestionario)}>
                   Comenzar Intento
                 </button>
               )}
             </div>
          )) : <p>No hay cuestionarios disponibles en la plataforma.</p>}
        </div>
      ) : (
        <div className="glass card animate-fade-in" style={{padding: '2rem'}}>
          <h2 style={{marginBottom: '1rem'}}>Evaluación en Progreso</h2>
          {questions.map((q, i) => (
            <div key={q.id_pregunta} style={{marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)'}}>
              <h4 style={{marginBottom: '1rem'}}>{i + 1}. {q.texto}</h4>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                {q.opciones.map(opt => (
                  <label key={opt.id_opcion} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input 
                      type="radio" 
                      name={q.id_pregunta} 
                      value={opt.id_opcion}
                      onChange={() => setAnswers(prev => ({...prev, [q.id_pregunta]: opt.id_opcion}))}
                    />
                    {opt.texto}
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          <div style={{display: 'flex', gap: '1rem'}}>
             <button className="btn btn-primary" onClick={submitQuiz} disabled={submitting}>
               <CheckCircle size={18} /> {submitting ? 'Evaluando...' : 'Enviar Respuestas y Calificar'}
             </button>
             <button className="btn btn-outline" onClick={() => setActiveQuiz(null)} style={{borderColor: 'var(--danger)', color: 'var(--danger)'}}>
               Cancelar
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quizzes;
