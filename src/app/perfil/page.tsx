'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/Icon'
import { UserCircleIcon, PencilIcon, ArrowDownTrayIcon, TrashIcon, KeyIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt?: string
}

interface Metric {
  id: string
  fecha: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  notes: string | null
}

export default function PerfilPage() {
  const { user, logout } = useAuth()
  useAuthGuard()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Edit profile state
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Metrics form state
  const [showMetricForm, setShowMetricForm] = useState(false)
  const [metricForm, setMetricForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFat: '',
    muscleMass: '',
    notes: ''
  })
  const [savingMetric, setSavingMetric] = useState(false)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', newPwd: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Export state
  const [exporting, setExporting] = useState(false)

  // Confirm delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Feedback messages
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const [profileRes, metricsRes, statsRes] = await Promise.all([
        fetch('/api/auth/profile', { credentials: 'include' }),
        fetch('/api/metrics?limit=90', { credentials: 'include' }),
        fetch('/api/stats?type=overview', { credentials: 'include' })
      ])

      const profileData = await profileRes.json()
      if (profileData.success) {
        setProfile(profileData.data.user)
        setNewName(profileData.data.user.name)
      }

      const metricsData = await metricsRes.json()
      if (metricsData.success) setMetrics(metricsData.data || [])

      const statsData = await statsRes.json()
      if (statsData.success) setStats(statsData.data)
    } catch (e) {
      console.error('Error loading profile data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveName = async () => {
    if (!newName.trim()) return
    setSavingName(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setProfile(prev => prev ? { ...prev, name: newName.trim() } : prev)
        setEditingName(false)
        showFeedback('success', 'Nombre actualizado')
      }
    } catch (e) {
      showFeedback('error', 'Error al actualizar nombre')
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveMetric = async () => {
    setSavingMetric(true)
    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: metricForm.fecha,
          weight: metricForm.weight ? parseFloat(metricForm.weight) : null,
          bodyFat: metricForm.bodyFat ? parseFloat(metricForm.bodyFat) : null,
          muscleMass: metricForm.muscleMass ? parseFloat(metricForm.muscleMass) : null,
          notes: metricForm.notes || null
        })
      })
      const data = await res.json()
      if (data.success) {
        showFeedback('success', 'Métrica guardada')
        setShowMetricForm(false)
        setMetricForm({ fecha: new Date().toISOString().split('T')[0], weight: '', bodyFat: '', muscleMass: '', notes: '' })
        // Refresh metrics
        const metricsRes = await fetch('/api/metrics?limit=90', { credentials: 'include' })
        const metricsData = await metricsRes.json()
        if (metricsData.success) setMetrics(metricsData.data || [])
      }
    } catch (e) {
      showFeedback('error', 'Error al guardar métrica')
    } finally {
      setSavingMetric(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess(false)
    if (passwordForm.newPwd !== passwordForm.confirm) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }
    if (passwordForm.newPwd.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPwd
        })
      })
      const data = await res.json()
      if (data.success) {
        setPasswordSuccess(true)
        setPasswordForm({ current: '', newPwd: '', confirm: '' })
        showFeedback('success', 'Contraseña actualizada')
        setTimeout(() => setShowPasswordForm(false), 1500)
      } else {
        setPasswordError(data.error || 'Error al cambiar contraseña')
      }
    } catch (e) {
      setPasswordError('Error de conexión')
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/entrenamientos?limit=1000', { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.data) {
        const rows = data.data.map((e: any) => ({
          fecha: e.fecha,
          rutina: e.rutina_name || e.workoutTitle || 'Libre',
          duracion: e.duration || 0,
          sets: e.sets_count || 0,
          completado: e.completed ? 'Sí' : 'No',
          notas: e.notes || ''
        }))
        const headers = ['Fecha', 'Rutina', 'Duración (min)', 'Sets', 'Completado', 'Notas']
        const csvContent = [
          headers.join(','),
          ...rows.map((r: any) => Object.values(r).map((v: any) => `"${v}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `gymlog_entrenamientos_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
        showFeedback('success', 'Datos exportados')
      }
    } catch (e) {
      showFeedback('error', 'Error al exportar datos')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/users?email=' + encodeURIComponent(profile?.email || ''), {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) {
        logout()
        router.push('/')
      }
    } catch (e) {
      showFeedback('error', 'Error al eliminar cuenta')
    }
  }

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 3000)
  }

  // Format metrics data for chart
  const chartData = [...metrics]
    .reverse()
    .filter(m => m.weight)
    .map(m => ({
      fecha: m.fecha.slice(5), // MM-DD
      peso: m.weight,
      grasa: m.bodyFat,
      musculo: m.muscleMass
    }))

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Feedback toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-bounce ${
          feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserCircleIcon className="h-8 w-8 text-blue-500" /> Mi Perfil
            </h1>
            <p className="text-gray-600">Gestiona tu información y ajustes</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Volver
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - User info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile card */}
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>

              {editingName ? (
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingName ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNewName(profile?.name || '') }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    {profile?.name}
                    <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-blue-500 transition-colors">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </h2>
                </div>
              )}

              <p className="text-sm text-gray-500">{profile?.email}</p>
              <p className="text-xs text-gray-400 mt-1">Miembro desde {memberSince}</p>
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-1">
                <Icon name="progress" size={16} /> Resumen
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Entrenamientos</span>
                  <span className="font-bold text-blue-600">{stats?.totalWorkouts || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sets completados</span>
                  <span className="font-bold text-purple-600">{stats?.totalSets || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Racha actual</span>
                  <span className="font-bold text-orange-600">{stats?.streak || 0} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Peso máximo</span>
                  <span className="font-bold text-green-600">{stats?.maxWeight || 0} kg</span>
                </div>
              </div>
            </div>

            {/* Account actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Cuenta</h3>

              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
              >
                <KeyIcon className="h-4 w-4" />
                Cambiar contraseña
              </button>

              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {exporting ? 'Exportando...' : 'Exportar datos (CSV)'}
              </button>

              <button
                onClick={() => { logout(); router.push('/') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-600"
              >
                Cerrar sesión
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-700 font-medium"
              >
                <TrashIcon className="h-4 w-4" />
                Eliminar cuenta
              </button>
            </div>
          </div>

          {/* Right column - Metrics & charts */}
          <div className="lg:col-span-2 space-y-6">

            {/* Password change form (conditionally shown) */}
            {showPasswordForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <KeyIcon className="h-5 w-5 text-blue-500" />
                  Cambiar Contraseña
                </h3>
                <div className="space-y-3 max-w-md">
                  <input
                    type="password"
                    placeholder="Contraseña actual"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={passwordForm.newPwd}
                    onChange={(e) => setPasswordForm(p => ({ ...p, newPwd: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                  {passwordSuccess && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> Contraseña actualizada</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangePassword}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => { setShowPasswordForm(false); setPasswordError(''); setPasswordForm({ current: '', newPwd: '', confirm: '' }) }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Body metrics chart */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-blue-500" />
                  Métricas Corporales
                </h3>
                <button
                  onClick={() => setShowMetricForm(!showMetricForm)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Registrar
                </button>
              </div>

              {/* Add metric form */}
              {showMetricForm && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={metricForm.fecha}
                        onChange={(e) => setMetricForm(f => ({ ...f, fecha: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="75.0"
                        value={metricForm.weight}
                        onChange={(e) => setMetricForm(f => ({ ...f, weight: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">% Grasa</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="15.0"
                        value={metricForm.bodyFat}
                        onChange={(e) => setMetricForm(f => ({ ...f, bodyFat: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Masa musc. (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="35.0"
                        value={metricForm.muscleMass}
                        onChange={(e) => setMetricForm(f => ({ ...f, muscleMass: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                    <input
                      type="text"
                      placeholder="Notas opcionales..."
                      value={metricForm.notes}
                      onChange={(e) => setMetricForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveMetric}
                      disabled={savingMetric}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingMetric ? 'Guardando...' : 'Guardar Métrica'}
                    </button>
                    <button
                      onClick={() => setShowMetricForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Chart */}
              {chartData.length > 1 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      {chartData.some(d => d.grasa) && (
                        <Line type="monotone" dataKey="grasa" name="% Grasa" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                      )}
                      {chartData.some(d => d.musculo) && (
                        <Line type="monotone" dataKey="musculo" name="Masa muscular (kg)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="progress" size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Registra al menos 2 mediciones para ver tu gráfica</p>
                </div>
              )}

              {/* Recent metrics table */}
              {metrics.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 font-medium">Fecha</th>
                        <th className="pb-2 font-medium text-center">Peso</th>
                        <th className="pb-2 font-medium text-center">% Grasa</th>
                        <th className="pb-2 font-medium text-center">Masa Musc.</th>
                        <th className="pb-2 font-medium">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {metrics.slice(0, 10).map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="py-2 text-gray-700">{m.fecha}</td>
                          <td className="py-2 text-center text-gray-700">{m.weight ? `${m.weight} kg` : '—'}</td>
                          <td className="py-2 text-center text-gray-700">{m.bodyFat ? `${m.bodyFat}%` : '—'}</td>
                          <td className="py-2 text-center text-gray-700">{m.muscleMass ? `${m.muscleMass} kg` : '—'}</td>
                          <td className="py-2 text-gray-500 text-xs truncate max-w-[120px]">{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-600 mb-3 flex items-center gap-2">
              <TrashIcon className="h-6 w-6" />
              Eliminar Cuenta
            </h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y todos tus datos de entrenamientos, rutinas y métricas serán eliminados permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sí, eliminar mi cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
