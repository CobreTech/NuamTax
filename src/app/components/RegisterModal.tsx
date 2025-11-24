"use client";

"use client";

import { useState } from "react";
import { auth, db } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import CustomDropdown from './CustomDropdown';
import { formatRUT, validateRUT } from "../utils/rutUtils";
import { getFriendlyErrorMessage } from "../utils/errorUtils";
import Toast from "./Toast";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function RegisterModal({ open, onClose }: Props) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("Corredor");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const resetState = () => {
    setNombre("");
    setApellido("");
    setRut("");
    setEmail("");
    setPassword("");
    setRol("Corredor");
    setToast(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      // Use shared validation
      if (!validateRUT(rut)) {
        setLoading(false);
        setToast({ message: "RUT inválido. Use 12.345.678-9 con DV correcto.", type: "error" });
        return;
      }

      const rutClean = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const profile = {
        uid,
        Nombre: nombre,
        Apellido: apellido,
        Rut: rutClean, // Storing clean RUT
        email,
        rol,
        FechaCreacion: serverTimestamp(),
      };
      await setDoc(doc(db, "users", uid), profile);
      setToast({ message: "Cuenta creada correctamente", type: "success" });
      setTimeout(() => {
        onClose();
        resetState();
      }, 1200);
    } catch (err: any) {
      const friendly = getFriendlyErrorMessage(err);
      setToast({ message: friendly, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md m-4">
        <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 animate-fade-in">
          <button type="button" onClick={() => { onClose(); resetState(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-2xl font-bold text-center">Crear cuenta</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" placeholder="Nombre" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Apellido</label>
              <input value={apellido} onChange={(e) => setApellido(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" placeholder="Apellido" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">RUT</label>
            <input
              value={rut}
              onChange={(e) => {
                const formatted = formatRUT(e.target.value);
                setRut(formatted);
              }}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              placeholder="12.345.678-9"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" placeholder="tu-correo@ejemplo.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" placeholder="••••••••" minLength={6} required />
          </div>
          <div>
            <CustomDropdown
              label="Rol"
              value={rol}
              onChange={(val) => setRol(val as string)}
              options={[
                { value: "Corredor", label: "Corredor" },
                { value: "Administrador", label: "Administrador" },
              ]}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 font-semibold">
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Creando cuenta...
              </span>
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
