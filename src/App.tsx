import { useState, useEffect } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from './db'
import { initDB } from './db'
import { importWords } from './db/words'
import { Home } from './pages/Home'
import { Learn } from './pages/Learn'
import { Review } from './pages/Review'
import { Stats } from './pages/Stats'

type Page = 'home' | 'learn' | 'review' | 'weakReview' | 'stats'

export default function App() {
  const [db, setDb] = useState<IDBPDatabase<WordDB> | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function setup() {
      const database = await initDB()
      await importWords(database)
      setDb(database)
      setLoading(false)
    }
    setup()
  }, [])

  if (loading || !db) {
    return <div className="loading">加载中...</div>
  }

  switch (page) {
    case 'learn':
      return <Learn db={db} onBack={() => setPage('home')} />
    case 'review':
      return <Review db={db} onBack={() => setPage('home')} />
    case 'weakReview':
      return <Review db={db} onBack={() => setPage('stats')} weakOnly />
    case 'stats':
      return <Stats db={db} onBack={() => setPage('home')} onNavigate={(p) => setPage(p as Page)} />
    default:
      return <Home db={db} onNavigate={(p) => setPage(p as Page)} />
  }
}
