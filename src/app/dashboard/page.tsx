'use client'

/**
 * Página del Dashboard Principal
 * 
 * Este componente es el corazón de la intranet. Gestiona la navegación principal,
 * el estado de la aplicación y renderiza las diferentes secciones funcionales
 * basadas en la selección del usuario.
 * 
 * Funcionalidades:
 * - Navegación responsive (sidebar para escritorio, menú para móvil).
 * - Gestión de estado para la pestaña activa, búsquedas, archivos y configuraciones.
 * - Renderizado condicional de las secciones: Resumen, Calificaciones, Carga, etc.
 * - Uso de datos simulados (mock data) para demostración.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../firebase/config'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import OverviewSection from './components/OverviewSection'
import QualificationsSection from './components/QualificationsSection'
import UploadSection from './components/UploadSection'
import ReportsSection from './components/ReportsSection'
import Image from 'next/image'
import { NUAM_LOGO_PATH } from '../utils/paths'
import Icons from '../utils/icons'
import SettingsSection from './components/SettingsSection'

// Importación de tipos de datos para una mayor consistencia y seguridad.
import { MenuItem, ActiveTab } from './components/types'

// Importar funciones para obtener datos reales
import { getBrokerStats, type BrokerStats } from '../services/firestoreService'
import { useAuth } from '../context/AuthContext'
import { logLogout } from '../services/auditService'

// Componente principal del Dashboard.
export default function Dashboard() {
  const router = useRouter() // Hook para manejar el enrutamiento.
  const { userProfile } = useAuth() // Obtener perfil del usuario autenticado

  // --- ESTADOS DEL COMPONENTE ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview') // Pestaña activa en la navegación.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Controla la visibilidad del menú en móviles.

  // Estados para la sección de configuración.
  const [dateFormat, setDateFormat] = useState('DD/MM/AAAA') // Formato de fecha preferido.
  const [decimalSeparator, setDecimalSeparator] = useState('coma') // Separador de decimales.
  const [pageSize, setPageSize] = useState(10) // Cantidad de elementos por página en las tablas.

  // Estados para estadísticas reales
  const [brokerStats, setBrokerStats] = useState<BrokerStats>({
    totalQualifications: 0,
    validatedFactors: 0,
    reportsGenerated: 0,
    successRate: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  // Cargar estadísticas reales al montar el componente
  useEffect(() => {
    if (!userProfile?.uid) return;

    const loadStats = async () => {
      try {
        const stats = await getBrokerStats(userProfile.uid)
        setBrokerStats(stats)
      } catch (error) {
        console.error('Error cargando estadísticas:', error)
      } finally {
        setLoadingStats(false)
      }
    }
    loadStats()

    // Listener para recargar estadísticas después de carga masiva (mejora #3)
    const handleReloadStats = () => {
      console.log('[STATS] Recargando estadísticas del corredor...')
      setLoadingStats(true)
      loadStats()
    }

    window.addEventListener('reloadBrokerStats', handleReloadStats)

    return () => {
      window.removeEventListener('reloadBrokerStats', handleReloadStats)
    }
  }, [userProfile?.uid])

  // Define los elementos del menú de navegación.
  const menuItems: MenuItem[] = [
    { id: 'overview', label: 'Resumen General', icon: <Icons.Dashboard className="w-5 h-5" /> },
    { id: 'qualifications', label: 'Calificaciones', icon: <Icons.FileText className="w-5 h-5" /> },
    { id: 'upload', label: 'Carga Masiva', icon: <Icons.Upload className="w-5 h-5" /> },
    { id: 'reports', label: 'Reportes', icon: <Icons.BarChart className="w-5 h-5" /> },
    { id: 'settings', label: 'Configuración', icon: <Icons.Settings className="w-5 h-5" /> }
  ]

  // Nota: OverviewSection ahora carga datos reales desde Firestore

  const handleLogout = async () => {
    try {
      if (userProfile) {
        await logLogout(
          userProfile.uid,
          userProfile.email,
          `${userProfile.Nombre} ${userProfile.Apellido}`
        )
      }
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // --- RENDERIZADO CONDICIONAL ---
  // Función que decide qué componente de sección mostrar según la pestaña activa.
  const renderMainContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewSection
            brokerId={userProfile?.uid || ''}
            setActiveTab={setActiveTab}
          />
        )
      case 'qualifications':
        return (
          <QualificationsSection
            brokerId={userProfile?.uid || ''}
            setActiveTab={setActiveTab}
            pageSize={pageSize}
          />
        )
      case 'upload':
        return (
          <UploadSection
            brokerId={userProfile?.uid || ''}
          />
        )
      case 'reports':
        return <ReportsSection />
      case 'settings':
        return (
          <SettingsSection
            dateFormat={dateFormat}
            setDateFormat={setDateFormat}
            decimalSeparator={decimalSeparator}
            setDecimalSeparator={setDecimalSeparator}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        )
      default:
        return (
          <OverviewSection
            brokerId={userProfile?.uid || ''}
            setActiveTab={setActiveTab}
          />
        )
    }
  }

  return (
    // Contenedor principal con fondo degradado.
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950 text-white">
      {/* Fondo animado con blobs de colores para un efecto visual dinámico. */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-red-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* --- NAVEGACIÓN SUPERIOR (MÓVIL) --- */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="px-6 py-4 flex justify-between items-center">
          {/* Logo y nombre de la aplicación */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center p-1 animate-glow">
              <Image
                src={NUAM_LOGO_PATH}
                alt="NUAM"
                width={32}
                height={32}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              NUAM
            </span>
          </div>

          {/* Botón de menú hamburguesa para abrir/cerrar la navegación móvil. */}
          <button
            className="flex flex-col justify-center items-center w-8 h-8 space-y-1 focus:outline-none relative z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>
      </nav>

      {/* --- MENÚ DE NAVEGACIÓN DESPLEGABLE (MÓVIL) --- */}
      <div
        className={`lg:hidden fixed inset-x-0 top-[73px] z-40 transition-all duration-500 transform ${mobileMenuOpen
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
          }`}
      >
        <div className="backdrop-blur-2xl bg-black/40 border-b border-white/20">
          <div className="px-6 py-6 space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as ActiveTab)
                  setMobileMenuOpen(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center space-x-3 ${activeTab === item.id
                  ? 'bg-gradient-to-r from-orange-600/30 to-amber-600/30 text-orange-300'
                  : 'text-white/90 hover:text-orange-400 hover:bg-white/10'
                  }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 transition-all text-center mt-4"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Overlay oscuro que se muestra detrás del menú móvil para enfocar la atención. */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Contenedor principal que alinea el sidebar y el contenido. */}
      <div className="relative z-10 flex">
        {/* --- BARRA LATERAL (ESCRITORIO) --- */}
        <aside className="hidden lg:flex lg:flex-col w-64 h-screen fixed left-0 top-0 backdrop-blur-xl bg-white/5 border-r border-white/10">
          <div className="flex-1 p-6">
            {/* Logo y nombre en el sidebar */}
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center p-1 animate-glow">
                <Image
                  src={NUAM_LOGO_PATH}
                  alt="NUAM"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                NUAM
              </span>
            </div>

            {/* Navegación principal del sidebar */}
            <nav className="space-y-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 ${activeTab === item.id
                    ? 'bg-gradient-to-r from-orange-600/30 to-amber-600/30 text-orange-300 transform scale-105'
                    : 'hover:bg-white/10 text-white hover:transform hover:scale-102'
                    }`}
                  aria-label={`Navegar a ${item.label}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Botón para cerrar sesión, fijo en la parte inferior del sidebar. */}
          <div className="p-6 border-t border-white/10">
            <button
              onClick={handleLogout} // Navega a la página de inicio al hacer clic.
              className="w-full px-4 py-3 backdrop-blur-xl bg-red-500/20 border border-red-500/50 rounded-xl hover:bg-red-500/30 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Cerrar sesión"
            >
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 lg:ml-64">
          {/* Cabecera del contenido principal */}
          <header className="mb-6 lg:mb-8 pt-4 md:pt-0">
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              Bienvenido, {userProfile?.Nombre ? userProfile.Nombre.split(' ')[0] : 'Corredor'}
            </h1>
            <p className="text-gray-400 text-sm lg:text-base">Sistema de Gestión de Calificaciones Tributarias</p>
          </header>

          {/* Tarjetas de estadísticas rápidas - DATOS REALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {[
              {
                label: 'Calificaciones Activas',
                value: loadingStats ? '...' : brokerStats.totalQualifications.toLocaleString(),
                change: 'Real-time',
                color: 'from-orange-600 to-amber-600'
              },
              {
                label: 'Factores Validados',
                value: loadingStats ? '...' : brokerStats.validatedFactors.toLocaleString(),
                change: 'Real-time',
                color: 'from-amber-600 to-yellow-600'
              },
              {
                label: 'Reportes Generados',
                value: loadingStats ? '...' : brokerStats.reportsGenerated.toString(),
                change: 'Real-time',
                color: 'from-red-600 to-orange-600'
              },
              {
                label: 'Tasa de Éxito',
                value: loadingStats ? '...' : `${brokerStats.successRate}%`,
                change: 'Real-time',
                color: 'from-orange-500 to-red-500'
              }
            ].map((stat, i) => (
              <div key={i} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6 hover:bg-white/10 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-gray-400 text-sm">{stat.label}</span>
                  <span className="text-blue-400 text-xs">{stat.change}</span>
                </div>
                <div className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Contenedor para el contenido dinámico con animación de transición. */}
          {/* La 'key' se usa para que React vuelva a montar el componente y active la animación al cambiar de pestaña. */}
          <div key={activeTab} className="animate-slideIn">
            {renderMainContent()} {/* Llama a la función que renderiza la sección activa. */}
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.1) rotate(120deg); }
          66% { transform: translate(-20px, 20px) scale(0.9) rotate(240deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.5); }
          50% { box-shadow: 0 0 30px rgba(251, 146, 60, 0.8); }
        }
        
        @keyframes slideIn {
          0% { 
            opacity: 0;
            transform: translateX(30px) translateY(20px);
          }
          100% { 
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }
        
        @keyframes fadeIn {
          0% { 
            opacity: 0;
            transform: scale(0.95);
          }
          100% { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 20s infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  )
}
