import React, { useEffect, useState } from 'react';
import { MessageSquare, Users, Send, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/useAuthStore';
import './CourseCatalog.css';

const Forums = () => {
  const { profile, role } = useAuthStore();
  const [forums, setForums] = useState([]);
  const [activeForum, setActiveForum] = useState(null);
  const [messages, setMessages] = useState([]);
  const [postText, setPostText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForums();
  }, []);

  const fetchForums = async () => {
    const { data: forosData } = await supabase.from('foros').select('*, cursos(nombre)');
    
    if (role === 'Estudiante') {
      const { data: misCursos } = await supabase.from('inscripciones').select('id_curso').eq('id_usuario', profile.id_usuario);
      const enrolledCourseIds = misCursos?.map(c => c.id_curso) || [];
      const filteredForums = forosData?.filter(f => f.id_curso === null || enrolledCourseIds.includes(f.id_curso)) || [];
      setForums(filteredForums);
    } else if (role === 'Docente') {
      const { data: misCursosDoc } = await supabase.from('cursos').select('id_curso').eq('id_docente', profile.id_usuario);
      const docCourseIds = misCursosDoc?.map(c => c.id_curso) || [];
      const filteredForums = forosData?.filter(f => f.id_curso !== null && docCourseIds.includes(f.id_curso)) || [];
      setForums(filteredForums);
    } else {
      setForums(forosData || []);
    }
    setLoading(false);
  };

  const enterForum = async (foro) => {
    setActiveForum(foro);
    fetchMessages(foro.id_foro);
  };

  const fetchMessages = async (fId) => {
    const { data } = await supabase.from('mensajes').select('*, usuarios(nombre)').eq('id_foro', fId).order('fecha', { ascending: false });
    setMessages(data || []);
  };

  const submitPost = async () => {
    if (!postText.trim()) return;
    const { error } = await supabase.from('mensajes').insert([{ id_foro: activeForum.id_foro, id_usuario: profile.id_usuario, contenido: postText }]);
    if (error) { alert("Error al publicar: " + error.message); return; }
    setPostText('');
    fetchMessages(activeForum.id_foro);
  };

  const deleteMessage = async (msgId, studentId) => {
    if(!window.confirm("¿Como Administrador, estás seguro de borrar este comentario ofensivo y sancionar?")) return;
    await supabase.from('mensajes').delete().eq('id_mensaje', msgId);
    await supabase.from('notificaciones').insert([{
      id_usuario: studentId,
      mensaje: `ADVERTENCIA ADMINISTRATIVA: Un comentario tuyo en el foro violaba el reglamento escolar y fue eliminado.`
    }]);
    fetchMessages(activeForum.id_foro);
  };

  if (activeForum) {
    return (
      <div className="catalog-page">
        <div className="catalog-header glass animate-fade-in" style={{flexDirection: 'row', alignItems: 'center'}}>
           <button className="icon-btn" onClick={() => setActiveForum(null)} style={{marginRight: '1rem'}}><ArrowLeft/></button>
           <div>
             <h1 style={{margin: 0}}>{activeForum.titulo}</h1>
             <p style={{margin: 0}}>{activeForum.cursos ? `Foro Asociado al Curso: ${activeForum.cursos.nombre}` : 'Foro Global Inter-Cursos'}</p>
           </div>
        </div>
        
        <div className="glass" style={{padding: '2rem', marginTop: '1rem'}}>
          <div style={{backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem'}}>
            <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Agrega tu opinión a la discusión..." rows={3} style={{width: '100%', padding: '1rem', border: 'none', background: 'transparent', resize: 'vertical', color: 'var(--text-color)'}}/>
          </div>
          <button className="btn btn-primary" onClick={submitPost}><Send size={18} /> Publicar</button>
          
          <hr style={{margin: '2rem 0', borderColor: 'var(--border-color)'}}/>
          
          <div className="messages-list">
            {messages.length === 0 ? <p>Nadie ha comentado en este foro. Rompe el hielo.</p> : messages.map(msg => (
              <div key={msg.id_mensaje} style={{background: 'var(--bg-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between'}}>
                <div>
                  <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem'}}>
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.usuarios?.nombre || 'U'}`} alt="Av" style={{width: 30, height: 30, borderRadius: 15}}/>
                    <strong style={{color: 'var(--primary)'}}>{msg.usuarios?.nombre}</strong>
                    <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: 'auto'}}>{new Date(msg.fecha).toLocaleString()}</span>
                    <button className="btn btn-outline" style={{padding: '0.2rem 0.6rem', fontSize: '0.8rem'}} onClick={() => setPostText(`> @${msg.usuarios?.nombre}: `)}>Responder</button>
                  </div>
                  <div dangerouslySetInnerHTML={{__html: msg.contenido}} />
                </div>
                
                {role === 'Admin' && (
                  <div>
                    <button className="btn btn-outline" style={{borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.5rem'}} onClick={() => deleteMessage(msg.id_mensaje, msg.id_usuario)}>
                      <AlertTriangle size={16} style={{marginRight: '5px'}}/> Eliminar Sancionando
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page">
      <div className="catalog-header glass animate-fade-in">
        <div className="catalog-title">
          <MessageSquare className="title-icon" size={28} />
          <div>
            <h1>Foros Comunitarios</h1>
            <p>Participa en las discusiones globales y de tus cursos inscritos.</p>
          </div>
        </div>
      </div>
      
      <div className="courses-grid" style={{marginTop: '1rem'}}>
        {loading ? <p>Cargando foros...</p> : forums.length > 0 ? forums.map((f, i) => (
          <div key={f.id_foro} className="course-card glass animate-fade-in" style={{padding: '1.5rem', animationDelay: `${i * 0.1}s`}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
              {f.id_curso ? <MessageSquare size={24} color="var(--primary)" /> : <Users size={24} color="var(--primary)" />}
              <h3 style={{margin: 0}}>{f.titulo}</h3>
            </div>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
              {f.cursos ? `Foro propio del curso: ${f.cursos.nombre}` : 'Foro Abierto Estudiantil y Administrativo'}
            </p>
            <button className="btn btn-outline" style={{width: '100%'}} onClick={() => enterForum(f)}>Entrar a la Discusión</button>
          </div>
        )) : <p>No existen foros abiertos.</p>}
      </div>
    </div>
  );
};

export default Forums;
