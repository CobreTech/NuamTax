/**
 * Página Principal (Landing Page)
 * 
 * Página de bienvenida del sistema NUAM que presenta:
 * - Hero section con título animado y llamadas a la acción
 * - Sección de características principales del sistema
 * - Estadísticas del servicio
 * - Navegación responsive con menú móvil
 * - Animaciones y efectos visuales
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { NUAM_LOGO_PATH } from './utils/paths'
import RegisterModal from './components/RegisterModal'
import AdminAuthModal from './components/AdminAuthModal'
import Icons from './utils/icons'

export default function Home() {
  // Estados para controlar la UI y animaciones
  const [mounted, setMounted] = useState(false) // Controla si el componente ya se montó
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Estado del menú móvil
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set()) // Secciones visibles para animaciones
  
  // Estados para registro con autenticación de admin (RBAC)
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  
  // Referencias para el observer de intersección
  const featuresRef = useRef<HTMLElement>(null)
  const statsRef = useRef<HTMLElement>(null)

  // Manejo del flujo de registro con autenticación de admin
  const handleRegisterClick = () => {
    console.log('[REGISTER] Solicitando autenticación de administrador para registro')
    setShowAdminAuthModal(true)
  }

  const handleAdminAuthSuccess = () => {
    console.log('[REGISTER] Administrador autenticado, abriendo modal de registro')
    setShowAdminAuthModal(false)
    setShowRegisterModal(true)
  }

  useEffect(() => {
    setMounted(true)
    
    // Intersection Observer para animaciones al scroll
    // Detecta cuando las secciones entran en el viewport para activar animaciones
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Agrega la sección al conjunto de secciones visibles
            setVisibleSections((prev) => new Set(prev).add(entry.target.id))
          }
        })
      },
      { threshold: 0.1 } // Se activa cuando el 10% de la sección es visible
    )

    // Observar todas las secciones con ID
    const sections = document.querySelectorAll('section[id]')
    sections.forEach((section) => observer.observe(section))

    // Cleanup: dejar de observar al desmontar el componente
    return () => {
      sections.forEach((section) => observer.unobserve(section))
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950 text-white overflow-hidden">
      {/* Elementos de fondo animados - Crean efectos visuales dinámicos */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-amber-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-96 h-96 bg-red-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse-slow"></div>
        
        {/* Partículas flotantes - Generan 20 puntos animados aleatoriamente */}
        <div className="absolute inset-0">
          {mounted &&[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-orange-400 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${15 + Math.random() * 20}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Barra de navegación fija en la parte superior */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center p-1 animate-glow">
              <Image 
                src={NUAM_LOGO_PATH} 
                alt="NUAM" 
                width={40}
                height={40}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              NUAM
            </span>
          </div>
          
          {/* Navegación para escritorio - Solo visible en pantallas medianas y grandes */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="hover:text-orange-400 transition-colors">
              Características
            </Link>
            <Link href="#stats" className="hover:text-orange-400 transition-colors">
              Estadísticas
            </Link>
            <Link href="/login" className="px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-600 rounded-full hover:from-orange-700 hover:to-amber-700 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30">
              Iniciar Sesión
            </Link>
          </div>

          {/* Botón del menú móvil - Hamburguesa animada */}
          <button 
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1 focus:outline-none relative z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>
      </nav>

      {/* Menú de navegación móvil - Se despliega desde arriba */}
      <div 
        className={`md:hidden fixed inset-x-0 top-[73px] z-40 transition-all duration-500 transform ${
          mobileMenuOpen 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="backdrop-blur-2xl bg-black/40 border-b border-white/20">
          <div className="container mx-auto px-6 py-6 space-y-2">
            <Link 
              href="#features" 
              className="block py-3 px-4 text-white/90 hover:text-orange-400 hover:bg-white/10 rounded-lg transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              Características
            </Link>
            <Link 
              href="#stats" 
              className="block py-3 px-4 text-white/90 hover:text-orange-400 hover:bg-white/10 rounded-lg transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              Estadísticas
            </Link>
            <Link 
              href="/login" 
              className="block py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all text-center mt-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>

      {/* Overlay oscuro cuando el menú móvil está abierto */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sección Hero - Ocupa toda la pantalla con contenido principal */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-20 md:pt-16">
        <div className="container mx-auto text-center">
          <div className={`space-y-8 ${mounted ? '' : 'opacity-0'}`}>
            {/* Título principal con tamaños responsivos y animaciones */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold">
              <span className={`block ${mounted ? 'animate-slideInLeft' : ''} bg-gradient-to-r from-orange-400 via-amber-400 to-red-400 bg-clip-text text-transparent animate-gradient bg-300`}>
                Sistema de Gestión
              </span>
              <span className={`block mt-2 ${mounted ? 'animate-slideInRight' : ''} text-white`}>
                Tributaria Regional
              </span>
            </h1>
            
            <p className={`text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto ${mounted ? 'animate-fadeInUp animation-delay-500' : ''}`}>
              Automatiza y gestiona las calificaciones tributarias de manera eficiente. 
              Integración perfecta para las bolsas de Santiago, Lima y Colombia.
            </p>
            
            {/* Botones de acción principales */}
            <div className={`flex flex-col sm:flex-row justify-center gap-4 pt-8 ${mounted ? 'animate-fadeInUp animation-delay-750' : ''}`}>
              <Link 
                href="/login" 
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl hover:from-orange-700 hover:to-amber-700 transition-all transform hover:scale-105 shadow-2xl hover:shadow-orange-500/50 animate-pulse-slow"
              >
                Acceder al Sistema
              </Link>
              <button
                type="button"
                onClick={handleRegisterClick}
                className="px-8 py-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl hover:bg-white/20 transition-all hover:border-white/40 text-center"
              >
                Registrar Usuario
              </button>
            </div>
          </div>
          
          {/* Indicador de scroll animado - Invita a hacer scroll hacia abajo */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* Modal de Autenticación de Administrador (RBAC) */}
      <AdminAuthModal
        open={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Modal de Registro (solo se abre después de auth admin) */}
      {showRegisterModal && (
        <RegisterModal open={showRegisterModal} onClose={() => setShowRegisterModal(false)} />
      )}

      {/* Sección de características - Muestra las funcionalidades principales */}
      <section 
        id="features" 
        ref={featuresRef}
        className={`relative z-10 container mx-auto px-6 py-20 transition-all duration-1000 ${
          visibleSections.has('features') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-10'
        }`}
      >
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
          Potencia tu Gestión Tributaria
        </h2>
        {/* Grid de tarjetas de características */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Array de características del sistema */}
          {[
            {
              title: 'Carga Masiva',
              description: 'Importa archivos CSV/Excel con validación automática de datos tributarios',
              Icon: Icons.BarChart
            },
            {
              title: 'Seguridad Garantizada',
              description: 'Datos privados por corredora con cifrado end-to-end y respaldos automáticos',
              Icon: Icons.Lock
            },
            {
              title: 'Reportes Automáticos',
              description: 'Genera declaraciones juradas y reportes tributarios con un clic',
              Icon: Icons.TrendingUp
            }
          ].map((feature, i) => (
            <div 
              key={i} 
              className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-orange-500/20 ${
                visibleSections.has('features') 
                  ? 'animate-fadeInUp' 
                  : ''
              }`}
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <div className="mb-4 animate-bounce-slow" style={{ animationDelay: `${i * 100}ms` }}>
                <feature.Icon className="w-12 h-12 mx-auto text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section 
        id="stats"
        ref={statsRef}
        className={`relative z-10 container mx-auto px-6 py-20 transition-all duration-1000 ${
          visibleSections.has('stats') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 hover:bg-white/10 transition-all">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: '3', label: 'Países Integrados' },
              { number: '40M', label: 'USD Inversión' },
              { number: '95%', label: 'Disponibilidad' },
              { number: '24/7', label: 'Soporte' }
            ].map((stat, i) => (
              <div 
                key={i}
                className={`${visibleSections.has('stats') ? 'animate-fadeInUp' : ''} transition-all duration-300 hover:scale-110 cursor-pointer group`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent group-hover:animate-pulse-gentle">
                  {stat.number}
                </div>
                <div className="text-gray-400 mt-2 group-hover:text-gray-300 transition-colors">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-xl bg-white/5 border-t border-white/10 mt-20">
        <div className="container mx-auto px-6 py-8 text-center">
          <p className="text-gray-400">
            © CobreTech 2025 - Todos los derechos reservados
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.1) rotate(120deg); }
          66% { transform: translate(-20px, 20px) scale(0.9) rotate(240deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-30px) translateX(10px); }
          66% { transform: translateY(30px) translateX(-10px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        
        @keyframes pulse-gentle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.5); }
          50% { box-shadow: 0 0 30px rgba(251, 146, 60, 0.8); }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-blob {
          animation: blob 20s infinite;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-pulse-gentle {
          animation: pulse-gentle 1.5s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 300% 300%;
          animation: gradient 5s ease infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 1s ease-out;
        }
        
        .animate-slideInRight {
          animation: slideInRight 1s ease-out;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out both;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        
        .animation-delay-750 {
          animation-delay: 0.75s;
        }
        
        .bg-300 {
          background-size: 300% 300%;
        }
      `}</style>
    </div>
  )
}
