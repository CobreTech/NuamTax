"use client";

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import Icons from '@/app/utils/icons';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Componente de Gráficos Administrativos
 * Muestra visualizaciones de datos del sistema
 */
export default function Charts() {
  const [activityData, setActivityData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any>(null);
  const [qualificationsData, setQualificationsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartsData();
  }, []);

  const loadChartsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActivityChart(),
        loadUsersChart(),
        loadQualificationsChart(),
      ]);
    } catch (error) {
      console.error('Error cargando gráficos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityChart = async () => {
    try {
      // Últimos 7 días
      const days = [];
      const counts = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const logsQuery = query(
          collection(db, 'auditLogs'),
          where('timestamp', '>=', Timestamp.fromDate(date)),
          where('timestamp', '<', Timestamp.fromDate(nextDay))
        );
        
        const logsSnap = await getDocs(logsQuery);
        const count = logsSnap.size;
        
        days.push(date.toLocaleDateString('es', { weekday: 'short', day: 'numeric' }));
        counts.push(count);
      }

      setActivityData({
        labels: days,
        datasets: [
          {
            label: 'Eventos del Sistema',
            data: counts,
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      });
    } catch (error) {
      console.log('Logs no disponibles, usando datos de ejemplo');
      // Datos de ejemplo
      setActivityData({
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [
          {
            label: 'Eventos del Sistema',
            data: [12, 19, 15, 25, 22, 18, 24],
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      });
    }
  };

  const loadUsersChart = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(doc => doc.data());
      
      const corredores = users.filter((u: any) => u.rol === 'Corredor').length;
      const administradores = users.filter((u: any) => u.rol === 'Administrador').length;

      setUsersData({
        labels: ['Corredores', 'Administradores'],
        datasets: [
          {
            label: 'Usuarios por Rol',
            data: [corredores, administradores],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(168, 85, 247, 0.8)',
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(168, 85, 247)',
            ],
            borderWidth: 2,
          },
        ],
      });
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const loadQualificationsChart = async () => {
    try {
      // Últimos 6 meses
      const months = [];
      const counts = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        
        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const qualQuery = query(
          collection(db, 'calificaciones'),
          where('fechaCreacion', '>=', Timestamp.fromDate(date)),
          where('fechaCreacion', '<', Timestamp.fromDate(nextMonth))
        );
        
        const qualSnap = await getDocs(qualQuery);
        const count = qualSnap.size;
        
        months.push(date.toLocaleDateString('es', { month: 'short' }));
        counts.push(count);
      }

      setQualificationsData({
        labels: months,
        datasets: [
          {
            label: 'Calificaciones Creadas',
            data: counts,
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 2,
          },
        ],
      });
    } catch (error) {
      console.error('Error cargando calificaciones:', error);
      // Datos de ejemplo
      setQualificationsData({
        labels: ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        datasets: [
          {
            label: 'Calificaciones Creadas',
            data: [65, 59, 80, 81, 96, 105],
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 2,
          },
        ],
      });
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgb(209, 213, 219)',
        },
      },
    },
    scales: {
      y: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      x: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(209, 213, 219)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Cargando gráficos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">Gráficos y Visualizaciones</h2>
          <p className="text-gray-400">Análisis visual de datos del sistema</p>
        </div>
        <button
          onClick={loadChartsData}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all"
        >
          <Icons.Refresh className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Actividad Diaria */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Activity className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold">Actividad Diaria</h3>
          </div>
          <div className="h-64">
            {activityData && <Line data={activityData} options={chartOptions} />}
          </div>
        </div>

        {/* Gráfico de Usuarios por Rol */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Users className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">Usuarios por Rol</h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            {usersData && <Doughnut data={usersData} options={doughnutOptions} />}
          </div>
        </div>

        {/* Gráfico de Calificaciones por Mes */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Icons.BarChart className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold">Calificaciones Creadas (Últimos 6 Meses)</h3>
          </div>
          <div className="h-64">
            {qualificationsData && <Bar data={qualificationsData} options={chartOptions} />}
          </div>
        </div>
      </div>
    </div>
  );
}
