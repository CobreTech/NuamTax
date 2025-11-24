"use client";

import { useState } from "react";
import { auth, db } from '../firebase/config'
import Icons from '../utils/icons';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFriendlyErrorMessage } from "../utils/errorUtils";
import Toast from "./Toast";

/**
 * Modal de Autenticación de Administrador
 * ...
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback cuando la autenticación es exitosa
};

export default function AdminAuthModal({ open, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    let secondaryApp: any = null;

    try {
      // 1. Inicializar una app secundaria para no afectar la sesión actual
      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const { getAuth, signInWithEmailAndPassword, signOut } = await import("firebase/auth");
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      const secondaryAppName = "secondaryAuthApp";
      const apps = getApps();
      secondaryApp = apps.find(app => app.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);

      // 2. Autenticar en la app secundaria
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, password);
      const userId = userCredential.user.uid;

      // 3. Verificar rol en Firestore
      const secondaryDb = getFirestore(secondaryApp);
      const userDocRef = doc(secondaryDb, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setToast({ message: "Usuario no encontrado en el sistema.", type: "error" });
        await signOut(secondaryAuth);
        setLoading(false);
        return;
      }

      const userData = userDocSnap.data();
      const userRole = userData.rol;

      // 4. Verificar que sea Administrador
      if (userRole !== "Administrador") {
        setToast({ message: "Acceso denegado. Solo los administradores pueden registrar nuevos usuarios.", type: "error" });
        await signOut(secondaryAuth);
        setLoading(false);
        return;
      }

      // 5. Autenticación exitosa
      await signOut(secondaryAuth);

      console.log("✅ Administrador verificado correctamente");
      setToast({ message: "Verificación exitosa", type: "success" });
      setTimeout(() => {
        onSuccess();
        resetForm();
        onClose();
      }, 1000);

    } catch (err: any) {
      const friendlyMessage = getFriendlyErrorMessage(err);
      setToast({ message: friendlyMessage, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setToast(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md m-4">
        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 animate-fade-in"
        >
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icono y título */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 border border-orange-500/50 rounded-2xl mb-4">
              <Icons.Lock className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold">Autenticación de Administrador</h2>
            <p className="text-sm text-gray-400 mt-2">
              Esta acción requiere privilegios de administrador.
            </p>
          </div>

          {/* Campo: Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email de Administrador</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              placeholder="admin@nuam.com"
              required
              autoFocus
            />
          </div>

          {/* Campo: Contraseña */}
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                "Verificar"
              )}
            </button>
          </div>

          {/* Información adicional */}
          <div className="text-center text-xs text-gray-500">
            <p>Esta acción requiere privilegios de administrador</p>
          </div>
        </form>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

