import React, { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import useAuthStore from '../store/useAuthStore';
import { useParams } from 'react-router-dom';
import { Send, FolderOpen, Target, UploadCloud, Edit, Trash2 } from 'lucide-react';
import './CourseCatalog.css';

const CourseDetails = () => {
  const { id } = useParams();
  const { profile, role } = useAuthStore();
  const [activeTab, setActiveTab] = useState('modulos');
  const [course, setCourse] = useState(null);
  
  // Data States
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [forumId, setForumId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [forumPost, setForumPost] = useState('');
  
  // Docente grading states
  const [enrollments, setEnrollments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [viewingTask, setViewingTask] = useState(null);
  
  // Custom Modals States
  const [modals, setModals] = useState({
    module: { open: false, title: '', desc: '' },
    task: { open: false, id_modulo: null, title: '', inst: '', deadline: '' },
    editTask: { open: false, id_tarea: null, title: '', inst: '', deadline: '' },
    grade: { open: false, submission: null, grade: '', feedback: '' },
    finalGrade: { open: false, enrollmentId: null, studentId: null, finalGrade: '' }
  });

  // Handlers for Students File Upload
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mySubmissions, setMySubmissions] = useState([]);

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    // Info del curso
    const { data: c } = await supabase.from('cursos').select('*').eq('id_curso', id).single();
    setCourse(c);

    // Módulos y Materiales (nested)
    const { data: mods } = await supabase.from('modulos').select('*, materiales(*)').eq('id_curso', id).order('orden');
    setModules(mods || []);

    // Tareas
    const { data: tsks } = await supabase.from('tareas').select('*, modulos!inner(id_curso)').eq('modulos.id_curso', id);
    setTasks(tsks || []);

    // Inscripciones (Alumnos inscritos) -> solo necesario para Docente/Admin, pero no hace daño
    const { data: enrs } = await supabase.from('inscripciones').select('*, usuarios(nombre, correo)').eq('id_curso', id);
    setEnrollments(enrs || []);

    if (profile?.id_usuario && role === 'Estudiante') {
      const { data: mySubs } = await supabase.from('entregas').select('id_entrega, id_tarea, contenido, calificaciones(nota)').eq('id_usuario', profile.id_usuario);
      setMySubmissions(mySubs || []);
    }

    // Foro asociado al curso
    const { data: foroData } = await supabase.from('foros').select('*').eq('id_curso', id).single();
    if (foroData) {
      setForumId(foroData.id_foro);
      fetchMessages(foroData.id_foro);
    } else {
      // Create forum if not exists for ANY first visitor
      const { data: newForo } = await supabase.from('foros').insert([{ titulo: 'Foro Principal', id_curso: id }]).select().single();
      if(newForo) setForumId(newForo.id_foro);
    }
  };

  const fetchMessages = async (fId) => {
    const { data: msgs } = await supabase.from('mensajes').select('*, usuarios(nombre)').eq('id_foro', fId).order('fecha', { ascending: false });
    setMessages(msgs || []);
  };

  const submitPost = async () => {
    if (!forumPost.trim() || !forumId) return;
    const { error } = await supabase.from('mensajes').insert([{ id_foro: forumId, id_usuario: profile.id_usuario, contenido: forumPost }]);
    if (error) { alert("Error al publicar: " + error.message); return; }
    setForumPost('');
    fetchMessages(forumId);
  };

  const deleteMessage = async (msgId, studentId) => {
    if(!window.confirm("¿Como Administrador, estás seguro de borrar este comentario ofensivo y sancionar?")) return;
    await supabase.from('mensajes').delete().eq('id_mensaje', msgId);
    await supabase.from('notificaciones').insert([{
      id_usuario: studentId,
      mensaje: `ADVERTENCIA ADMINISTRATIVA: Un comentario tuyo en el foro violaba el reglamento escolar y fue eliminado.`
    }]);
    fetchMessages(forumId);
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    await supabase.from('modulos').insert([{ id_curso: id, titulo: modals.module.title, descripcion: modals.module.desc, orden: modules.length + 1 }]);
    setModals({...modals, module: { open: false, title: '', desc: '' }});
    fetchCourseData();
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('tareas').insert([{ 
      id_modulo: modals.task.id_modulo, 
      titulo: modals.task.title, 
      instrucciones: modals.task.inst,
      fecha_limite: modals.task.deadline ? new Date(modals.task.deadline).toISOString() : null
    }]).select();

    if (!error && data) {
      const notifs = enrollments.map(enr => ({
        id_usuario: enr.id_usuario,
        mensaje: `NUEVA TAREA: "${modals.task.title}" ha sido asignada en el curso de ${course.nombre}.`
      }));
      if (notifs.length > 0) await supabase.from('notificaciones').insert(notifs);
    }
    
    setModals({...modals, task: { open: false, id_modulo: null, title: '', inst: '', deadline: '' }});
    fetchCourseData();
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    await supabase.from('tareas').update({
      titulo: modals.editTask.title,
      instrucciones: modals.editTask.inst,
      fecha_limite: modals.editTask.deadline ? new Date(modals.editTask.deadline).toISOString() : null
    }).eq('id_tarea', modals.editTask.id_tarea);
    
    setModals({...modals, editTask: { open: false, id_tarea: null, title: '', inst: '', deadline: '' }});
    fetchCourseData();
  };

  const handleDeleteTask = async (idTarea) => {
    if (!window.confirm("¿Seguro que deseas eliminar permanentemente esta tarea y todas sus entregas correspondientes?")) return;
    await supabase.from('tareas').delete().eq('id_tarea', idTarea);
    fetchCourseData();
  };

  const handleFileUpload = async (taskId) => {
    if (!fileToUpload) return alert("Selecciona un archivo PDF");
    setUploading(true);

    const fileName = `${profile.id_usuario}-${taskId}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage.from('entregas_archivos').upload(fileName, fileToUpload);

    if (uploadError) {
      alert("Error subiendo el archivo: " + uploadError.message);
      setUploading(false); return;
    }

    const { data: publicData } = supabase.storage.from('entregas_archivos').getPublicUrl(fileName);
    
    await supabase.from('entregas').insert([{
      id_tarea: taskId,
      id_usuario: profile.id_usuario,
      contenido: publicData.publicUrl
    }]);

    alert("¡Entrega enviada exitosamente!");
    setFileToUpload(null);
    setUploading(false);
    fetchCourseData(); // reload mySubmissions
  };

  const handleDeleteEntrega = async (idEntrega) => {
    if(!window.confirm("¿Seguro que deseas eliminar tu entrega para subir otra?")) return;
    await supabase.from('entregas').delete().eq('id_entrega', idEntrega);
    setFileToUpload(null);
    fetchCourseData();
  };

  const fetchTaskSubmissions = async (taskId) => {
    setViewingTask(taskId);
    const { data } = await supabase.from('entregas').select('*, usuarios(nombre, correo), calificaciones(*)').eq('id_tarea', taskId);
    setSubmissions(data || []);
  };

  const handleGradeTask = async (e) => {
    e.preventDefault();
    const sub = modals.grade.submission;
    if(!sub) return;

    if (sub.calificaciones && sub.calificaciones.length > 0) {
       await supabase.from('calificaciones').update({
         nota: parseFloat(modals.grade.grade),
         comentarios: modals.grade.feedback
       }).eq('id_calificacion', sub.calificaciones[0].id_calificacion);
    } else {
       await supabase.from('calificaciones').insert([{
         id_entrega: sub.id_entrega,
         nota: parseFloat(modals.grade.grade),
         comentarios: modals.grade.feedback
       }]);
    }
    
    await supabase.from('notificaciones').insert([{
      id_usuario: sub.id_usuario,
      mensaje: `Tu entrega de tarea en ${course.nombre} ha sido calificada: ${modals.grade.grade}/100.`
    }]);
    
    setModals({...modals, grade: { open: false, submission: null, grade: '', feedback: '' }});
    fetchTaskSubmissions(viewingTask);
  };

  const handleSetFinalGrade = async (e) => {
    e.preventDefault();
    await supabase.from('inscripciones').update({ calificacion_final: parseFloat(modals.finalGrade.finalGrade) }).eq('id_inscripcion', modals.finalGrade.enrollmentId);
    
    await supabase.from('notificaciones').insert([{
      id_usuario: modals.finalGrade.studentId,
      mensaje: `Has recibido tu Calificación Final Oficial en ${course.nombre}: ${modals.finalGrade.finalGrade}`
    }]);

    setModals({...modals, finalGrade: { open: false, enrollmentId: null, studentId: null, finalGrade: '' }});
    fetchCourseData();
  };

  const handlePromediarGrupo = async () => {
    if(!window.confirm("¿Seguro que deseas CALCULAR AUTOMÁTICAMENTE el Promedio Final de TODOS los alumnos inscritos? (Esto reemplazará cualquier calificación final previa y asignará 0 a tareas vencidas sin entrega)")) return;
    
    const { data: allSubs } = await supabase.from('entregas').select('*, calificaciones(*)').in('id_tarea', tasks.length > 0 ? tasks.map(t => t.id_tarea) : ['00000000-0000-0000-0000-000000000000']);
    const entregas = allSubs || [];
    const tasksByMod = {};
    modules.forEach(m => tasksByMod[m.id_modulo] = tasks.filter(t => t.id_modulo === m.id_modulo));

    for (let enr of enrollments) {
        let sumMods = 0;
        let modsCount = 0;
        for (let m of modules) {
             const mTasks = tasksByMod[m.id_modulo];
             if (!mTasks || mTasks.length === 0) continue; 
             let sumTasks = 0;
             let evaluatedTasksCount = 0;

             for (let t of mTasks) {
                 const sub = entregas.find(s => s.id_tarea === t.id_tarea && s.id_usuario === enr.id_usuario);
                 const isGraded = sub && sub.calificaciones && sub.calificaciones.length > 0;
                 const isOverdue = t.fecha_limite && new Date(t.fecha_limite) < new Date();

                 if (isGraded) {
                     sumTasks += parseFloat(sub.calificaciones[0].nota);
                     evaluatedTasksCount++;
                 } else if (isOverdue) {
                     sumTasks += 0;
                     evaluatedTasksCount++;
                 }
             }
             if (evaluatedTasksCount > 0) {
                 sumMods += (sumTasks / evaluatedTasksCount);
                 modsCount++;
             }
        }
        const finalScore = modsCount > 0 ? (sumMods / modsCount) : 0;
        const roundedScore = parseFloat(finalScore.toFixed(1));

        await supabase.from('inscripciones').update({ calificacion_final: roundedScore }).eq('id_inscripcion', enr.id_inscripcion);
        await supabase.from('notificaciones').insert([{
            id_usuario: enr.id_usuario,
            mensaje: `El profesor ${profile?.nombre || 'de la asignatura'} ha evaluado todas tus tareas y te ha promediado el semestre con ${roundedScore} en ${course.nombre}.`
        }]);
    }
    alert("¡Promedios calculados con éxito!");
    fetchCourseData();
  };

  const handleUnenroll = async () => {
    if (!window.confirm("¿Estás 100% seguro de darte de baja de este curso? Tu progreso y calificaciones se perderán.")) return;
    await supabase.from('inscripciones').delete().eq('id_curso', id).eq('id_usuario', profile.id_usuario);
    window.location.href = '/catalogo';
  };
  
  const handleReplyForum = (userName) => {
    setForumPost(`> @${userName}: `);
  };

  if(!course) return <p style={{padding: '2rem'}}>Cargando curso...</p>;

  return (
    <div className="catalog-page">
      <div className="catalog-header glass animate-fade-in" style={{background: 'var(--primary-light)'}}>
        <div className="catalog-title">
          <FolderOpen className="title-icon" size={28} />
          <div>
            <h1 style={{color: 'var(--primary-hover)'}}>{course.nombre}</h1>
            <p style={{color: 'var(--primary)'}}>{course.descripcion}</p>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap'}}>
          <button className={`btn ${activeTab === 'modulos' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('modulos')}>Unidades y Evaluación</button>
          <button className={`btn ${activeTab === 'foro' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('foro')}>Foro de Discusión</button>
          {(role === 'Docente' || role === 'Admin') && <button className={`btn ${activeTab === 'alumnos' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('alumnos')}>Alumnos Inscritos</button>}
          {role === 'Estudiante' && (
             <button className="btn btn-outline" style={{borderColor: 'var(--danger)', color: 'var(--danger)', marginLeft: 'auto'}} onClick={handleUnenroll}>Abandonar Curso</button>
          )}
        </div>
      </div>

      <div className="main-course-content glass animate-fade-in" style={{padding: '2rem', minHeight: '500px'}}>
        
        {/* TAB MODULOS */}
        {activeTab === 'modulos' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2>Plan de Estudios</h2>
              {(role === 'Docente' || role === 'Admin') && <button className="btn btn-outline" onClick={() => setModals({...modals, module:{open:true, title:'', desc:''}})}><Edit size={16}/> Nuevo Módulo</button>}
            </div>

            {modules.length === 0 ? <p>No hay módulos disponibles en este curso.</p> : modules.map(mod => (
              <div key={mod.id_modulo} style={{border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1rem', background: 'var(--bg-surface)'}}>
                <h3>{mod.orden}. {mod.titulo}</h3>
                <p style={{color: 'var(--text-secondary)'}}>{mod.descripcion}</p>
                <div style={{marginTop: '1rem'}}>
                  
                  {/* Tareas asociadas a este módulo */}
                  {tasks.filter(t => t.id_modulo === mod.id_modulo).map(task => {
                    const mySub = mySubmissions.find(s => s.id_tarea === task.id_tarea);
                    const isGraded = mySub && mySub.calificaciones && mySub.calificaciones.length > 0;
                    const isLate = task.fecha_limite && new Date() > new Date(task.fecha_limite);

                    return (
                      <div key={task.id_tarea} style={{borderLeft: '4px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: '1.5rem', margin: '1rem 0', background: 'var(--bg-color)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                          <h4>{task.titulo}</h4>
                          {(role === 'Docente' || role === 'Admin') && (
                            <div style={{display: 'flex', gap: '0.5rem'}}>
                              <button className="icon-btn" title="Editar Tarea" onClick={() => setModals({...modals, editTask:{open:true, id_tarea: task.id_tarea, title: task.titulo, inst: task.instrucciones, deadline: task.fecha_limite ? task.fecha_limite.substring(0,16) : ''}})}><Edit size={16} /></button>
                              <button className="icon-btn" title="Eliminar Tarea" onClick={() => handleDeleteTask(task.id_tarea)} style={{color: 'var(--danger)'}}><Trash2 size={16} /></button>
                            </div>
                          )}
                        </div>
                        <div dangerouslySetInnerHTML={{__html: task.instrucciones}} style={{marginTop: '0.5rem', marginBottom: '0.5rem'}} />
                        <p style={{color: isLate ? 'var(--danger)' : 'var(--warning)', fontSize: '0.85rem'}}>
                          <strong>Fecha Límite:</strong> {task.fecha_limite ? new Date(task.fecha_limite).toLocaleString() : 'Sin Fecha Límite'} {isLate && '(VENCIDA)'}
                        </p>
                        
                        {role === 'Estudiante' && (
                          <div style={{marginTop: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)'}}>
                            {mySub ? (
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                  <span style={{color: 'var(--success)', fontWeight:'bold'}}>✅ Tarea Enviada</span>
                                  {isGraded && (
                                    <span style={{marginLeft: '1rem', color: 'var(--primary)'}}>Calificación: {mySub.calificaciones[0].nota}/10</span>
                                  )}
                                </div>
                                {!isGraded && !isLate && (
                                  <button className="btn btn-outline" style={{borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.3rem 0.6rem'}} onClick={() => handleDeleteEntrega(mySub.id_entrega)}>Eliminar y Reenviar</button>
                                )}
                              </div>
                            ) : (
                              isLate ? (
                                <p style={{color: 'var(--danger)', fontWeight: 'bold', margin:0}}>La fecha de entrega ha vencido. Ya no es posible subir trabajos.</p>
                              ) : (
                                <>
                                  <h4>Sube tu entrega (PDF)</h4>
                                  <input type="file" accept="application/pdf" onChange={e => setFileToUpload(e.target.files[0])} style={{marginTop: '0.5rem', marginBottom: '1rem'}} />
                                  <button className="btn btn-primary" onClick={() => handleFileUpload(task.id_tarea)} disabled={uploading}>
                                    <UploadCloud size={18} /> {uploading ? 'Subiendo archivo...' : 'Enviar Tarea'}
                                  </button>
                                </>
                              )
                            )}
                          </div>
                        )}

                        {(role === 'Docente' || role === 'Admin') && (
                          <button className="btn btn-outline" style={{marginTop: '1rem'}} onClick={() => fetchTaskSubmissions(task.id_tarea)}>Ver y Calificar Entregas</button>
                        )}
                      </div>
                    );
                  })}

                  {(role === 'Docente' || role === 'Admin') && (
                    <button className="btn btn-primary" style={{marginTop: '1rem'}} onClick={() => setModals({...modals, task:{open:true, id_modulo: mod.id_modulo, title:'', inst:'', deadline:''}})}>
                      <Target size={16}/> Asignar Tarea a Módulo
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Panel de Entregas Seleccionadas para Docente */}
            {(role === 'Docente' || role === 'Admin') && viewingTask && (
              <div style={{marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                  <h3>Panel de Calificaciones y Entregas</h3>
                  <button className="btn btn-outline" style={{padding: '0.5rem'}} onClick={() => setViewingTask(null)}>Cerrar Panel</button>
                </div>
                {submissions.length === 0 ? <p>Nadie ha entregado esta tarea aún.</p> : submissions.map(sub => (
                  <div key={sub.id_entrega} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-color)', marginBottom: '0.5rem'}}>
                    <div>
                      <strong>{sub.usuarios?.nombre}</strong> <br/>
                      <small>{new Date(sub.fecha_entrega).toLocaleString()}</small> <br/>
                      <a href={sub.contenido} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', textDecoration: 'underline'}}>Ver Archivo PDF</a>
                    </div>
                    {sub.calificaciones && sub.calificaciones.length > 0 ? (
                      <div style={{textAlign: 'right'}}>
                        <span style={{color: 'var(--success)', fontWeight:'bold'}}>Calificado: {sub.calificaciones[0].nota}/10</span><br/>
                        <button className="btn btn-outline" style={{padding: '0.2rem 0.5rem', fontSize:'0.75rem', marginTop: '0.5rem'}} onClick={() => setModals({...modals, grade: {open: true, submission: sub, grade: sub.calificaciones[0].nota, feedback: sub.calificaciones[0].comentarios}})}>Editar Nota</button>
                      </div>
                    ) : (
                      <button className="btn btn-primary" onClick={() => setModals({...modals, grade: {open: true, submission: sub, grade: '', feedback: ''}})}>Calificar</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB FORO */}
        {activeTab === 'foro' && (
          <div>
            <h2 style={{marginBottom: '1.5rem'}}>Foro Académico</h2>
            <div style={{backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', marginBottom: '1rem'}}>
              <textarea 
                value={forumPost} 
                onChange={(e) => setForumPost(e.target.value)} 
                placeholder="Escribe tu duda o aporte para la clase..."
                rows={4}
                style={{width: '100%', padding: '1rem', border: 'none', background: 'transparent', resize: 'vertical', color: 'var(--text-color)'}}
              />
            </div>
            
            <button className="btn btn-primary" onClick={submitPost}>
              <Send size={18} /> Publicar Mensaje
            </button>
            
            <hr style={{margin: '2rem 0', borderColor: 'var(--border-color)'}}/>
            
            <div className="messages-list">
              {messages.length === 0 ? <p>Todavía no hay discusiones en este foro. ¡Sé el primero!</p> : messages.map(msg => (
                <div key={msg.id_mensaje} style={{background: 'var(--bg-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem'}}>
                  <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem'}}>
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.usuarios?.nombre || 'U'}`} alt="Av" style={{width: 30, height: 30, borderRadius: 15}}/>
                    <strong style={{color: 'var(--primary)'}}>{msg.usuarios?.nombre}</strong>
                    <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: 'auto'}}>{new Date(msg.fecha).toLocaleString()}</span>
                    <button className="btn btn-outline" style={{padding: '0.2rem 0.6rem', fontSize: '0.8rem'}} onClick={() => handleReplyForum(msg.usuarios?.nombre)}>Responder</button>
                    {role === 'Admin' && <button className="btn btn-outline" style={{borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.2rem 0.6rem', fontSize: '0.8rem'}} onClick={() => deleteMessage(msg.id_mensaje, msg.id_usuario)}>Eliminar Sancionando</button>}
                  </div>
                  <div dangerouslySetInnerHTML={{__html: msg.contenido}} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB ALUMNOS INSCRITOS */}
        {activeTab === 'alumnos' && (role === 'Docente' || role === 'Admin') && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2>Lista Escolar de Inscritos</h2>
              {role === 'Docente' && (
                <button className="btn btn-primary" onClick={handlePromediarGrupo}>
                   <Target size={18} style={{marginRight: '0.5rem'}}/> Promediar Semestre
                </button>
              )}
            </div>
            {enrollments.length === 0 ? <p>Todavía no hay estudiantes inscritos en este curso.</p> : enrollments.map(enr => (
              <div key={enr.id_inscripcion} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${enr.usuarios?.nombre || 'U'}`} alt="Av" style={{width: 40, height: 40, borderRadius: 20}}/>
                  <div>
                    <strong>{enr.usuarios?.nombre}</strong>
                    <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{enr.usuarios?.correo}</p>
                    <small>Inscrito el: {new Date(enr.fecha_inscripcion).toLocaleDateString()}</small>
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  {enr.calificacion_final !== null ? (
                    <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                      <div style={{background: 'var(--primary-light)', color: 'var(--primary-hover)', padding: '0.5rem 1rem', borderRadius:'20px', fontWeight: 'bold'}}>
                        Calificación Final: {enr.calificacion_final}
                      </div>
                      <button className="btn btn-outline" style={{padding: '0.4rem', borderColor: 'var(--warning)', color: 'var(--warning)'}} onClick={() => setModals({...modals, finalGrade: {open: true, enrollmentId: enr.id_inscripcion, studentId: enr.id_usuario, finalGrade: enr.calificacion_final}})}>
                        Modificar Calificación
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-outline" style={{borderColor: 'var(--success)', color: 'var(--success)'}} onClick={() => setModals({...modals, finalGrade: {open: true, enrollmentId: enr.id_inscripcion, studentId: enr.id_usuario, finalGrade: ''}})}>
                      Asentar Calificación Semestral
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* HTML Modals Centralization */}
      {modals.module.open && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
          <div className="glass" style={{background: 'var(--bg-surface)', padding: '2rem', width:'100%', maxWidth:'400px'}}>
             <h3 style={{marginTop:0}}>Crear Módulo/Parcial</h3>
             <form onSubmit={handleCreateModule} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                <input required placeholder="Depto 1 / Parcial 1..." value={modals.module.title} onChange={e => setModals({...modals, module:{...modals.module, title: e.target.value}})} />
                <textarea placeholder="Descripción del bloque" rows="3" value={modals.module.desc} onChange={e => setModals({...modals, module:{...modals.module, desc: e.target.value}})} />
                <div style={{display:'flex', gap:'1rem'}}>
                  <button type="submit" className="btn btn-primary" style={{flex:1}}>Guardar</button>
                  <button type="button" className="btn btn-outline" style={{flex:1}} onClick={()=>setModals({...modals, module:{open:false, title:'', desc:''}})}>Cancelar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {modals.task.open && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
          <div className="glass" style={{background: 'var(--bg-surface)', padding: '2rem', width:'100%', maxWidth:'500px'}}>
             <h3 style={{marginTop:0}}>Asignar Nueva Tarea</h3>
             <form onSubmit={handleCreateTask} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                <input required placeholder="Título de la tarea" value={modals.task.title} onChange={e => setModals({...modals, task:{...modals.task, title: e.target.value}})} />
                <textarea required placeholder="Instrucciones para el alumno" rows="4" value={modals.task.inst} onChange={e => setModals({...modals, task:{...modals.task, inst: e.target.value}})} />
                <div style={{display:'flex', flexDirection:'column'}}>
                  <label style={{fontSize:'0.85rem', color:'var(--text-secondary)'}}>Fecha y Hora de Entrega (Opcional)</label>
                  <input type="datetime-local" value={modals.task.deadline} onChange={e => setModals({...modals, task:{...modals.task, deadline: e.target.value}})} />
                </div>
                <div style={{display:'flex', gap:'1rem'}}>
                  <button type="submit" className="btn btn-primary" style={{flex:1}}>Crear y Notificar Alumnos</button>
                  <button type="button" className="btn btn-outline" style={{flex:1}} onClick={()=>setModals({...modals, task:{open:false, id_modulo:null, title:'', inst:'', deadline:''}})}>Cancelar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {modals.editTask.open && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
          <div className="glass" style={{background: 'var(--bg-surface)', padding: '2rem', width:'100%', maxWidth:'500px'}}>
             <h3 style={{marginTop:0}}>Modificar Tarea</h3>
             <form onSubmit={handleEditTask} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                <input required placeholder="Título de la tarea" value={modals.editTask.title} onChange={e => setModals({...modals, editTask:{...modals.editTask, title: e.target.value}})} />
                <textarea required placeholder="Instrucciones para el alumno" rows="4" value={modals.editTask.inst} onChange={e => setModals({...modals, editTask:{...modals.editTask, inst: e.target.value}})} />
                <div style={{display:'flex', flexDirection:'column'}}>
                  <label style={{fontSize:'0.85rem', color:'var(--text-secondary)'}}>Fecha y Hora de Entrega (Opcional)</label>
                  <input type="datetime-local" value={modals.editTask.deadline} onChange={e => setModals({...modals, editTask:{...modals.editTask, deadline: e.target.value}})} />
                </div>
                <div style={{display:'flex', gap:'1rem'}}>
                  <button type="submit" className="btn btn-primary" style={{flex:1}}>Guardar Cambios</button>
                  <button type="button" className="btn btn-outline" style={{flex:1}} onClick={()=>setModals({...modals, editTask:{open:false, id_tarea:null, title:'', inst:'', deadline:''}})}>Cancelar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {modals.grade.open && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
          <div className="glass" style={{background: 'var(--bg-surface)', padding: '2rem', width:'100%', maxWidth:'400px'}}>
             <h3 style={{marginTop:0}}>Calificar Tarea de {modals.grade.submission?.usuarios?.nombre}</h3>
             <form onSubmit={handleGradeTask} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                <input required type="number" step="0.1" min="0" max="10" placeholder="Puntuación (0-10)" value={modals.grade.grade} onChange={e => setModals({...modals, grade:{...modals.grade, grade: e.target.value}})} />
                <textarea placeholder="Comentarios y Feedback" rows="3" value={modals.grade.feedback} onChange={e => setModals({...modals, grade:{...modals.grade, feedback: e.target.value}})} />
                <div style={{display:'flex', gap:'1rem'}}>
                  <button type="submit" className="btn btn-primary" style={{flex:1}}>Guardar y Notificar</button>
                  <button type="button" className="btn btn-outline" style={{flex:1}} onClick={()=>setModals({...modals, grade:{open:false, submission:null, grade:'', feedback:''}})}>Cancelar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {modals.finalGrade.open && (
         <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
          <div className="glass" style={{background: 'var(--bg-surface)', padding: '2rem', width:'100%', maxWidth:'400px'}}>
             <h3 style={{marginTop:0}}>Boleta Semestral</h3>
             <form onSubmit={handleSetFinalGrade} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                <input required type="number" step="0.1" min="0" max="10" placeholder="Calificación Promedio Final (0-10)" value={modals.finalGrade.finalGrade} onChange={e => setModals({...modals, finalGrade:{...modals.finalGrade, finalGrade: e.target.value}})} />
                <div style={{display:'flex', gap:'1rem'}}>
                  <button type="submit" className="btn btn-primary" style={{flex:1}}>Asentar Calificación</button>
                  <button type="button" className="btn btn-outline" style={{flex:1}} onClick={()=>setModals({...modals, finalGrade:{open:false, enrollmentId:null, studentId:null, finalGrade:''}})}>Cancelar</button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CourseDetails;
