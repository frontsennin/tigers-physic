import {
  ANALYSIS_CATEGORIES,
  type AnalysisCategory,
  type MeasureKind,
} from '../types/models'

export function analysisCategoryLabel(c: AnalysisCategory): string {
  return ANALYSIS_CATEGORIES.find((x) => x.id === c)?.label ?? c
}

export function measureKindDisplayLabel(kind: MeasureKind): string {
  const labels: Record<MeasureKind, string> = {
    time: 'Tempo',
    weight: 'Peso / carga',
    distance: 'Distância',
    reps: 'Repetições',
    score: 'Score / nota',
    custom: 'Texto livre',
  }
  return labels[kind] ?? kind
}

export function formatAnalysisMeasure(a: {
  measureKind: MeasureKind
  valueNumber?: number
  valueText?: string
  unit?: string
}): string {
  if (a.valueNumber != null && a.unit) return `${a.valueNumber} ${a.unit}`
  if (a.valueNumber != null) return String(a.valueNumber)
  if (a.valueText) return a.valueText
  return '—'
}
