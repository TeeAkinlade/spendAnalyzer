import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { IconBell } from './Icons.jsx'

function toDatetimeLocalValue(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function formatWhen(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString()
}

export default function Reminders() {
  const [reminders, setReminders] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [toEmail, setToEmail] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editMessage, setEditMessage] = useState('')
  const [editToEmail, setEditToEmail] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [activeTab, setActiveTab] = useState('scheduled')
  const [toast, setToast] = useState('')
  const lastStatusByIdRef = useRef({})

  const scheduledCount = useMemo(
    () => reminders.filter((r) => r.status !== 'sent').length,
    [reminders],
  )
  const sentCount = useMemo(
    () => reminders.filter((r) => r.status === 'sent').length,
    [reminders],
  )
  const scheduledReminders = useMemo(
    () => reminders.filter((r) => r.status !== 'sent'),
    [reminders],
  )
  const sentReminders = useMemo(
    () => reminders.filter((r) => r.status === 'sent'),
    [reminders],
  )

  useEffect(() => {
    let mounted = true
    async function loadReminders() {
      try {
        const res = await api.get('/api/reminders')
        if (!mounted) return
        const nextReminders = res.data || []
        const prevStatusById = lastStatusByIdRef.current
        const justSent = nextReminders.filter(
          (r) => r.status === 'sent' && prevStatusById[r.id] && prevStatusById[r.id] !== 'sent',
        )

        if (justSent.length > 0) {
          const latest = justSent[0]
          setToast(`Reminder sent: ${latest.title || 'Reminder'}`)
          setActiveTab('notifications')
        }

        const nextStatusById = {}
        for (const r of nextReminders) {
          nextStatusById[r.id] = r.status
        }
        lastStatusByIdRef.current = nextStatusById
        setReminders(nextReminders)
      } catch (e) {
        if (!mounted) return
        setError('Failed to load reminders. Make sure backend is running.')
      }
    }

    loadReminders()
    const timer = setInterval(loadReminders, 15000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(timer)
  }, [toast])

  async function addReminder() {
    setError('')
    setLoading(true)
    try {
      if (!scheduledAt) {
        setError('Please choose a date & time.')
        return
      }
      if (!toEmail.trim()) {
        setError('Please enter recipient email.')
        return
      }

      const scheduledIso = new Date(scheduledAt).toISOString()

      const res = await api.post('/api/reminders', {
        title: title.trim() || 'Reminder',
        message: message.trim() || undefined,
        toEmail: toEmail.trim().toLowerCase(),
        scheduledAt: scheduledIso,
      })

      setReminders((prev) => [res.data, ...(prev || [])])
      setTitle('')
      setMessage('')
      setToEmail('')
      setScheduledAt('')
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to add reminder.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function beginEdit(r) {
    setEditingId(r.id)
    setEditTitle(r.title || '')
    setEditMessage(r.message || '')
    setEditToEmail(r.toEmail || '')
    setEditScheduledAt(toDatetimeLocalValue(r.scheduledAt))
  }

  async function saveEdit() {
    setError('')
    setLoading(true)
    try {
      if (!editingId) return
      if (!editScheduledAt) {
        setError('Pick a new date & time.')
        return
      }
      if (!editToEmail.trim()) {
        setError('Please enter recipient email.')
        return
      }

      const scheduledIso = new Date(editScheduledAt).toISOString()

      const res = await api.put(`/api/reminders/${editingId}`, {
        title: editTitle.trim() || 'Reminder',
        message: editMessage.trim() || undefined,
        toEmail: editToEmail.trim().toLowerCase(),
        scheduledAt: scheduledIso,
      })

      setReminders((prev) => prev.map((r) => (r.id === editingId ? res.data : r)))
      setEditingId(null)
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to update reminder.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function removeReminder(id) {
    setError('')
    setLoading(true)
    try {
      await api.delete(`/api/reminders/${id}`)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to delete reminder.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="app-card">
      {toast ? <div className="app-toast">{toast}</div> : null}

      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--app-primary-soft)', color: 'var(--app-primary)' }}
        >
          <IconBell className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Reminders</h2>
          <p className="app-muted mt-0.5">
            Email alerts when each reminder is due.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="app-card-muted grid gap-4">
          <p className="text-sm font-semibold">New reminder</p>

          <div className="grid gap-1 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1 sm:col-span-2">
              <label className="app-label">Title</label>
              <input
                className="app-input"
                placeholder="e.g. Pay rent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <label className="app-label">Message</label>
              <textarea
                className="app-input min-h-[88px] resize-y"
                placeholder="What should we remind you about?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label className="app-label">Date & time</label>
              <input
                type="datetime-local"
                className="app-input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label className="app-label">Recipient email</label>
              <input
                type="email"
                className="app-input"
                placeholder="you@example.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="app-error">{error}</p> : null}

          <button
            type="button"
            disabled={loading}
            onClick={addReminder}
            className="app-btn-primary w-full sm:w-auto"
          >
            {loading ? 'Saving…' : 'Add reminder'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('scheduled')}
            className={`app-tab-pill ${activeTab === 'scheduled' ? 'app-tab-pill-active' : 'app-tab-pill-inactive'}`}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`app-tab-pill ${activeTab === 'notifications' ? 'app-tab-pill-active' : 'app-tab-pill-inactive'}`}
          >
            Sent ({sentCount})
          </button>
        </div>

        <div className="space-y-3">
          {activeTab === 'scheduled' && scheduledReminders.length === 0 ? (
            <p className="app-muted">No scheduled reminders yet.</p>
          ) : null}
          {activeTab === 'notifications' && sentReminders.length === 0 ? (
            <p className="app-muted">No notifications yet.</p>
          ) : null}

          {(activeTab === 'scheduled' ? scheduledReminders : sentReminders).map((r) => {
            const isEditing = editingId === r.id
            return (
              <article key={r.id} className="app-card-muted">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.title || 'Reminder'}</p>
                    <p className="app-muted mt-1 text-xs">{formatWhen(r.scheduledAt)}</p>
                    {r.message ? (
                      <p className="mt-2 text-sm">{r.message}</p>
                    ) : null}
                    <p className="app-muted mt-2 text-xs">To: {r.toEmail || '—'}</p>
                  </div>

                  {activeTab === 'scheduled' ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={r.status === 'sent' || loading}
                        onClick={() => beginEdit(r)}
                        className="app-btn-secondary px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => removeReminder(r.id)}
                        className="app-btn-secondary px-3 py-1.5 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        background: 'var(--app-success-soft)',
                        color: 'var(--app-success)',
                      }}
                    >
                      Sent
                    </span>
                  )}
                </div>

                {activeTab === 'scheduled' && isEditing ? (
                  <div className="mt-4 grid gap-3 border-t pt-4" style={{ borderColor: 'var(--app-border)' }}>
                    <div className="grid gap-1">
                      <label className="app-label text-xs">Title</label>
                      <input className="app-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <label className="app-label text-xs">Message</label>
                      <textarea
                        className="app-input min-h-[72px] resize-y"
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="app-label text-xs">Date & time</label>
                        <input
                          type="datetime-local"
                          className="app-input"
                          value={editScheduledAt}
                          onChange={(e) => setEditScheduledAt(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="app-label text-xs">Recipient email</label>
                        <input
                          type="email"
                          className="app-input"
                          value={editToEmail}
                          onChange={(e) => setEditToEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={loading} onClick={saveEdit} className="app-btn-primary text-xs">
                        Save changes
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setEditingId(null)}
                        className="app-btn-secondary text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
