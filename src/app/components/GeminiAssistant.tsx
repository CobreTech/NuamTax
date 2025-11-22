'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPaperPlane, FaTimes, FaCompressAlt, FaExpandAlt, FaBroom, FaRegComments } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDashboard } from '../context/DashboardContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function GeminiAssistant() {
    const { currentData, globalStats, activeModule } = useDashboard();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hola, soy tu asistente de NuamTax. Puedo responder preguntas sobre el módulo que estás viendo. ¿En qué puedo ayudarte?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isLoading]);

    // Foco automático (con delay para esperar la animación)
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleClearChat = () => {
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: 'Chat reiniciado. ¿En qué puedo ayudarte ahora?',
                timestamp: new Date()
            }
        ]);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            let contextData: any;

            if (activeModule === 'qualifications') {
                const safeData = Array.isArray(currentData) ? currentData.slice(0, 100) : [];
                contextData = {
                    type: 'table',
                    module: 'Calificaciones Tributarias',
                    data: safeData.map(q => ({
                        instrumento: q.tipoInstrumento,
                        mercado: q.mercadoOrigen,
                        periodo: q.periodo,
                        monto: q.monto?.valor,
                        moneda: q.monto?.moneda,
                        estado: q.esNoInscrita ? 'No Inscrita' : 'Oficial',
                        rut: q.rutContribuyente
                    }))
                };
            } else {
                const moduleDescriptions: Record<string, string> = {
                    overview: 'Resumen General - Vista panorámica de estadísticas del corredor',
                    contributors: 'Contribuyentes - Gestión de contribuyentes asociados',
                    upload: 'Carga Masiva - Módulo para cargar archivos de calificaciones en lote',
                    reports: 'Reportes - Generación y descarga de reportes tributarios',
                    settings: 'Configuración - Ajustes de preferencias del usuario'
                };

                contextData = {
                    type: 'overview',
                    module: moduleDescriptions[activeModule] || activeModule,
                    stats: globalStats ? {
                        totalCalificaciones: globalStats.totalQualifications,
                        factoresValidados: globalStats.validatedFactors,
                        reportesGenerados: globalStats.reportsGenerated,
                        tasaExito: `${globalStats.successRate}%`
                    } : null
                };
            }

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    contextData
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Error al comunicarse con el asistente');
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseData.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // Contenedor principal: Ajustado margins para móvil (bottom-4 right-4) y desktop (sm:bottom-6 sm:right-6)
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        // === ANIMACIÓN NUEVA: SLIDE UP ===
                        // Sale de abajo (y: 50) y opacidad 0. El scale es sutil (0.95) para que no se vea "inflándose".
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            // === RESPONSIVE DIMENSIONS ===
                            // Usa min() para asegurar que quepa en pantallas pequeñas
                            // Móvil: 90vw ancho, 70vh alto. Desktop: 380px ancho, 550px alto.
                            width: isExpanded ? 'min(92vw, 600px)' : 'min(90vw, 380px)',
                            height: isExpanded ? 'min(85vh, 650px)' : 'min(75vh, 550px)'
                        }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        // Transición más rápida y seca (easeOut) para quitar lo "tosco"
                        transition={{ duration: 0.2, ease: "easeOut" }}

                        className="pointer-events-auto mb-3 sm:mb-4 flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl bg-gray-900/95 origin-bottom-right"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-orange-600/90 to-amber-600/90 flex justify-between items-center shadow-lg border-b border-white/10 backdrop-blur-md shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center shadow-inner backdrop-blur-sm">
                                    <FaRobot className="text-white text-base sm:text-lg" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-xs sm:text-sm tracking-wide">NuamTax AI</h3>
                                    <p className="text-[10px] text-orange-100 flex items-center gap-1 opacity-90 truncate max-w-[150px]">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.5)]"></span>
                                        {activeModule === 'qualifications' ? 'Analizando Tabla' : 'Modo General'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={handleClearChat}
                                    title="Limpiar chat"
                                    className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <FaBroom size={12} />
                                </button>
                                {/* Botón Expandir (Oculto en móviles muy pequeños si prefieres, pero útil) */}
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    title={isExpanded ? "Contraer" : "Expandir"}
                                    className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:block"
                                >
                                    {isExpanded ? <FaCompressAlt size={12} /> : <FaExpandAlt size={12} />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    title="Cerrar"
                                    className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <FaTimes size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                                    <FaRegComments className="text-4xl mb-2" />
                                    <p className="text-sm">Inicia una conversación</p>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm shadow-md ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-none border border-orange-400/50'
                                            : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/10 backdrop-blur-md'
                                            }`}
                                    >
                                        {msg.role === 'assistant' ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        ) : (
                                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        )}

                                        <span className={`text-[10px] mt-1.5 block text-right opacity-60 ${msg.role === 'user' ? 'text-orange-100' : 'text-gray-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-white/10 bg-white/5 backdrop-blur-md shrink-0">
                            <div className="relative flex items-end gap-2">
                                <div className="relative flex-1">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Escribe tu pregunta..."
                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all shadow-inner"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputValue.trim() || isLoading}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-orange-500/20 transition-all transform active:scale-95"
                                    >
                                        <FaPaperPlane size={12} />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botón Flotante */}
            <motion.button
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-orange-600 to-amber-600 shadow-[0_4px_20px_rgb(234,88,12,0.4)] flex items-center justify-center text-white border border-white/10 backdrop-blur-sm transition-all z-50 hover:shadow-[0_8px_25px_rgb(234,88,12,0.5)]"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <FaTimes size={20} className="sm:text-2xl" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="robot"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <FaRobot size={24} className="sm:text-[28px]" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}