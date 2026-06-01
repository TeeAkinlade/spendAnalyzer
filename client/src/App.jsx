import { useState } from 'react'
import BudgetPlanner from './components/BudgetPlanner.jsx'
import Reminders from './components/Reminders.jsx'
import BudgetHistory from './components/BudgetHistory.jsx'
import { IconBack, IconBell, IconHistory, IconWallet } from './components/Icons.jsx'

export default function App() {
  const [page, setPage] = useState('plan')
  const [mainTab, setMainTab] = useState('plan')

  const onHistory = page === 'history'
  const onReminders = page === 'plan' && mainTab === 'reminders'

  function goToPlan() {
    setPage('plan')
    setMainTab('plan')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {onHistory ? (
              <button
                type="button"
                className="app-btn-icon shrink-0"
                onClick={goToPlan}
                aria-label="Back to budget"
              >
                <IconBack />
              </button>
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                {onHistory ? 'Budget history' : 'Spend Analyzer'}
              </h1>
              <p className="app-muted truncate text-xs sm:text-sm">
                {onHistory
                  ? 'Your saved plans, newest first'
                  : 'Plan spending & email reminders'}
              </p>
            </div>
          </div>

          {!onHistory ? (
            <button
              type="button"
              className="app-btn-icon shrink-0"
              onClick={() => setPage('history')}
              aria-label="View budget history"
              title="History"
            >
              <IconHistory />
            </button>
          ) : null}
        </div>

        {page === 'plan' ? (
          <div className="app-segment mt-4 lg:hidden">
            <button
              type="button"
              className={`app-segment-btn ${mainTab === 'plan' ? 'app-segment-btn-active' : ''}`}
              onClick={() => setMainTab('plan')}
            >
              Budget
            </button>
            <button
              type="button"
              className={`app-segment-btn ${mainTab === 'reminders' ? 'app-segment-btn-active' : ''}`}
              onClick={() => setMainTab('reminders')}
            >
              Reminders
            </button>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        {page === 'history' ? (
          <BudgetHistory />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className={mainTab === 'reminders' ? 'hidden lg:block' : ''}>
              <BudgetPlanner />
            </div>
            <div className={mainTab === 'plan' ? 'hidden lg:block' : ''}>
              <Reminders />
            </div>
          </div>
        )}
      </main>

      <nav className="app-bottom-nav" aria-label="Main navigation">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className={`app-nav-item ${page === 'plan' && mainTab === 'plan' ? 'app-nav-item-active' : ''}`}
            onClick={goToPlan}
          >
            <IconWallet className="h-6 w-6" />
            Budget
          </button>
          <button
            type="button"
            className={`app-nav-item ${onReminders ? 'app-nav-item-active' : ''}`}
            onClick={() => {
              setPage('plan')
              setMainTab('reminders')
            }}
          >
            <IconBell className="h-6 w-6" />
            Reminders
          </button>
          <button
            type="button"
            className={`app-nav-item ${onHistory ? 'app-nav-item-active' : ''}`}
            onClick={() => setPage('history')}
            aria-label="History"
          >
            <IconHistory className="h-6 w-6" />
            History
          </button>
        </div>
      </nav>
    </div>
  )
}
