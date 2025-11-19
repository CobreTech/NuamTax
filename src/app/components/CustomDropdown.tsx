'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IoChevronDown } from 'react-icons/io5'

interface Option {
    value: string | number
    label: string
}

interface CustomDropdownProps {
    options: Option[]
    value: string | number
    onChange: (value: string | number) => void
    label?: string
    placeholder?: string
    className?: string
}

export default function CustomDropdown({
    options,
    value,
    onChange,
    label,
    placeholder = 'Seleccionar...',
    className = ''
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const selectedOption = options.find(option => option.value === value)

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
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
                <span className={`block truncate ${selectedOption ? 'text-white' : 'text-gray-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <IoChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 overflow-hidden bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl shadow-black/50 max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        <div className="p-1">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                    }}
                                    className={`
                    w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors
                    ${option.value === value
                                            ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/20 text-orange-400 font-medium'
                                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                        }
                  `}
                                >
                                    {option.label}
                                    {option.value === value && (
                                        <motion.div
                                            layoutId="activeCheck"
                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
