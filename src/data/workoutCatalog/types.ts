import type { AnalysisCategory, PrescriptionMode } from '../../types/models'

export type { PrescriptionMode }

export type WorkoutPreset = {
  id: string
  name: string
  group: string
  suggestedWeekdays: number[]
  prescriptionMode: PrescriptionMode
  sets: number | string
  repsOrDuration: string
  loadNote: string | null
  objective: string
  linkedCategories: AnalysisCategory[]
  coachCue?: string
}
