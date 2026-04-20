import type { TrainingPrescription } from '../../types/models'
import { buildAllWorkoutPresets } from './buildWorkoutCatalog'
import type { WorkoutPreset } from './types'

export type { WorkoutPreset } from './types'
export {
  buildTrainingDescriptionFromPreset,
  composeTrainingDescriptionForSave,
  modeLabel,
  modeLabelShort,
  weekdaysToShort,
} from './format'

export function presetToTrainingPrescription(
  p: WorkoutPreset,
): TrainingPrescription {
  return {
    mode: p.prescriptionMode,
    sets: p.sets,
    repsOrDuration: p.repsOrDuration,
    loadNote: p.loadNote,
    objective: p.objective,
    suggestedWeekdays: p.suggestedWeekdays,
  }
}

/** Catálogo completo (centenas de prescrições) */
export const WORKOUT_PRESETS: WorkoutPreset[] = buildAllWorkoutPresets()

/** Grupos únicos para filtro na UI */
export const WORKOUT_GROUPS: string[] = [
  ...new Set(WORKOUT_PRESETS.map((p) => p.group)),
].sort((a, b) => a.localeCompare(b, 'pt-BR'))

export function filterPresets(opts: {
  search: string
  group: string | null
}): WorkoutPreset[] {
  const q = opts.search.trim().toLowerCase()
  return WORKOUT_PRESETS.filter((p) => {
    if (opts.group && p.group !== opts.group) return false
    if (!q) return true
    const blob = `${p.name} ${p.group} ${p.objective} ${p.repsOrDuration}`.toLowerCase()
    return blob.includes(q)
  })
}
