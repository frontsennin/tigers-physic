import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type {
  AnalysisCategory,
  MeasureKind,
  PerformanceAnalysis,
  PrescriptionMode,
  Sector,
  Training,
  TrainingCompletion,
  TrainingPrescription,
  TrainingTemplate,
  DailyPoints,
  UserProfile,
  UserRole,
} from '../types/models'
import { normalizeUserRole } from '../types/models'

const profilesCol = () => collection(getDb(), 'profiles')
const analysesCol = () => collection(getDb(), 'analyses')
const trainingsCol = () => collection(getDb(), 'trainings')
const trainingTemplatesCol = () => collection(getDb(), 'trainingTemplates')
const dailyPointsCol = () => collection(getDb(), 'dailyPoints')
function tsToMs(v: unknown): number {
  if (v && typeof v === 'object' && 'toMillis' in v) {
    return (v as Timestamp).toMillis()
  }
  if (typeof v === 'number') return v
  return Date.now()
}

function dateKeyLocal(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  )
}

/** Firestore rejects `undefined` in documents (nested maps included). */
function omitUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => omitUndefinedDeep(item)) as T
  }
  if (!isPlainObject(value)) return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue
    out[k] = omitUndefinedDeep(v)
  }
  return out as T
}

const PRESCRIPTION_MODES: PrescriptionMode[] = [
  'reps_load',
  'time',
  'reps_bodyweight',
  'distance',
  'skill',
  'circuit',
]

function parseWeekdayArray(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null
  const w = (raw as unknown[])
    .map((n) => Number(n))
    .filter((n) => n >= 0 && n <= 6)
  if (!w.length) return null
  return [...new Set(w)].sort((a, b) => a - b)
}

function parsePrescription(raw: unknown): TrainingPrescription | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const mode = o.mode
  if (typeof mode !== 'string' || !PRESCRIPTION_MODES.includes(mode as PrescriptionMode))
    return undefined
  const days = Array.isArray(o.suggestedWeekdays)
    ? (o.suggestedWeekdays as unknown[]).map((n) => Number(n)).filter((n) => n >= 0 && n <= 6)
    : []
  return {
    mode: mode as PrescriptionMode,
    sets: typeof o.sets === 'number' ? o.sets : String(o.sets ?? ''),
    repsOrDuration: String(o.repsOrDuration ?? ''),
    loadNote: o.loadNote == null || o.loadNote === '' ? null : String(o.loadNote),
    objective: String(o.objective ?? ''),
    suggestedWeekdays: days,
    restBetweenSets:
      o.restBetweenSets != null ? String(o.restBetweenSets) : undefined,
    rpeTarget: o.rpeTarget != null ? String(o.rpeTarget) : undefined,
    equipment: o.equipment != null ? String(o.equipment) : undefined,
    coachNotesExtra:
      o.coachNotesExtra != null ? String(o.coachNotesExtra) : undefined,
  }
}

function parseTrainingWeekdays(
  x: Record<string, unknown>,
  fallbackWeekday: number,
): number[] {
  const fromRoot = parseWeekdayArray(x.trainingWeekdays)
  if (fromRoot) return fromRoot
  const pr = x.prescription
  if (pr && typeof pr === 'object') {
    const fromRx = parseWeekdayArray(
      (pr as Record<string, unknown>).suggestedWeekdays,
    )
    if (fromRx) return fromRx
  }
  return [fallbackWeekday]
}

function mapTrainingDoc(id: string, x: Record<string, unknown>): Training {
  const wd = Number(x.weekday ?? 0)
  return {
    id,
    userId: String(x.userId),
    title: String(x.title ?? ''),
    description: String(x.description ?? ''),
    linkedCategories: (x.linkedCategories as AnalysisCategory[]) ?? [],
    scheduledAt: tsToMs(x.scheduledAt),
    weekday: wd,
    dateKey: String(x.dateKey ?? ''),
    createdBy: String(x.createdBy),
    createdAt: tsToMs(x.createdAt),
    trainingWeekdays: parseTrainingWeekdays(x, wd),
    presetId: x.presetId != null ? String(x.presetId) : undefined,
    prescription: parsePrescription(x.prescription),
  }
}

export async function listProfiles(): Promise<UserProfile[]> {
  const snap = await getDocs(query(profilesCol(), orderBy('displayName')))
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>
    const numOrNull = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null
    return {
      uid: d.id,
      email: String(x.email ?? ''),
      displayName: String(x.displayName ?? ''),
      role: normalizeUserRole(x.role),
      sectors: (x.sectors as Sector[]) ?? [],
      heightCm: numOrNull(x.heightCm),
      weightKg: numOrNull(x.weightKg),
      bodyFatPct: numOrNull(x.bodyFatPct),
      leanMassKg: numOrNull(x.leanMassKg),
      avgSpeed: numOrNull(x.avgSpeed),
      maxSpeed: numOrNull(x.maxSpeed),
      targetWeightKg: numOrNull(x.targetWeightKg),
      targetBodyFatPct: numOrNull(x.targetBodyFatPct),
      targetLeanMassKg: numOrNull(x.targetLeanMassKg),
      createdAt: tsToMs(x.createdAt),
      updatedAt: tsToMs(x.updatedAt),
    }
  })
}

export async function updateUserRoleAndSectors(
  uid: string,
  patch: { role?: UserRole; sectors?: Sector[] },
): Promise<void> {
  await updateDoc(doc(getDb(), 'profiles', uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function updateUserMetrics(
  uid: string,
  patch: Partial<
    Pick<
      UserProfile,
      | 'heightCm'
      | 'weightKg'
      | 'bodyFatPct'
      | 'leanMassKg'
      | 'avgSpeed'
      | 'maxSpeed'
      | 'targetWeightKg'
      | 'targetBodyFatPct'
      | 'targetLeanMassKg'
    >
  >,
): Promise<void> {
  await updateDoc(doc(getDb(), 'profiles', uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function listAnalysesForUser(
  userId: string,
): Promise<PerformanceAnalysis[]> {
  const snap = await getDocs(
    query(analysesCol(), where('userId', '==', userId)),
  )
  const rows = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>
    return {
      id: d.id,
      userId: String(x.userId),
      category: x.category as PerformanceAnalysis['category'],
      measureKind: x.measureKind as MeasureKind,
      valueNumber:
        typeof x.valueNumber === 'number' ? x.valueNumber : undefined,
      valueText: x.valueText != null ? String(x.valueText) : undefined,
      unit: x.unit != null ? String(x.unit) : undefined,
      protocol: x.protocol != null ? String(x.protocol) : undefined,
      notes: x.notes != null ? String(x.notes) : undefined,
      createdBy: String(x.createdBy),
      createdAt: tsToMs(x.createdAt),
    }
  })
  rows.sort((a, b) => b.createdAt - a.createdAt)
  return rows
}

export async function addAnalysis(input: {
  userId: string
  category: AnalysisCategory
  measureKind: MeasureKind
  valueNumber?: number
  valueText?: string
  unit?: string
  protocol?: string
  notes?: string
  createdBy: string
}): Promise<string> {
  const ref = await addDoc(
    analysesCol(),
    omitUndefinedDeep({
      ...input,
      createdAt: serverTimestamp(),
    }) as Record<string, unknown>,
  )
  return ref.id
}

export async function getTraining(id: string): Promise<Training | null> {
  const snap = await getDoc(doc(getDb(), 'trainings', id))
  if (!snap.exists()) return null
  const x = snap.data() as Record<string, unknown>
  return mapTrainingDoc(snap.id, x)
}

export async function listTrainingsForUser(
  userId: string,
): Promise<Training[]> {
  const snap = await getDocs(
    query(trainingsCol(), where('userId', '==', userId)),
  )
  const rows = snap.docs.map((d) =>
    mapTrainingDoc(d.id, d.data() as Record<string, unknown>),
  )
  rows.sort((a, b) => b.createdAt - a.createdAt)
  return rows
}

export async function addTraining(input: {
  userId: string
  title: string
  description: string
  linkedCategories: AnalysisCategory[]
  scheduledAt: number
  weekday: number
  dateKey: string
  createdBy: string
  trainingWeekdays: number[]
  presetId?: string
  prescription?: TrainingPrescription
}): Promise<string> {
  const payload: Record<string, unknown> = {
    userId: input.userId,
    title: input.title,
    description: input.description,
    linkedCategories: input.linkedCategories,
    scheduledAt: input.scheduledAt,
    weekday: input.weekday,
    dateKey: input.dateKey,
    createdBy: input.createdBy,
    trainingWeekdays: input.trainingWeekdays,
    createdAt: serverTimestamp(),
  }
  if (input.presetId) payload.presetId = input.presetId
  if (input.prescription) payload.prescription = input.prescription
  const ref = await addDoc(
    trainingsCol(),
    omitUndefinedDeep(payload) as Record<string, unknown>,
  )
  return ref.id
}

function mapTrainingTemplateDoc(
  id: string,
  x: Record<string, unknown>,
): TrainingTemplate {
  return {
    id,
    title: String(x.title ?? ''),
    description: String(x.description ?? ''),
    linkedCategories: (x.linkedCategories as TrainingTemplate['linkedCategories']) ?? [],
    createdBy: String(x.createdBy ?? ''),
    trainingWeekdays: (x.trainingWeekdays as number[] | undefined) ?? [],
    presetId: x.presetId != null ? String(x.presetId) : undefined,
    prescription: parsePrescription(x.prescription),
    createdAt: tsToMs(x.createdAt),
  }
}

export async function listTrainingTemplatesForCoach(
  coachUid: string,
): Promise<TrainingTemplate[]> {
  const snap = await getDocs(
    query(trainingTemplatesCol(), where('createdBy', '==', coachUid)),
  )
  const rows = snap.docs.map((d) =>
    mapTrainingTemplateDoc(d.id, d.data() as Record<string, unknown>),
  )
  rows.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  return rows
}

export async function addTrainingTemplate(input: {
  title: string
  description: string
  linkedCategories: AnalysisCategory[]
  createdBy: string
  trainingWeekdays: number[]
  presetId?: string
  prescription?: TrainingPrescription
}): Promise<string> {
  const payload: Record<string, unknown> = omitUndefinedDeep({
    title: input.title,
    description: input.description,
    linkedCategories: input.linkedCategories,
    createdBy: input.createdBy,
    trainingWeekdays: input.trainingWeekdays,
    presetId: input.presetId,
    prescription: input.prescription,
    createdAt: serverTimestamp(),
  }) as Record<string, unknown>
  const ref = await addDoc(trainingTemplatesCol(), payload)
  return ref.id
}

function completionDocId(trainingId: string, userId: string) {
  return `${trainingId}_${userId}`
}

export async function getCompletion(
  trainingId: string,
  userId: string,
): Promise<TrainingCompletion | null> {
  // Importante: getDoc em um documento inexistente pode resultar em
  // permission-denied dependendo da rule (resource == null). Usamos query
  // por userId/trainingId para retornar vazio sem erro.
  const snap = await getDocs(
    query(
      collection(getDb(), 'trainingCompletions'),
      where('userId', '==', userId),
      where('trainingId', '==', trainingId),
      limit(1),
    ),
  )
  const first = snap.docs[0]
  if (!first) return null
  const x = first.data() as Record<string, unknown>
  const notesRaw = x.athleteNotes
  return {
    id: first.id,
    trainingId: String(x.trainingId),
    userId: String(x.userId),
    completed: Boolean(x.completed),
    completedAt: x.completedAt ? tsToMs(x.completedAt) : null,
    mediaUrls: Array.isArray(x.mediaUrls)
      ? (x.mediaUrls as string[]).filter(Boolean)
      : [],
    athleteNotes:
      notesRaw == null
        ? null
        : String(notesRaw).trim()
          ? String(notesRaw)
          : null,
    updatedAt: tsToMs(x.updatedAt),
  }
}

export async function listCompletionsForUser(
  userId: string,
): Promise<TrainingCompletion[]> {
  const snap = await getDocs(
    query(collection(getDb(), 'trainingCompletions'), where('userId', '==', userId)),
  )
  const rows = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>
    const notesRaw = x.athleteNotes
    return {
      id: d.id,
      trainingId: String(x.trainingId),
      userId: String(x.userId),
      completed: Boolean(x.completed),
      completedAt: x.completedAt ? tsToMs(x.completedAt) : null,
      mediaUrls: Array.isArray(x.mediaUrls)
        ? (x.mediaUrls as string[]).filter(Boolean)
        : [],
      athleteNotes:
        notesRaw == null
          ? null
          : String(notesRaw).trim()
            ? String(notesRaw)
            : null,
      updatedAt: tsToMs(x.updatedAt),
    } satisfies TrainingCompletion
  })
  // mais recente primeiro ajuda em debug; a UI costuma mapear por trainingId mesmo
  rows.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  return rows
}

export async function upsertCompletion(input: {
  trainingId: string
  userId: string
  completed: boolean
  mediaUrls?: string[]
  athleteNotes?: string | null
  displayName?: string
}): Promise<void> {
  const id = completionDocId(input.trainingId, input.userId)
  const ref = doc(getDb(), 'trainingCompletions', id)
  // Não fazemos getDoc aqui: quando o documento ainda não existe,
  // a leitura pode ser negada pelas rules (resource == null).
  // A UI já envia a lista atual de `mediaUrls`, então basta persistir.
  const mediaUrls = input.mediaUrls ?? []
  const athleteNotes =
    input.athleteNotes === undefined
      ? undefined
      : input.athleteNotes == null
        ? null
        : String(input.athleteNotes)

  await setDoc(
    ref,
    {
      trainingId: input.trainingId,
      userId: input.userId,
      completed: input.completed,
      completedAt: input.completed ? serverTimestamp() : null,
      mediaUrls,
      athleteNotes,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  // Gamificação: pontos por dia (não por treino).
  // IMPORTANT: não deixamos a gamificação impedir o check do treino.
  try {
    const dayKey = dateKeyLocal(Date.now())
    const dpId = `${input.userId}_${dayKey}`
    const dpRef = doc(getDb(), 'dailyPoints', dpId)
    if (!input.completed) {
      await deleteDoc(dpRef).catch(() => {})
      return
    }
    const hasMedia = (mediaUrls?.length ?? 0) > 0
    const points = hasMedia ? 10 : 5
    await setDoc(
      dpRef,
      {
        userId: input.userId,
        displayName: input.displayName ?? '',
        dateKey: dayKey,
        points,
        hasMedia,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch {
    // ignore (ranking pode estar sem permissão/índice publicado)
  }
}

export async function listDailyPointsRange(input: {
  startDateKey: string
  endDateKey: string
}): Promise<DailyPoints[]> {
  const snap = await getDocs(
    query(
      dailyPointsCol(),
      where('dateKey', '>=', input.startDateKey),
      where('dateKey', '<=', input.endDateKey),
      orderBy('dateKey', 'desc'),
    ),
  )
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>
    return {
      id: d.id,
      userId: String(x.userId ?? ''),
      displayName: String(x.displayName ?? ''),
      dateKey: String(x.dateKey ?? ''),
      points: typeof x.points === 'number' ? x.points : 0,
      hasMedia: Boolean(x.hasMedia),
      updatedAt: tsToMs(x.updatedAt),
    }
  })
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getDb(), 'profiles', uid))
  if (!snap.exists()) return null
  const x = snap.data() as Record<string, unknown>
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null
  return {
    uid,
    email: String(x.email ?? ''),
    displayName: String(x.displayName ?? ''),
    role: normalizeUserRole(x.role),
    sectors: (x.sectors as Sector[]) ?? [],
    heightCm: numOrNull(x.heightCm),
    weightKg: numOrNull(x.weightKg),
    bodyFatPct: numOrNull(x.bodyFatPct),
    leanMassKg: numOrNull(x.leanMassKg),
    avgSpeed: numOrNull(x.avgSpeed),
    maxSpeed: numOrNull(x.maxSpeed),
    targetWeightKg: numOrNull(x.targetWeightKg),
    targetBodyFatPct: numOrNull(x.targetBodyFatPct),
    targetLeanMassKg: numOrNull(x.targetLeanMassKg),
    createdAt: tsToMs(x.createdAt),
    updatedAt: tsToMs(x.updatedAt),
  }
}
