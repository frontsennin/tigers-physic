import type { TrainingPrescription } from '../../types/models'
import type { WorkoutPreset } from './types'

type RxMode = TrainingPrescription['mode']

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function weekdaysToShort(days: number[]): string {
  const u = [...new Set(days)].sort((a, b) => a - b)
  return u.map((d) => WD[d] ?? String(d)).join(', ')
}

export function modeLabel(mode: RxMode): string {
  switch (mode) {
    case 'reps_load':
      return 'Repetições + carga'
    case 'time':
      return 'Por tempo / velocidade (sem foco em carga)'
    case 'reps_bodyweight':
      return 'Repetições — peso corporal'
    case 'distance':
      return 'Distância / metros'
    case 'skill':
      return 'Habilidade / técnica'
    case 'circuit':
      return 'Circuito / estação'
    default:
      return mode
  }
}

/** Rótulo curto para listas e chips */
export function modeLabelShort(mode: RxMode): string {
  switch (mode) {
    case 'reps_load':
      return 'Reps + carga'
    case 'time':
      return 'Tempo / velocidade'
    case 'reps_bodyweight':
      return 'Peso corporal'
    case 'distance':
      return 'Distância'
    case 'skill':
      return 'Técnica'
    case 'circuit':
      return 'Circuito'
    default:
      return mode
  }
}

/** Texto completo que vai no campo descrição do treino */
export function buildTrainingDescriptionFromPreset(p: WorkoutPreset): string {
  const lines: string[] = [
    `📅 Dias sugeridos: ${weekdaysToShort(p.suggestedWeekdays)}`,
    `🔁 Séries: ${p.sets}`,
    `📋 Prescrição: ${p.repsOrDuration}`,
    `🎯 Objetivo: ${p.objective}`,
    `⚙️ Modo: ${modeLabel(p.prescriptionMode)}`,
  ]
  if (p.loadNote) {
    lines.push(`🏋️ Carga / intensidade: ${p.loadNote}`)
  } else if (
    p.prescriptionMode === 'time' ||
    p.prescriptionMode === 'skill'
  ) {
    lines.push(
      '🏋️ Carga: não aplicável — priorizar qualidade do movimento / tempo / velocidade.',
    )
  }
  if (p.coachCue) {
    lines.push('', '💡 Observações do preparador:', p.coachCue)
  }
  lines.push('', '—', 'Tigers Physic • ajuste cargas com supervisão quando indicado.')
  return lines.join('\n')
}

/** Descrição salva no Firestore a partir do formulário estruturado */
export function composeTrainingDescriptionForSave(fields: {
  mode: RxMode
  sets: string
  repsOrDuration: string
  loadNote: string
  objective: string
  weekdays: number[]
  restBetweenSets?: string
  rpeTarget?: string
  equipment?: string
  coachNotesExtra?: string
}): string {
  const lines: string[] = [
    `📅 Dias da semana: ${weekdaysToShort(fields.weekdays)}`,
    `⚙️ Modo: ${modeLabel(fields.mode)}`,
    `🔁 Séries: ${fields.sets}`,
    `📋 Repetições / tempo: ${fields.repsOrDuration}`,
  ]
  if (fields.loadNote.trim()) {
    lines.push(`🏋️ Carga / intensidade: ${fields.loadNote}`)
  } else if (fields.mode === 'time' || fields.mode === 'skill') {
    lines.push(
      '🏋️ Carga: não aplicável — priorizar tempo, velocidade ou qualidade técnica.',
    )
  }
  lines.push(`🎯 Objetivo: ${fields.objective}`)
  if (fields.rpeTarget?.trim()) lines.push(`📈 RPE / zona alvo: ${fields.rpeTarget}`)
  if (fields.restBetweenSets?.trim()) {
    lines.push(`⏱ Descanso entre séries: ${fields.restBetweenSets}`)
  }
  if (fields.equipment?.trim()) lines.push(`🎒 Equipamento: ${fields.equipment}`)
  if (fields.coachNotesExtra?.trim()) {
    lines.push('', '💬 Notas do preparador:', fields.coachNotesExtra)
  }
  lines.push('', '—', 'Tigers Physic')
  return lines.join('\n')
}
