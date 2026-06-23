import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Database, MessageSquare, History, LayoutDashboard,
  Plus, LogOut, RefreshCw, Trash2, Lock, Unlock,
  Pencil, ChevronDown, ChevronUp, Table2, Columns3
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { connectionsApi } from '../lib/api'

export default function Sidebar() {
  const { connections, setConnections, activeConnection, setActiveConnection, setToken } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', db_type: 'postgresql', connection_string: '', allow_writes: false })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [hoveredConn, setHoveredConn] = useState<number | null>(null)
  const [expandedSchema, setExpandedSchema] = useState<number | null>(null)
  const [schemas, setSchemas] = useState<Record<number, Record<string, { columns: { name: string; type: string }[] }>>>({})
  const navigate = useNavigate()

  async function addConnection() {
    setAdding(true); setAddError('')
    try {
      const res = await connectionsApi.create(form.name, form.db_type, form.connection_string, form.allow_writes)
      setConnections([...connections, res.data])
      setActiveConnection(res.data)
      setShowAdd(false)
      setForm({ name: '', db_type: 'postgresql', connection_string: '', allow_writes: false })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setAddError(err.response?.data?.detail || 'Connection failed')
    } finally { setAdding(false) }
  }

  async function deleteConn(id: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    await connectionsApi.delete(id)
    const updated = connections.filter(c => c.id !== id)
    setConnections(updated)
    if (activeConnection?.id === id) setActiveConnection(updated[0] || null)
  }

  async function refreshSchema(id: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    await connectionsApi.refreshSchema(id)
    if (expandedSchema === id) {
      const res = await connectionsApi.getSchema(id)
      setSchemas(s => ({ ...s, [id]: res.data.tables }))
    }
  }

  async function toggleWrites(c: typeof connections[number], e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const res = await connectionsApi.setAllowWrites(c.id, !c.allow_writes)
    const updated = connections.map(conn => conn.id === c.id ? res.data : conn)
    setConnections(updated)
    if (activeConnection?.id === c.id) setActiveConnection(res.data)
  }

  async function toggleSchema(id: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (expandedSchema === id) { setExpandedSchema(null); return }
    setExpandedSchema(id)
    if (!schemas[id]) {
      const res = await connectionsApi.getSchema(id)
      setSchemas(s => ({ ...s, [id]: res.data?.tables || {} }))
    }
  }

  function logout() { setToken(null); navigate('/login') }

  const navLink = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
    borderRadius: var_radius, fontSize: 13, fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--text)' : 'var(--text2)',
    background: isActive ? 'var(--surface3)' : 'transparent',
    textDecoration: 'none', transition: 'all 0.12s',
    borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
    marginLeft: -14, paddingLeft: 12,
  })

  const dbDot: Record<string, string> = { postgresql: '#60A5FA', mysql: '#FB923C', sqlite: '#34D399' }

  return (
    <aside style={S.sidebar}>
      {/* Brand */}
      <div style={S.brand}>
        <div style={S.logo}><Database size={14} color="#000" strokeWidth={2.5} /></div>
        <div>
          <div style={S.logoName}>BtalkToDB</div>
          <div style={S.logoSub}>AI Database Interface</div>
        </div>
      </div>

      <div style={S.divider} />

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0', paddingLeft: 14 }}>
        <NavLink to="/" end style={navLink}><LayoutDashboard size={14} />Dashboard</NavLink>
        <NavLink to="/query" style={navLink}><MessageSquare size={14} />Ask a question</NavLink>
        <NavLink to="/history" style={navLink}><History size={14} />Query history</NavLink>
      </nav>

      <div style={S.divider} />

      {/* Connections */}
      <div style={S.section}>
        <div style={S.sectionHead}>
          <span style={S.sectionLabel}>Connections</span>
          <button style={S.iconBtn} onClick={() => setShowAdd(!showAdd)} title="Add connection">
            <Plus size={12} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {connections.map(c => {
            const isActive = activeConnection?.id === c.id
            const isHov = hoveredConn === c.id
            const schemaOpen = expandedSchema === c.id
            const tableList = schemas[c.id] ? Object.entries(schemas[c.id]) : []

            return (
              <div key={c.id}>
                <div
                  onClick={() => setActiveConnection(c)}
                  onMouseEnter={() => setHoveredConn(c.id)}
                  onMouseLeave={() => setHoveredConn(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s',
                    background: isActive ? 'var(--surface3)' : isHov ? 'var(--surface2)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--border2)' : 'transparent'}`,
                  }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dbDot[c.db_type] || 'var(--text3)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      {c.allow_writes && <Pencil size={8} color="var(--warn)" />}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={c.masked_connection_string}>
                      {c.masked_connection_string || c.db_type}
                    </span>
                  </div>
                  {isHov && (
                    <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      <button style={S.iconBtn} onClick={e => toggleSchema(c.id, e)} title="Browse schema">
                        <Table2 size={10} />
                      </button>
                      <button style={{ ...S.iconBtn, color: c.allow_writes ? 'var(--warn)' : undefined }}
                        onClick={e => toggleWrites(c, e)}
                        title={c.allow_writes ? 'Writes on — click to disable' : 'Read-only — click to enable writes'}>
                        {c.allow_writes ? <Unlock size={10} /> : <Lock size={10} />}
                      </button>
                      <button style={S.iconBtn} onClick={e => refreshSchema(c.id, e)} title="Refresh schema">
                        <RefreshCw size={10} />
                      </button>
                      <button style={{ ...S.iconBtn, color: 'var(--danger)' }} onClick={e => deleteConn(c.id, e)} title="Remove">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Schema browser */}
                {schemaOpen && (
                  <div style={S.schemaBrowser}>
                    {tableList.length === 0
                      ? <p style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 8px' }}>Loading…</p>
                      : tableList.map(([tbl, info]) => (
                        <TableNode key={tbl} name={tbl} columns={info.columns} />
                      ))
                    }
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {connections.length === 0 && !showAdd && (
          <button onClick={() => setShowAdd(true)} style={S.addPrompt}>
            <Plus size={11} /> Add your first connection
          </button>
        )}

        {showAdd && (
          <div style={S.addForm}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>New connection</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>Name</label>
                <input placeholder="prod-db" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ fontSize: 12, padding: '7px 10px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>Database type</label>
                <select value={form.db_type} onChange={e => setForm({ ...form, db_type: e.target.value })} style={{ width: '100%', fontSize: 12 }}>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>Connection string</label>
                <textarea placeholder="postgresql://user:pass@host:5432/db" value={form.connection_string}
                  onChange={e => setForm({ ...form, connection_string: e.target.value })}
                  rows={2} style={{ resize: 'none', fontFamily: 'var(--mono)', fontSize: 10, padding: '7px 10px' }} />
              </div>
              <button type="button" onClick={() => setForm({ ...form, allow_writes: !form.allow_writes })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: form.allow_writes ? 'var(--warn-bg)' : 'var(--surface3)',
                  border: `1px solid ${form.allow_writes ? 'rgba(251,191,36,0.25)' : 'var(--border2)'}`,
                  borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                }}>
                {form.allow_writes ? <Unlock size={12} color="var(--warn)" /> : <Lock size={12} color="var(--text3)" />}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: form.allow_writes ? 'var(--warn)' : 'var(--text2)' }}>
                    {form.allow_writes ? 'Writes enabled' : 'Read-only'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {form.allow_writes ? 'INSERT/UPDATE/DELETE with confirm' : 'SELECT queries only'}
                  </div>
                </div>
              </button>
            </div>
            {addError && <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 8, padding: '6px 8px', background: 'var(--danger-bg)', borderRadius: 6 }}>{addError}</p>}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={addConnection} disabled={adding}>
                {adding ? 'Connecting…' : 'Connect'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setAddError('') }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <div style={S.divider} />
        <button style={S.logout} onClick={logout}>
          <LogOut size={13} />
          <span style={{ flex: 1 }}>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

function TableNode({ name, columns }: { name: string; columns: { name: string; type: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
        background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer',
        borderRadius: 5, color: 'var(--text2)', fontSize: 11, textAlign: 'left',
        transition: 'background 0.1s',
      }}>
        <Table2 size={10} color="var(--blue)" />
        <span style={{ flex: 1, fontFamily: 'var(--mono)', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 9, color: 'var(--text3)' }}>{columns.length}</span>
        {open ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
      </button>
      {open && (
        <div style={{ paddingLeft: 20, paddingBottom: 4 }}>
          {columns.map(col => (
            <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px' }}>
              <Columns3 size={8} color="var(--text3)" />
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{col.name}</span>
              <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>{col.type.split('(')[0].toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const var_radius = '8px'

const S: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 232, background: 'var(--surface)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', padding: '16px 14px 12px',
    flexShrink: 0, overflow: 'hidden',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', marginBottom: 16 },
  logo: {
    width: 30, height: 30, borderRadius: 8, background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: '0 0 12px var(--accent-glow)',
  },
  logoName: { fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', fontFamily: 'var(--display)', lineHeight: 1.2 },
  logoSub: { fontSize: 10, color: 'var(--text3)', letterSpacing: '0.02em', marginTop: 1 },
  divider: { height: 1, background: 'var(--border)', margin: '10px -14px' },
  section: { flex: 1, overflow: 'auto', paddingTop: 10 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 2px' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  iconBtn: { background: 'none', border: 'none', color: 'var(--text3)', padding: 3, borderRadius: 4, display: 'flex', cursor: 'pointer', transition: 'color 0.1s' },
  schemaBrowser: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, margin: '3px 0 3px 14px', padding: '4px 0', maxHeight: 200, overflow: 'auto' },
  addPrompt: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    background: 'transparent', border: '1px dashed var(--border2)',
    color: 'var(--text3)', fontSize: 11, padding: '8px 10px', borderRadius: 8,
    cursor: 'pointer', marginTop: 6, transition: 'all 0.12s',
  },
  addForm: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, padding: 12, marginTop: 8 },
  logout: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', width: '100%',
    borderRadius: 8, background: 'none', border: 'none', color: 'var(--text2)',
    fontSize: 12, marginTop: 4, transition: 'all 0.12s', cursor: 'pointer',
  },
}
