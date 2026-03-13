'use client'

interface SetInputRowProps {
  setNumber: number
  weight: number | string | undefined
  reps: number | string | undefined
  notes: string
  fallo: boolean
  isCompleted: boolean
  onWeightChange: (value: number | string) => void
  onRepsChange: (value: number | string) => void
  onNotesChange: (value: string) => void
  onFalloChange: (checked: boolean) => void
  onToggleCompleted: () => void
}

/**
 * SetInputRow — Renders a single set's inputs (weight, reps, notes, fallo, completed).
 * Adapts layout: card-style on mobile, horizontal row on desktop.
 */
export default function SetInputRow({
  setNumber,
  weight,
  reps,
  notes,
  fallo,
  isCompleted,
  onWeightChange,
  onRepsChange,
  onNotesChange,
  onFalloChange,
  onToggleCompleted
}: SetInputRowProps) {
  const handleWeightInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      onWeightChange('')
    } else {
      const num = parseFloat(value)
      if (!isNaN(num) && num >= 0) {
        onWeightChange(num)
      }
    }
  }

  const handleRepsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      onRepsChange('')
    } else {
      const num = parseInt(value)
      if (!isNaN(num) && num >= 0) {
        onRepsChange(num)
      }
    }
  }

  return (
    <div>
      {/* Layout móvil: Tarjetas verticales */}
      <div className={`md:hidden rounded-lg p-3 ${
        isCompleted ? 'bg-green-100 border-2 border-green-300' : 'bg-white border-2 border-gray-200'
      }`}>
        {/* Header de la serie con botón de completado */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-700 text-base">Serie #{setNumber}</span>
          <button
            onClick={onToggleCompleted}
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg transition-all ${
              isCompleted
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
            }`}
            aria-label="Marcar serie completada"
          >
            {isCompleted ? '✓' : '○'}
          </button>
        </div>

        {/* Grid de inputs */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={weight ?? ''}
              onChange={handleWeightInput}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Repeticiones</label>
            <input
              type="number"
              min="0"
              value={reps ?? ''}
              onChange={handleRepsInput}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base font-semibold"
            />
          </div>
        </div>

        {/* Fila de notas y fallo */}
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <input
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notas opcionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
            />
          </div>
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={fallo}
                onChange={(e) => onFalloChange(e.target.checked)}
                className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-400"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Fallo</span>
            </label>
          </div>
        </div>
      </div>

      {/* Layout PC: Tabla horizontal compacta */}
      <div className={`hidden md:grid md:grid-cols-6 gap-2 items-center p-2 rounded ${
        isCompleted ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'
      }`}>
        {/* Serie # */}
        <div className="text-center font-bold text-gray-700 text-sm">
          #{setNumber}
        </div>
        
        {/* Peso */}
        <div>
          <input
            type="number"
            step="0.5"
            min="0"
            value={weight ?? ''}
            onChange={handleWeightInput}
            placeholder="Peso"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
          />
        </div>
        
        {/* Reps */}
        <div>
          <input
            type="number"
            min="0"
            value={reps ?? ''}
            onChange={handleRepsInput}
            placeholder="Reps"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
          />
        </div>
        
        {/* Fallo */}
        <div className="text-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={fallo}
              onChange={(e) => onFalloChange(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-400"
            />
            <span className="ml-1 text-xs text-gray-600">Fallo</span>
          </label>
        </div>
        
        {/* Notas */}
        <div>
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Notas"
            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
          />
        </div>
        
        {/* Completado */}
        <div className="text-center">
          <button
            onClick={onToggleCompleted}
            className={`w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-all ${
              isCompleted
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
            }`}
            aria-label="Marcar serie completada"
          >
            {isCompleted ? '✓' : '○'}
          </button>
        </div>
      </div>
    </div>
  )
}
