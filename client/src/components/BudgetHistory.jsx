import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { IconHistory } from './Icons.jsx'

function formatMoney(n) {
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function BudgetHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/api/budget/history')
        if (!mounted) return
        const rows = (res.data || []).filter(
          (b) => Number(b.income) > 0 || (b.itemCount ?? b.items?.length ?? 0) > 0,
        )
        setHistory(rows)
      } catch (e) {
        if (!mounted) return
        setError(e?.response?.data?.error || e?.message || 'Failed to load history.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="app-card">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--app-primary-soft)', color: 'var(--app-primary)' }}
        >
          <IconHistory className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Saved budgets</h2>
          <p className="app-muted mt-0.5 text-sm">Newest plans appear first.</p>
        </div>
      </div>

      {loading ? <p className="app-muted mt-6">Loading history…</p> : null}
      {error ? <p className="app-error mt-6">{error}</p> : null}

      {!loading && !error && history.length === 0 ? (
        <p className="app-muted mt-6">
          No saved budgets yet. Save a plan on the Budget tab to build your history.
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {history.map((entry) => {
          const summary = entry.summary || {}
          return (
            <article key={entry.id} className="app-card-muted">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{formatDate(entry.createdAt)}</p>
                  <p className="app-muted mt-1 text-xs">
                    {entry.itemCount ?? entry.items?.length ?? 0} planned item(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="app-btn-secondary shrink-0 text-xs"
                >
                  View details
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div className="app-stat">
                  <p className="app-muted text-xs">Income</p>
                  <p className="mt-1 font-semibold">{formatMoney(summary.income)}</p>
                </div>
                <div className="app-stat">
                  <p className="app-muted text-xs">Planned</p>
                  <p className="mt-1 font-semibold">{formatMoney(summary.totalPlanned)}</p>
                </div>
                <div className="app-stat">
                  <p className="app-muted text-xs">Savings</p>
                  <p className="mt-1 font-semibold">{formatMoney(summary.savingsTotal)}</p>
                </div>
                <div className="app-stat">
                  <p className="app-muted text-xs">Remaining</p>
                  <p className="mt-1 font-semibold">{formatMoney(summary.remainingIncome)}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {selected ? (
        <div className="app-modal-overlay" role="dialog" aria-modal="true">
          <div className="app-modal">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">Budget details</h3>
              <button type="button" className="app-btn-secondary px-3 py-1.5 text-xs" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <p className="app-muted mt-1">{formatDate(selected.createdAt)}</p>

            <ul className="mt-4 space-y-2">
              {(selected.items || []).map((item, idx) => (
                <li key={`${item.name}-${idx}`} className="app-card-muted text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="app-muted">
                    {' '}
                    — {item.type === 'percent' ? `${item.percent}%` : formatMoney(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  )
}
