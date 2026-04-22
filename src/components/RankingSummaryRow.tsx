import type { ReactNode } from 'react'

export function RankPointsBadge({ points }: { points: number }) {
  return (
    <div className="rank-points" aria-label={`${points} pontos`}>
      <div className="rank-points-value">{points}</div>
      <div className="rank-points-label">pts</div>
    </div>
  )
}

export function RankingSummaryRow({
  rank,
  subtitle,
  points,
  rightExtra,
}: {
  rank: number | null
  subtitle: ReactNode
  points: number | null
  rightExtra?: ReactNode
}) {
  const pts = points ?? 0
  return (
    <div className="ranking-row ranking-row--me">
      <div className="ranking-rank" aria-label="Posição no ranking">
        {rank ?? '—'}
      </div>
      <div className="ranking-main">
        <div className="ranking-name">
          <strong>Sua posição</strong>
        </div>
        <div className="ranking-sub muted small">{subtitle}</div>
      </div>
      <div className="ranking-score">
        <RankPointsBadge points={pts} />
        {rightExtra}
      </div>
    </div>
  )
}

