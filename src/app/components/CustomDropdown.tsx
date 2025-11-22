'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IoChevronDown } from 'react-icons/io5'
import Portal from './Portal'

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
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
    const dropdownRef = useRef<HTMLDivElement>(null)
    const listboxRef = useRef<HTMLUListElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Actualizar coordenadas
    const updateCoords = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setCoords({
                top: rect.bottom + window.scrollY + 8, // 8px gap
                left: rect.left + window.scrollX,
                width: rect.width
            })
        }
    }

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                listboxRef.current &&
                !listboxRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
                setFocusedIndex(-1)
            }
        }

        // Actualizar posición al hacer scroll o resize
        const handleScrollOrResize = () => {
            if (isOpen) updateCoords()
        }

        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('scroll', handleScrollOrResize, true)
        window.addEventListener('resize', handleScrollOrResize)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('scroll', handleScrollOrResize, true)
            window.removeEventListener('resize', handleScrollOrResize)
        }
    }, [isOpen])

    // Calcular posición al abrir
    useEffect(() => {
        if (isOpen) {
            updateCoords()
            const index = options.findIndex(opt => opt.value === value)
            setFocusedIndex(index >= 0 ? index : 0)
        }
    }, [isOpen, value, options])

    // Scroll focused item into view
    useEffect(() => {
        if (isOpen && listboxRef.current && focusedIndex >= 0) {
            const list = listboxRef.current
            const element = list.children[focusedIndex] as HTMLElement
            if (element) {
                const listTop = list.scrollTop
                const listBottom = listTop + list.clientHeight
                const elementTop = element.offsetTop
                const elementBottom = elementTop + element.clientHeight

                if (elementTop < listTop) {
                    list.scrollTop = elementTop
                } else if (elementBottom > listBottom) {
                    list.scrollTop = elementBottom - list.clientHeight
                }
            }
        }
    }, [focusedIndex, isOpen])

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault()
                setIsOpen(true)
            }
            return
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0))
                break
            case 'ArrowUp':
                e.preventDefault()
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1))
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (focusedIndex >= 0) {
                    onChange(options[focusedIndex].value)
                    setIsOpen(false)
                    buttonRef.current?.focus()
                }
                break
            case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                buttonRef.current?.focus()
                break
            case 'Tab':
                setIsOpen(false)
                break
        }
    }

    const selectedOption = options.find(option => option.value === value)

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label
                    id={`${label}-label`}
                    className="block text-xs lg:text-sm font-medium mb-2 text-gray-200"
                >
                    {label}
                </label>
            )}

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby={label ? `${label}-label` : undefined}
                className={`
                    w-full flex items-center justify-between px-4 py-3 
                    bg-white/10 border border-white/20 rounded-xl 
                    hover:bg-white/15 hover:border-orange-500/50 
                    focus:outline-none focus:ring-2 focus:ring-orange-500/50 
                    transition-all duration-200 text-left
                    ${isOpen ? 'border-orange-500 ring-2 ring-orange-500/20' : ''}
                `}
            >
                <span className={`block truncate ${selectedOption ? 'text-white' : 'text-gray-300'}`}>
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
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            style={{
                                position: 'absolute',
                                top: coords.top,
                                left: coords.left,
                                width: coords.width,
                                zIndex: 99999
                            }}
                            className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-white/10"
                        >
                            <ul
                                ref={listboxRef}
                                role="listbox"
                                className="p-1"
                                tabIndex={-1}
                            >
                                {options.map((option, index) => (
                                    <li
                                        key={option.value}
                                        role="option"
                                        aria-selected={option.value === value}
                                        onClick={() => {
                                            onChange(option.value)
                                            setIsOpen(false)
                                            buttonRef.current?.focus()
                                        }}
                                        onMouseEnter={() => setFocusedIndex(index)}
                                        className={`
                                            w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer
                                            ${index === focusedIndex ? 'bg-white/10 text-white' : ''}
                                            ${option.value === value
                                                ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/20 text-orange-400 font-medium'
                                                : 'text-gray-300'
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
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>
        </div>
    )
}
