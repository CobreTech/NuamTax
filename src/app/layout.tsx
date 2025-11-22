// src/app/layout.tsx

/**
 * Root Layout (Diseño Raíz)
 *
 * Este componente es la plantilla principal para toda la aplicación.
 * Define la estructura HTML base, incluyendo las etiquetas <html> y <body>,
 * carga las fuentes globales y aplica estilos base.
 *
 * @param {React.ReactNode} children - Los componentes hijos que serán renderizados dentro de esta plantilla.
 */

import './globals.css' // Importa los estilos globales de la aplicación.
import type { Metadata } from "next"; // Importa el tipo Metadata para definir los metadatos de la página.
import { Inter } from "next/font/google"; // Importa la fuente 'Inter' de Google Fonts.
import { AuthProvider } from './context/AuthContext'; // Provider de autenticación RBAC
import SkipLink from './components/SkipLink'; // Componente para accesibilidad
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration'; // Service Worker para caché offline

// Configura la fuente 'Inter' con el subconjunto 'latin'.
const inter = Inter({ subsets: ["latin"] });

// Define los metadatos de la aplicación, importantes para el SEO y la presentación en navegadores.
export const metadata: Metadata = {
  title: "NUAM - Intranet para Corredores", // Título que aparece en la pestaña del navegador.
  description: "Plataforma de gestión tributaria para el holding regional NUAM.", // Descripción para los motores de búsqueda.
};

// Componente principal del layout que envuelve toda la aplicación.
export default function RootLayout({
  children, // Prop que contiene las páginas y componentes a renderizar.
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Define el idioma de la página como español y activa el tema oscuro por defecto.
    <html lang="es" className="dark">
      {/* Aplica la clase de la fuente 'Inter' y los estilos de fondo y texto base al body. */}
      <body className={`${inter.className} bg-nuam-dark text-nuam-text-primary`}>
        {/* Skip link para accesibilidad */}
        <SkipLink />
        {/* Service Worker para caché offline */}
        <ServiceWorkerRegistration />
        {/* Provider de autenticación RBAC - envuelve toda la aplicación */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}