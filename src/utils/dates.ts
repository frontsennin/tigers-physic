import { format, getDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatSchedule(ms: number): string {
  return format(new Date(ms), "EEE dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function weekdayFromMs(ms: number): number {
  return getDay(new Date(ms))
}

export function dateKeyFromMs(ms: number): string {
  return format(new Date(ms), 'yyyy-MM-dd')
}

/** Regra do produto: check permitido para treinos do dia atual ou futuros (calendário). */
export function canMarkTrainingComplete(scheduledAtMs: number): boolean {
  const today = startOfDay(new Date()).getTime()
  const day = startOfDay(new Date(scheduledAtMs)).getTime()
  return day >= today
}

/** Treino com dias da semana: check só nos dias prescritos. Senão, regra por data agendada. */
export function canMarkTrainingFromPlan(t: {
  scheduledAt: number
  trainingWeekdays?: number[]
}): boolean {
  const days = t.trainingWeekdays?.filter((d) => d >= 0 && d <= 6)
  if (days?.length) {
    return days.includes(getDay(new Date()))
  }
  return canMarkTrainingComplete(t.scheduledAt)
}

/** Valor para `<input type="datetime-local" />` no fuso local */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${y}-${m}-${day}T${h}:${min}`
}

/**
 * Próximo momento cujo dia da semana ∈ `days`, mantendo hora/minuto de `timeSource`.
 * A busca começa em `anchorDate` (meia-noite desse dia).
 */
export function nextDatetimeForWeekdays(
  days: number[],
  timeSource: Date,
  anchorDate: Date = new Date(),
): Date {
  const uniq = [...new Set(days)].filter((d) => d >= 0 && d <= 6)
  if (uniq.length === 0) return new Date(timeSource)

  const start = startOfDay(anchorDate)
  for (let i = 0; i < 21; i++) {
    const cand = new Date(start)
    cand.setDate(start.getDate() + i)
    if (!uniq.includes(cand.getDay())) continue
    cand.setHours(
      timeSource.getHours(),
      timeSource.getMinutes(),
      0,
      0,
    )
    if (cand.getTime() >= Date.now() - 1000) return cand
  }

  return new Date(timeSource)
}
