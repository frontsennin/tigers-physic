export type UserRole =
  | 'admin'
  | 'coordenador'
  | 'preparador'
  | 'jogador'

export const MANAGEMENT_ROLES: UserRole[] = [
  'admin',
  'coordenador',
  'preparador',
]

export function isManagementRole(role: UserRole): boolean {
  return MANAGEMENT_ROLES.includes(role)
}

/** Papel vindo do Firestore pode variar em caixa ou sinônimos legados. */
export function normalizeUserRole(raw: unknown): UserRole {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'atleta' || s === 'player' || s === 'athlete') return 'jogador'
  if (MANAGEMENT_ROLES.includes(s as UserRole)) return s as UserRole
  if (s === 'jogador') return 'jogador'
  return 'jogador'
}

export function isAthleteRole(role: UserRole): boolean {
  return !isManagementRole(role)
}

/** Menu inferior / atalhos: todos veem «Análises» do próprio login, exceto preparador (usa ficha do atleta). */
export function showAnalysesInOwnNav(role: UserRole): boolean {
  return role !== 'preparador'
}

export type Sector = 'QB' | 'DL' | 'OL' | 'WR' | 'RB'

export const SECTORS: Sector[] = ['QB', 'DL', 'OL', 'WR', 'RB']

/** Dimensões de medida que o preparador usa ao registrar análises */
export type MeasureKind =
  | 'time'
  | 'weight'
  | 'distance'
  | 'reps'
  | 'score'
  | 'custom'

export type AnalysisCategory =
  | 'velocidade'
  | 'forca'
  | 'mobilidade'
  | 'reflexo'
  | 'impulso'
  | 'explosao'
  | 'pegada'

export const ANALYSIS_CATEGORIES: {
  id: AnalysisCategory
  label: string
  suggestedMeasure: MeasureKind
  hint: string
}[] = [
  {
    id: 'velocidade',
    label: 'Velocidade',
    suggestedMeasure: 'time',
    hint: 'Ex.: tempo em 40 jardas, 10 m, flying sprint (s).',
  },
  {
    id: 'forca',
    label: 'Força',
    suggestedMeasure: 'weight',
    hint: 'Ex.: carga no agachamento/supino (kg), RM ou %1RM.',
  },
  {
    id: 'mobilidade',
    label: 'Mobilidade',
    suggestedMeasure: 'score',
    hint: 'Ex.: amplitude (graus), score de teste funcional ou tempo controlado.',
  },
  {
    id: 'reflexo',
    label: 'Reflexo',
    suggestedMeasure: 'time',
    hint: 'Ex.: tempo de reação, toques em alvo (ms ou s).',
  },
  {
    id: 'impulso',
    label: 'Impulso',
    suggestedMeasure: 'distance',
    hint: 'Ex.: salto em distância, triple jump (m ou cm).',
  },
  {
    id: 'explosao',
    label: 'Explosão',
    suggestedMeasure: 'time',
    hint: 'Ex.: salto vertical (cm), impulsão, split de aceleração (s).',
  },
  {
    id: 'pegada',
    label: 'Pegada',
    suggestedMeasure: 'weight',
    hint: 'Ex.: dinamômetro de preensão (kg/lbf) ou testes específicos de contato.',
  },
]

export type UserProfile = {
  uid: string
  email: string
  displayName: string
  role: UserRole
  sectors: Sector[]
  createdAt: number
  updatedAt: number
}

export type PerformanceAnalysis = {
  id: string
  userId: string
  category: AnalysisCategory
  measureKind: MeasureKind
  valueNumber?: number
  valueText?: string
  unit?: string
  protocol?: string
  notes?: string
  createdBy: string
  createdAt: number
}

/** Mesmo significado do catálogo de prescrições — persistido no treino */
export type PrescriptionMode =
  | 'reps_load'
  | 'time'
  | 'reps_bodyweight'
  | 'distance'
  | 'skill'
  | 'circuit'

export type TrainingPrescription = {
  mode: PrescriptionMode
  sets: number | string
  repsOrDuration: string
  loadNote: string | null
  objective: string
  /** 0=dom … 6=sáb — orientação de dias da semana */
  suggestedWeekdays: number[]
  /** Descanso entre séries (ex.: 90 s, 2 min) */
  restBetweenSets?: string
  /** RPE ou zona alvo */
  rpeTarget?: string
  /** Halteres, elástico, campo, etc. */
  equipment?: string
  /** Texto livre do preparador */
  coachNotesExtra?: string
}

export type Training = {
  id: string
  userId: string
  title: string
  description: string
  /** Categorias de análise que este treino reforça (definido pelo preparador) */
  linkedCategories: AnalysisCategory[]
  /** Data/hora agendada (timestamp ms) */
  scheduledAt: number
  /** 0 = domingo … 6 = sábado — redundante para filtros por dia da semana */
  weekday: number
  /** yyyy-MM-dd no fuso local do preparador ao criar */
  dateKey: string
  createdBy: string
  createdAt: number
  /** Dias da semana em que o atleta deve executar (0=dom … 6=sáb) */
  trainingWeekdays?: number[]
  /** id do preset do catálogo, se aplicável */
  presetId?: string
  prescription?: TrainingPrescription
}

export type TrainingCompletion = {
  id: string
  trainingId: string
  userId: string
  completed: boolean
  completedAt: number | null
  mediaUrls: string[]
  updatedAt: number
}
