import { useEffect, useMemo, useRef, useState } from 'react'
import { WORKOUT_PRESETS } from '../data/workoutCatalog'
import type { WorkoutPreset } from '../data/workoutCatalog'

const MAX = 16

type Props = {
  value: string
  onChangeName: (name: string) => void
  onSelectPreset: (preset: WorkoutPreset) => void
  disabled?: boolean
}

export function ExerciseSearchSelect({
  value,
  onChangeName,
  onSelectPreset,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return WORKOUT_PRESETS.slice(0, MAX)
    return WORKOUT_PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q) ||
        p.objective.toLowerCase().includes(q),
    ).slice(0, MAX)
  }, [value])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="exercise-combobox" ref={rootRef}>
      <label className="field">
        <span>EXERCÍCIO</span>
        <input
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChangeName(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar no catálogo ou digite o nome do exercício"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </label>
      {open && filtered.length > 0 && (
        <ul className="exercise-combobox-list" role="listbox">
          {filtered.map((p) => (
            <li key={p.id} role="option">
              <button
                type="button"
                className="exercise-combobox-opt"
                onClick={() => {
                  onSelectPreset(p)
                  setOpen(false)
                }}
              >
                <span className="exercise-combobox-name">{p.name}</span>
                <span className="muted small">{p.group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
