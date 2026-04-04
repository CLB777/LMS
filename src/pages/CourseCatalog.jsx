import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/useAuthStore';
import { Search, Filter, BookOpen, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CourseCatalog.css';

const CourseCatalog = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inscribedCourses, setInscribedCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalogs();
  }, [profile]);

  const fetchCatalogs = async () => {
    const [coursesRes, catsRes, inscribedRes] = await Promise.all([
      supabase.from('cursos').select('*, categorias(nombre), usuarios(nombre)').eq('estado', 'activo'),
      supabase.from('categorias').select('*'),
      supabase.from('inscripciones').select('id_curso').eq('id_usuario', profile?.id_usuario || '')
    ]);

    if (!coursesRes.error) setCourses(coursesRes.data);
    if (!catsRes.error) setCategories(catsRes.data);
    if (!inscribedRes.error) setInscribedCourses(inscribedRes.data.map(i => i.id_curso));
    
    setLoading(false);
  };

  const handleEnroll = async (courseId) => {
    const { error } = await supabase.from('inscripciones').insert([
      { id_usuario: profile.id_usuario, id_curso: courseId }
    ]);
    if (!error) {
      alert("¡Te inscribiste con éxito al curso!");
      navigate(`/curso/${courseId}`);
    } else {
      alert("Hubo un error: " + error.message);
    }
  };

  const handleUnenroll = async (courseId) => {
    if (!window.confirm("¿Estás 100% seguro de darte de baja de este curso? Tu progreso podría perderse.")) return;
    await supabase.from('inscripciones').delete().eq('id_curso', courseId).eq('id_usuario', profile.id_usuario);
    fetchCatalogs();
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? c.id_categoria === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="catalog-page">
      <div className="catalog-header glass animate-fade-in">
        <div className="catalog-title">
          <BookOpen className="title-icon" size={28} />
          <div>
            <h1>Catálogo de Cursos</h1>
            <p>Explora e inscríbete a los nuevos cursos disponibles en la plataforma.</p>
          </div>
        </div>

        <div className="catalog-filters">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar curso..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-dropdown select-group">
            <Filter size={18} className="input-icon" style={{left: '0.8rem', zIndex: 1}} />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{paddingLeft: '2.5rem', width: 'auto'}}>
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? <p>Cargando catálogo...</p> : (
        <div className="courses-grid">
          {filteredCourses.length > 0 ? filteredCourses.map((curso, idx) => {
            const isInscribed = inscribedCourses.includes(curso.id_curso);

            return (
              <div key={curso.id_curso} className="course-card glass animate-fade-in" style={{animationDelay: `${idx * 0.1}s`}}>
                <div className="course-img-placeholder">
                  {curso.imagen ? <img src={curso.imagen} alt={curso.nombre} /> : <BookOpen size={48} className="placeholder-icon"/>}
                  <span className="category-badge">{curso.categorias?.nombre}</span>
                </div>
                <div className="course-card-content">
                  <h3>{curso.nombre}</h3>
                  <p className="course-docente">Por: {curso.usuarios?.nombre || 'Docente'}</p>
                  <p className="course-desc">{curso.descripcion?.substring(0, 80)}...</p>
                  
                  <div className="course-actions">
                    {isInscribed ? (
                       <div style={{display:'flex', gap:'0.5rem', width: '100%'}}>
                         <button className="btn" style={{flex: 1, background: 'var(--success)', color: 'white'}} onClick={() => navigate(`/curso/${curso.id_curso}`)}>
                           <Check size={16} /> Ir al curso
                         </button>
                         <button className="btn btn-outline" style={{borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.4rem'}} onClick={() => handleUnenroll(curso.id_curso)} title="Darse de Baja">
                           Salir
                         </button>
                       </div>
                    ) : (
                       <button className="btn btn-primary" style={{width: '100%'}} onClick={() => handleEnroll(curso.id_curso)}>
                         Inscribirme
                       </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <p className="no-results">No se encontraron cursos con estos filtros.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseCatalog;
