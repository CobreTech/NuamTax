'use client'

import { useState, useRef, useEffect } from 'react'
import { IoCalendarOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5'
import { motion, AnimatePresence } from 'framer-motion'

interface CustomDatePickerProps {
    value: string
    onChange: (value: string) => void
    label?: string
    min?: string
    max?: string
    className?: string
}

export default function CustomDatePicker({
    value,
    onChange,
    label,
    min,
    max,
    className = ''
}: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Parse initial date or use current date
    const initialDate = value ? new Date(value + 'T12:00:00') : new Date()
    const [currentMonth, setCurrentMonth] = useState(initialDate)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Calendar Logic
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date) => {
        // 0 = Sunday, 1 = Monday, ...
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
        // Adjust to make Monday = 0, Sunday = 6
        return day === 0 ? 6 : day - 1
    }

    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }

    const handleDateClick = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        // Format as YYYY-MM-DD
        const formatted = date.toISOString().split('T')[0]
        onChange(formatted)
        setIsOpen(false)
    }

    const isSelected = (day: number) => {
        if (!value) return false
        const selectedDate = new Date(value + 'T12:00:00')
        return (
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentMonth.getMonth() &&
            selectedDate.getFullYear() === currentMonth.getFullYear()
        )
    }

    const isToday = (day: number) => {
        const today = new Date()
        return (
            today.getDate() === day &&
            today.getMonth() === currentMonth.getMonth() &&
            today.getFullYear() === currentMonth.getFullYear()
        )
    }

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs lg:text-sm font-medium mb-2 text-gray-200">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-4 py-3 
                    bg-white/10 border border-white/20 rounded-xl 
                    hover:bg-white/15 hover:border-orange-500/50 
                    focus:outline-none focus:ring-2 focus:ring-orange-500/50 
                    transition-all duration-200 text-left
                    ${isOpen ? 'border-orange-500 ring-2 ring-orange-500/20' : ''}
                `}
            >
                <span className={`block truncate ${value ? 'text-white' : 'text-gray-400'}`}>
                    {value || 'Seleccionar fecha'}
                </span>
                <IoCalendarOutline className={`w-5 h-5 transition-colors ${value ? 'text-orange-400' : 'text-gray-400'}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-50 mt-2 p-4 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl shadow-black/50 w-[300px]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={handlePrevMonth}
                                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <IoChevronBack className="w-5 h-5" />
                            </button>
                            <span className="font-semibold text-white">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <IoChevronForward className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Week Days */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map(day => (
                                <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const selected = isSelected(day)
                                const today = isToday(day)

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDateClick(day)}
                                        className={`
                                            w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all
                                            ${selected
                                                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold shadow-lg shadow-orange-500/20'
                                                : today
                                                    ? 'bg-white/10 text-orange-400 font-semibold border border-orange-500/30'
                                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                            }
                                        `}
                                    >
                                        {day}
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
