import { create } from 'zustand'

export interface Connection {
  id: number
  name: string
  db_type: string
  is_active: boolean
  allow_writes: boolean
  masked_connection_string: string
  created_at: string
  schema_cached_at: string | null
}

export interface QueryResult {
  sql: string
  query_type: string
  columns: string[]
  rows: unknown[][]
  row_count: number
  execution_ms: number
  was_cached: boolean
  query_id: number
}

export interface PendingWrite {
  sql: string
  query_type: string
  question: string
  estimated_affected_rows: number
}

export interface HistoryItem {
  id: number
  natural_language: string
  generated_sql: string
  query_type: string
  row_count: number | null
  execution_ms: number | null
  was_cached: boolean
  error: string | null
  created_at: string
  connection_name: string
}

interface AppStore {
  token: string | null
  setToken: (t: string | null) => void
  connections: Connection[]
  setConnections: (c: Connection[]) => void
  activeConnection: Connection | null
  setActiveConnection: (c: Connection | null) => void
  queryResult: QueryResult | null
  setQueryResult: (r: QueryResult | null) => void
  queryLoading: boolean
  setQueryLoading: (b: boolean) => void
  queryError: string | null
  setQueryError: (e: string | null) => void
  pendingWrite: PendingWrite | null
  setPendingWrite: (p: PendingWrite | null) => void
  history: HistoryItem[]
  setHistory: (h: HistoryItem[]) => void
  stats: { total_queries: number; cached_queries: number; avg_execution_ms: number } | null
  setStats: (s: AppStore['stats']) => void
}

export const useStore = create<AppStore>((set) => ({
  token: localStorage.getItem('token'),
  setToken: (t) => {
    if (t) localStorage.setItem('token', t)
    else localStorage.removeItem('token')
    set({ token: t })
  },
  connections: [],
  setConnections: (connections) => set({ connections }),
  activeConnection: null,
  setActiveConnection: (activeConnection) => set({ activeConnection }),
  queryResult: null,
  setQueryResult: (queryResult) => set({ queryResult }),
  queryLoading: false,
  setQueryLoading: (queryLoading) => set({ queryLoading }),
  queryError: null,
  setQueryError: (queryError) => set({ queryError }),
  pendingWrite: null,
  setPendingWrite: (pendingWrite) => set({ pendingWrite }),
  history: [],
  setHistory: (history) => set({ history }),
  stats: null,
  setStats: (stats) => set({ stats }),
}))
