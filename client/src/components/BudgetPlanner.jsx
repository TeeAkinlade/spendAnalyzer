import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

function isSaveName(name) {
  return /save/i.test(name) || /savings?/i.test(name)
}

function parseIncome(value) {
  const normalized = String(value ?? '').replace(/,/g, '').trim()
  if (normalized === '') return NaN
  return Number(normalized)
}

function computeSummary(incomeNumber, items) {
  const parsedIncome = parseIncome(incomeNumber)
  const income = Number.isFinite(parsedIncome) ? parsedIncome : 0
  const safeItems = Array.isArray(items) ? items : []

  let savingsTotal = 0
  let expensesTotal = 0

  for (const item of safeItems) {
    const name = String(item?.name || '')
    const amount =
      item?.type === 'percent'
        ? (income * Number(item?.percent || 0)) / 100
        : Number(item?.amount || 0)

    if (isSaveName(name)) savingsTotal += amount
    else expensesTotal += amount
  }

  const totalPlanned = savingsTotal + expensesTotal
  return {
    income,
    savingsTotal,
    expensesTotal,
    totalPlanned,
    remainingIncome: income - totalPlanned,
  }
}

function formatMoney(n) {
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}

function numberInputValue(n) {
  if (n === '' || n === undefined || n === null || n === 0) return ''
  return String(n)
}

function newItem() {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'fixed', // only "Save"/"Saving" items can be percent-based
    amount: 0,
    percent: 0,
    done: false,
  }
}

export default function BudgetPlanner() {
  const [income, setIncome] = useState('')
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReminderPrompt, setShowReminderPrompt] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderToEmail, setReminderToEmail] = useState('')
  const [reminderScheduledAt, setReminderScheduledAt] = useState('')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderError, setReminderError] = useState('')
  const [reminderSuccess, setReminderSuccess] = useState('')
  const [budgetDocId, setBudgetDocId] = useState(null)

  const preview = useMemo(() => computeSummary(income, items), [income, items])

  function buildCleanedItems(sourceItems) {
    return (sourceItems || [])
      .map((it) => ({
        itemId: it.id,
        name: String(it.name || '').trim(),
        type: it.type,
        amount: it.type === 'fixed' ? Number(it.amount || 0) : undefined,
        percent: it.type === 'percent' ? Number(it.percent || 0) : undefined,
        done: Boolean(it.done),
      }))
      .filter((it) => it.name.length > 0)
  }

  async function persistCurrentBudget(sourceItems = items) {
    const incomeNumber = parseIncome(income)
    if (!Number.isFinite(incomeNumber) || incomeNumber <= 0) return false

    const cleanedItems = buildCleanedItems(sourceItems)
    const res = await api.put('/api/budget/current', {
      income: incomeNumber,
      items: cleanedItems,
    })

    const savedId = res.data?.budget?._id
    if (savedId) setBudgetDocId(String(savedId))
    return true
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get('/api/budget')
        if (!mounted) return
        const budget = res.data || { income: 0, items: [] }
        if (budget._id) setBudgetDocId(String(budget._id))
        setIncome(budget.income ? String(budget.income) : '')
        setItems(
          (budget.items || []).map((it) => ({
            id: String(it?.itemId || crypto.randomUUID()),
            name: String(it?.name || ''),
            type: String(it?.type || 'fixed'),
            amount: Number(it?.amount || 0),
            percent: Number(it?.percent || 0),
            done: Boolean(it?.done),
          })),
        )
      } catch (e) {
        if (!mounted) return
        setError('Failed to load budget. Make sure backend is running.')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function savePlan() {
    console.log('[BudgetPlanner] savePlan called')
    setError('')
    setLoading(true)
    try {
      const incomeNumber = parseIncome(income)
      if (!Number.isFinite(incomeNumber) || incomeNumber <= 0) {
        setError('Enter a positive monthly income above, then click Save Plan.')
        return
      }

      const cleanedItems = buildCleanedItems(items)

      const res = await api.post('/api/budget', {
        income: incomeNumber,
        items: cleanedItems,
      })

      if (res.data?.budget?._id) setBudgetDocId(String(res.data.budget._id))
      setSummary(res.data?.summary || computeSummary(incomeNumber, cleanedItems))
      setShowReminderPrompt(true)
    } catch (e) {
      console.error('[BudgetPlanner] error:', e)
      const msg = e?.response?.data?.error || e?.message || 'Failed to save plan.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  async function toggleItemDone(id) {
    let nextItems = []
    setItems((prev) => {
      nextItems = prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
      return nextItems
    })

    try {
      const incomeNumber = parseIncome(income)
      if (!budgetDocId) {
        if (!Number.isFinite(incomeNumber) || incomeNumber <= 0) {
          setError('Enter monthly income before marking items done.')
          setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
          )
          return
        }
        const cleanedItems = buildCleanedItems(nextItems)
        if (cleanedItems.length === 0) {
          setError('Name the item before marking it done.')
          setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
          )
          return
        }
        const res = await api.post('/api/budget', {
          income: incomeNumber,
          items: cleanedItems,
        })
        if (res.data?.budget?._id) setBudgetDocId(String(res.data.budget._id))
        return
      }
      await persistCurrentBudget(nextItems)
    } catch (e) {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
      )
      const msg =
        e?.response?.data?.error || e?.message || 'Failed to save checked state.'
      setError(msg)
    }
  }

  function handleNameChange(id, name) {
    const trimmed = name
    const save = isSaveName(trimmed)

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        if (save) {
          // Allow percent or fixed for Save/Savings
          return { ...it, name: trimmed }
        }
        // Force fixed for others
        return { ...it, name: trimmed, type: 'fixed', percent: 0 }
      }),
    )
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()])
  }

  function closeReminderModal() {
    setShowReminderModal(false)
    setReminderError('')
    setReminderSuccess('')
  }

  async function saveReminderFromBudget() {
    setReminderError('')
    setReminderSuccess('')
    setReminderSaving(true)
    try {
      if (!reminderScheduledAt) {
        setReminderError('Please choose a date and time for the reminder.')
        return
      }
      if (!reminderToEmail.trim()) {
        setReminderError('Please enter the recipient email.')
        return
      }

      const scheduledIso = new Date(reminderScheduledAt).toISOString()
      await api.post('/api/reminders', {
        title: reminderTitle.trim() || 'Budget reminder',
        message:
          reminderMessage.trim() ||
          'Review your saved budget and planned spending.',
        toEmail: reminderToEmail.trim().toLowerCase(),
        scheduledAt: scheduledIso,
      })

      setReminderSuccess('Reminder created successfully.')
      setReminderTitle('')
      setReminderMessage('')
      setReminderToEmail('')
      setReminderScheduledAt('')
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to create reminder.'
      setReminderError(msg)
    } finally {
      setReminderSaving(false)
    }
  }

  return (
    <section className="app-card relative">
      <div>
        <h2 className="text-lg font-semibold">Budget planner</h2>
        <p className="app-muted mt-1">
          Enter income, add planned items, and track what you can spend.
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-1">
          <label className="app-label" htmlFor="income">
            Monthly income
          </label>
          <input
            id="income"
            inputMode="decimal"
            className="app-input"
            placeholder="e.g. 800000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Planned items</h3>
            <button type="button" onClick={addItem} className="app-btn-secondary text-sm">
              + Add item
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {items.length === 0 ? (
              <p className="app-muted">No items yet. Add one to begin.</p>
            ) : null}

            {items.map((it) => {
              const save = isSaveName(it.name)
              const done = Boolean(it.done)
              return (
                <div
                  key={it.id}
                  className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors sm:flex-row ${
                    done ? 'item-done' : 'app-card-muted'
                  }`}
                >
                  <button
                    type="button"
                    aria-label={done ? 'Mark as not done' : 'Mark as done'}
                    aria-pressed={done}
                    onClick={() => toggleItemDone(it.id)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full border-2 transition-colors sm:mt-6 ${
                      done
                        ? 'border-(--app-success) bg-(--app-success) text-white shadow-sm'
                        : 'border-(--app-border) bg-(--app-surface) hover:border-(--app-success)'
                    }`}
                  >
                    {done ? (
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : null}
                  </button>

                  <div
                    className={`grid min-w-0 flex-1 gap-3 sm:grid-cols-1 lg:grid-cols-12 ${
                      done ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="lg:col-span-4">
                      <label className="app-label block text-xs">Name</label>
                      <input
                        className={`app-input mt-1 text-sm ${done ? 'line-through' : ''}`}
                        placeholder="e.g. Save, Feeding, Light, Transport"
                        value={it.name}
                        onChange={(e) => handleNameChange(it.id, e.target.value)}
                      />
                    </div>

                    {save ? (
                      <div className="lg:col-span-3">
                        <label className="app-label block text-xs">Type</label>
                        <select
                          className="app-input mt-1 text-sm"
                          value={it.type}
                          onChange={(e) => updateItem(it.id, { type: e.target.value })}
                        >
                          <option value="fixed">Fixed amount</option>
                          <option value="percent">Percentage</option>
                        </select>
                      </div>
                    ) : null}

                    <div className={save ? 'lg:col-span-5' : 'lg:col-span-8'}>
                      {save && it.type === 'percent' ? (
                        <>
                          <label className="app-label block text-xs">Percent (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="app-input mt-1 text-sm"
                            placeholder="e.g. 25"
                            value={numberInputValue(it.percent)}
                            onChange={(e) =>
                              updateItem(it.id, {
                                percent: e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                          />
                        </>
                      ) : (
                        <>
                          <label className="app-label block text-xs">Amount</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            className="app-input mt-1 text-sm"
                            placeholder="e.g. 40000"
                            value={numberInputValue(it.amount)}
                            onChange={(e) =>
                              updateItem(it.id, {
                                amount: e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="app-card-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">Summary</h3>
            <button
              type="button"
              onClick={savePlan}
              disabled={loading}
              className="app-btn-primary w-full sm:w-auto"
            >
              {loading ? 'Saving…' : 'Save plan'}
            </button>
          </div>

          {error ? <p className="app-error mt-3">{error}</p> : null}

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="app-stat">
              <p className="app-muted text-xs">Income</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(preview.income)}</p>
            </div>
            <div className="app-stat">
              <p className="app-muted text-xs">Total planned</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(preview.totalPlanned)}</p>
            </div>
            <div className="app-stat">
              <p className="app-muted text-xs">Savings</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(preview.savingsTotal)}</p>
            </div>
            <div className="app-stat">
              <p className="app-muted text-xs">Remaining</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(preview.remainingIncome)}</p>
            </div>
          </div>
        </div>

        {summary ? (
          <p className="app-muted text-xs">Last saved: {new Date().toLocaleString()}</p>
        ) : null}
      </div>

      {showReminderPrompt ? (
        <div className="app-modal-overlay z-40">
          <div className="app-modal sm:max-w-md">
            <h3 className="text-lg font-semibold">Budget saved</h3>
            <p className="app-muted mt-2">Do you want to set a reminder now?</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="app-btn-secondary" onClick={() => setShowReminderPrompt(false)}>
                Not now
              </button>
              <button
                type="button"
                className="app-btn-primary"
                onClick={() => {
                  setShowReminderPrompt(false)
                  setShowReminderModal(true)
                }}
              >
                Set reminder
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReminderModal ? (
        <div className="app-modal-overlay">
          <div className="app-modal sm:max-w-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Set reminder</h3>
                <p className="app-muted mt-1">You will get an email when this reminder is due.</p>
              </div>
              <button type="button" className="app-btn-secondary px-3 py-1.5 text-xs" onClick={closeReminderModal}>
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-1">
                <label className="app-label">Title</label>
                <input
                  className="app-input"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="e.g. Pay rent"
                />
              </div>
              <div className="grid gap-1">
                <label className="app-label">Message</label>
                <textarea
                  className="app-input min-h-[90px] resize-y"
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="What should we remind you about?"
                />
              </div>
              <div className="grid gap-1 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-1">
                  <label className="app-label">Date and time</label>
                  <input
                    type="datetime-local"
                    className="app-input"
                    value={reminderScheduledAt}
                    onChange={(e) => setReminderScheduledAt(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="app-label">Recipient email</label>
                  <input
                    type="email"
                    className="app-input"
                    value={reminderToEmail}
                    onChange={(e) => setReminderToEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              {reminderError ? <p className="app-error">{reminderError}</p> : null}
              {reminderSuccess ? <p className="app-success-text">{reminderSuccess}</p> : null}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="app-btn-secondary" onClick={closeReminderModal} disabled={reminderSaving}>
                Cancel
              </button>
              <button type="button" className="app-btn-primary" onClick={saveReminderFromBudget} disabled={reminderSaving}>
                {reminderSaving ? 'Saving…' : 'Save reminder'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

