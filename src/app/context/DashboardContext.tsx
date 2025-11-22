import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TaxQualification } from '../dashboard/components/types';
import { BrokerStats } from '../services/firestoreService';

interface DashboardContextType {
    currentData: any[]; // Changed to any[] to be more flexible, or keep specific if preferred
    setCurrentData: (data: any[]) => void;
    globalStats: BrokerStats | null;
    setGlobalStats: (stats: BrokerStats) => void;
    activeModule: string;
    setActiveModule: (module: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [currentData, setCurrentData] = useState<any[]>([]);
    const [globalStats, setGlobalStats] = useState<BrokerStats | null>(null);
    const [activeModule, setActiveModule] = useState<string>('overview');

    return (
        <DashboardContext.Provider value={{
            currentData,
            setCurrentData,
            globalStats,
            setGlobalStats,
            activeModule,
            setActiveModule
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
