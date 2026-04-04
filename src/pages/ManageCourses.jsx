import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/useAuthStore';
import { BookOpen, Plus, Edit, Trash2, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CourseCatalog.css';

const ManageCourses = () => {
  const { profile, role } = useAuthStore();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [newCourse, setNewCourse] = useState({ nombre: '', descripcion: '', id_categoria: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyCourses();
    fetchCategories();
  }, [profile]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categorias').select('*');
    if (data) setCategories(data);
  };

  const fetchMyCourses = async () => {
    let query = supabase.from('cursos').select('*, categorias(nombre), usuarios(nombre), inscripciones(id_inscripcion)');
    if (role === 'Docente') query = query.eq('id_docente', profile.id_usuario);
    
    const { data } = await query;
    if (data) setCourses(data);
    setLoading(false);
  };

  const handleCreateOrUpdateCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (editingCourseId) {
      const { error } = await supabase.from('cursos').update({ 
        nombre: newCourse.nombre, 
        descripcion: newCourse.descripcion, 
        id_categoria: newCourse.id_categoria 
      }).eq('id_curso', editingCourseId);
      
      if (!error) {
        setShowModal(false); setEditingCourseId(null);
        setNewCourse({ nombre: '', descripcion: '', id_categoria: '' });
        fetchMyCourses();
      } else { alert("Error: " + error.message); }
    } else {
      const { error } = await supabase.from('cursos').insert([{ ...newCourse, id_docente: profile.id_usuario }]);
      if (!error) {
        setShowModal(false);
        setNewCourse({ nombre: '', descripcion: '', id_categoria: '' });
        fetchMyCourses();
      } else { alert("Error: " + error.message); }
    }
    setSubmitting(false);
  };

  const handleEditClick = (c) => {
    setNewCourse({ nombre: c.nombre, descripcion: c.descripcion, id_categoria: c.id_categoria });
    setEditingCourseId(c.id_curso);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Seguro que deseas eliminar este curso?')) {
      await supabase.from('cursos').delete().eq('id_curso', id);
      fetchMyCourses();
    }
  };

  if (loading) return <div className="catalog-page" style={{padding: '2rem'}}><p>Cargando cursos...</p></div>;

  return (
    <div className="catalog-page" style={{position: 'relative'}}>
      <div className="catalog-header glass animate-fade-in" style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <div className="catalog-title">
          <BookOpen className="title-icon" size={28} />
          <div>
            <h1>Gestión de Cursos</h1>
            <p>Administra, edita y publica contenido para tus estudiantes.</p>
          </div>
        </div>
        
        {(role === 'Docente' || role === 'Admin') && (
          <button className="btn btn-primary" onClick={() => { setEditingCourseId(null); setNewCourse({ nombre: '', descripcion: '', id_categoria: '' }); setShowModal(true); }}>
            <Plus size={18} />
            <span>Crear Curso</span>
          </button>
        )}
      </div>

      <div className="courses-grid">
        {courses.length > 0 ? courses.map((curso, idx) => (
          <div key={curso.id_curso} className="course-card glass animate-fade-in" style={{animationDelay: `${idx * 0.1}s`}}>
            <div className="course-img-placeholder">
              <BookOpen size={48} className="placeholder-icon"/>
              <span className="category-badge">{curso.categorias?.nombre}</span>
            </div>
            <div className="course-card-content">
              <h3>{curso.nombre}</h3>
              <p className="course-desc">{curso.descripcion?.substring(0, 80)}...</p>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', display:'flex', justifyContent:'space-between'}}>
                <span>👤 Por: {curso.usuarios?.nombre || 'Desconocido'}</span>
                <span style={{fontWeight:'bold', color:'var(--success)'}}>👨‍🎓 Inscritos: {curso.inscripciones?.length || 0}</span>
              </div>
              <div style={{display: 'flex', gap: '0.5rem', marginTop: 'auto'}}>
                <button className="btn btn-primary" style={{flex: 1}} onClick={() => navigate(`/curso/${curso.id_curso}`)}>
                  <Settings size={16} /> Administrar
                </button>
                <button className="btn btn-outline" title="Editar" onClick={() => handleEditClick(curso)}>
                  <Edit size={16} />
                </button>
                <button className="btn btn-outline" title="Eliminar" style={{borderColor: 'var(--danger)', color: 'var(--danger)'}} onClick={() => handleDelete(curso.id_curso)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="no-results glass" style={{marginTop: '2rem'}}>
            No hay cursos registrados.
          </div>
        )}
      </div>

      {/* Modal Crear Curso */}
      {showModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
          <div className="glass" style={{background: 'var(--bg-surface)', padding: '2rem', width: '100%', maxWidth: '500px'}}>
             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
               <h2>{editingCourseId ? 'Editar Curso' : 'Nuevo Curso'}</h2>
               <button onClick={() => { setShowModal(false); setEditingCourseId(null); }} style={{background: 'none'}}><X /></button>
             </div>
             
             <form onSubmit={handleCreateOrUpdateCourse} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <input required placeholder="Nombre del curso" value={newCourse.nombre} onChange={e => setNewCourse({...newCourse, nombre: e.target.value})} />
                <textarea required placeholder="Descripción del curso (objetivos, etc)" rows="4" value={newCourse.descripcion} onChange={e => setNewCourse({...newCourse, descripcion: e.target.value})} />
                <select required value={newCourse.id_categoria} onChange={e => setNewCourse({...newCourse, id_categoria: e.target.value})}>
                  <option value="">Selecciona Categoría</option>
                  {categories.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                </select>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Creando...' : 'Guardar Curso'}</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourses;
