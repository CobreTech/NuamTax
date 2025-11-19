'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { NUAM_LOGO_PATH } from '../utils/paths'
import { auth, db } from '../firebase/config'
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import RegisterModal from '../components/RegisterModal'
import AdminAuthModal from '../components/AdminAuthModal'
import { getDashboardRoute } from '../utils/rbac'
import { logLogin } from '../services/auditService'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estados para el formulario de login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Estados para el modal de "Olvidé mi contraseña"
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  // Estados para registro con autenticación de admin
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  // Efecto para redirigir si el usuario ya está autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            const userRole = userData.rol
            const dashboardRoute = getDashboardRoute(userRole)
            console.log(`[AUTH] Usuario ya autenticado. Redirigiendo a: ${dashboardRoute}`)
            router.push(dashboardRoute)
          }
        } catch (error) {
          console.error("[AUTH] Error verificando usuario existente:", error)
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Configurar persistencia según el checkbox "Recordarme"
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)

      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Cargar perfil del usuario desde Firestore para obtener el rol
      const userDocRef = doc(db, 'users', userCredential.user.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        const userRole = userData.rol

        // Registrar evento de login en auditoría
        await logLogin(
          userCredential.user.uid,
          userCredential.user.email || userData.email,
          `${userData.Nombre} ${userData.Apellido}`
        )

        // Redirigir según el rol del usuario
        const dashboardRoute = getDashboardRoute(userRole)
        console.log(`✅ Login exitoso | Rol: ${userRole} | Redirigiendo a: ${dashboardRoute}`)
        router.push(dashboardRoute)
      } else {
        setError('Perfil de usuario no encontrado.')
      }
    } catch (error: unknown) {
      console.error("Error de autenticación:", (error as Error).message)
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetSent(false)
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetSent(true)
    } catch (error: unknown) {
      console.error("Error de autenticación:", (error as Error).message)
      setResetError('No se pudo enviar el correo. Verifica que la dirección sea correcta.')
    } finally {
      setResetLoading(false)
    }
  }

  const openModal = () => {
    setShowForgotPasswordModal(true)
    // Resetea los estados del modal cada vez que se abre
    setResetEmail('')
    setResetSent(false)
    setResetError('')
  }

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

  // Auto-abrir modal de auth admin con ?register=1 (para admins que quieran crear usuarios directamente)
  useEffect(() => {
    const shouldOpen = searchParams?.get('register') === '1'
    if (shouldOpen) {
      setShowAdminAuthModal(true)
    }
  }, [searchParams])

  console.log("apiKey exists?", !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-red-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse-slow"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center p-1 animate-glow">
              <Image src={NUAM_LOGO_PATH} alt="NUAM" width={40} height={40} className="w-full h-full object-contain rounded-lg" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">NUAM</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Bienvenido de vuelta</h1>
          <p className="text-gray-400">Ingresa a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Correo Electrónico</label>
            <input type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" placeholder="corredor@nuam.com" autoComplete="email" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" placeholder="••••••••" autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showPassword ? <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm rounded-xl p-3 text-center">{error}</div>}
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 rounded w-4 h-4 accent-orange-500"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="text-sm text-gray-300">Recordarme</span>
            </label>
            <button type="button" onClick={openModal} className="text-sm text-orange-400 hover:text-orange-300 bg-transparent border-none p-0 cursor-pointer">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-semibold">
            {loading ? <span className="flex items-center justify-center"><svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Ingresando...</span> : 'Iniciar Sesión'}
          </button>
          <div className="text-center pt-4 border-t border-white/10">
            <span className="text-gray-400">¿No tienes cuenta? </span>
            <button type="button" onClick={handleRegisterClick} className="text-orange-400 hover:text-orange-300 bg-transparent border-none p-0 cursor-pointer">Registrarse</button>
          </div>
        </form>
        <div className="text-center mt-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">← Volver al inicio</Link>
        </div>
      </div>

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

      {/* Modal para Restablecer Contraseña */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md m-4">
            <form onSubmit={handlePasswordReset} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 animate-fade-in">
              <button type="button" onClick={() => setShowForgotPasswordModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="text-2xl font-bold text-center">Restablecer Contraseña</h2>
              {resetSent ? (
                <div className="text-center text-green-400">
                  <p>¡Enlace enviado!</p>
                  <p className="text-sm text-gray-300 mt-2">Revisa tu correo electrónico para continuar con el proceso.</p>
                </div>
              ) : (
                <>
                  <p className="text-center text-gray-400 text-sm">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
                  <div>
                    <label className="block text-sm font-medium mb-2">Correo Electrónico</label>
                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" placeholder="tu-correo@ejemplo.com" required />
                  </div>
                  {resetError && <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm rounded-xl p-3 text-center">{resetError}</div>}
                  <button type="submit" disabled={resetLoading} className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 font-semibold">
                    {resetLoading ? <span className="flex items-center justify-center"><svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Enviando...</span> : 'Enviar Enlace de Restablecimiento'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1) rotate(0deg); } 33% { transform: translate(30px, -50px) scale(1.1) rotate(120deg); } 66% { transform: translate(-20px, 20px) scale(0.9) rotate(240deg); } 100% { transform: translate(0px, 0px) scale(1) rotate(360deg); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.05); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.5); } 50% { box-shadow: 0 0 30px rgba(251, 146, 60, 0.8); } }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-blob { animation: blob 20s infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}