import { useCallback, useEffect, useState } from 'react'
import { Feather, PenLine, Trash2, Send, Pencil, Users } from 'lucide-react'
import { writer } from './api'
import BookStudio from './BookStudio'
import './Writers.css'

export default function WritersView({ defaultName = '', onWrite, onEdit, onChanged, onBooksChanged, toast, version }) {
  const [state, setState] = useState({ loading: true, isWriter: false, profile: null })
  const [stats, setStats] = useState(null)
  const [mine, setMine] = useState([])
  const [directory, setDirectory] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: defaultName, bio: '' })
  const [joining, setJoining] = useState(false)
  const [tab, setTab] = useState('All')

  const load = useCallback(async () => {
    try {
      setError('')
      const [profile, directoryResult] = await Promise.all([writer.profile(), writer.directory()])
      setDirectory(directoryResult.writers || [])
      setState({ loading: false, isWriter: profile.isWriter, profile: profile.profile })
      if (profile.isWriter) {
        const [statsResult, storiesResult] = await Promise.all([writer.stats(), writer.stories()])
        setStats(statsResult)
        setMine(storiesResult.stories || [])
      }
    } catch (err) {
      setState((current) => ({ ...current, loading: false }))
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, version])

  const join = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return toast?.('Add the name you want to write under')
    setJoining(true)
    try {
      await writer.join({ name: form.name.trim(), bio: form.bio.trim() })
      toast?.('Welcome to the writers')
      await load()
    } catch (err) {
      toast?.(err.message)
    } finally {
      setJoining(false)
    }
  }

  const publish = async (story) => {
    try {
      await writer.update(story.id, { title: story.title, content: story.content, status: 'published' })
      toast?.('Story published')
      await load()
      onChanged?.()
    } catch (err) {
      toast?.(err.message)
    }
  }

  const remove = async (story) => {
    if (!window.confirm(`Delete "${story.title}"? This cannot be undone.`)) return
    try {
      await writer.remove(story.id)
      toast?.('Story deleted')
      await load()
      onChanged?.()
    } catch (err) {
      toast?.(err.message)
    }
  }

  if (state.loading) return <p className="empty-note">Loading the writers’ room…</p>

  const shown = mine.filter((story) => tab === 'All' || (tab === 'Drafts' ? story.status === 'draft' : story.status === 'published'))

  return (
    <section className="writers">
      <header className="writers-hero">
        <span className="eyebrow">FOR WRITERS</span>
        <h1>{state.isWriter ? `Your desk, ${state.profile?.name}` : 'Write for Rooted'}</h1>
        <p>
          {state.isWriter
            ? 'Draft in private, publish when it is ready, and see how your words are received.'
            : 'Share essays and reflections with the community. Drafts stay private until you publish.'}
        </p>
      </header>

      {error && <p className="writers-error" role="alert">{error}</p>}

      {!state.isWriter && !error && (
        <form className="writers-join" onSubmit={join}>
          <label>
            Name you write under
            <input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
          </label>
          <label>
            Short bio <small>(optional)</small>
            <textarea value={form.bio} maxLength={400} rows={3} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A sentence or two about you" />
          </label>
          <button className="primary-button" disabled={joining}>
            <Feather size={16} /> {joining ? 'Joining…' : 'Become a writer'}
          </button>
        </form>
      )}

      {state.isWriter && (
        <>
          <div className="writers-stats">
            {[
              ['Published', stats?.published ?? 0],
              ['Drafts', stats?.drafts ?? 0],
              ['Likes', stats?.likes ?? 0],
              ['Words written', (stats?.words ?? 0).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="writers-stat"><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>

          <div className="section-heading">
            <div><span className="eyebrow">YOUR WORDS</span><h2>My stories</h2></div>
            <button className="primary-button writers-new" onClick={onWrite}><PenLine size={16} /> New story</button>
          </div>

          <div className="writers-tabs" role="tablist">
            {['All', 'Drafts', 'Published'].map((item) => (
              <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</button>
            ))}
          </div>

          {shown.length === 0 && <p className="empty-note">{mine.length ? 'Nothing here yet.' : 'You have not written anything yet. Start your first story.'}</p>}
          <div className="writers-list">
            {shown.map((story) => (
              <article key={story.id} className="writers-row">
                <div>
                  <span className={`writers-badge ${story.status}`}>{story.status === 'draft' ? 'Draft' : 'Published'}</span>
                  <h3>{story.title}</h3>
                  <p>{story.excerpt || 'No excerpt yet.'}</p>
                  <small>{story.read_time} min read · {story.likes || 0} likes</small>
                </div>
                <div className="writers-actions">
                  <button className="text-button" onClick={() => onEdit?.(story)}><Pencil size={14} /> Edit</button>
                  {story.status === 'draft' && <button className="text-button" onClick={() => publish(story)}><Send size={14} /> Publish</button>}
                  <button className="text-button danger" onClick={() => remove(story)}><Trash2 size={14} /> Delete</button>
                </div>
              </article>
            ))}
          </div>

          <BookStudio defaultAuthor={state.profile?.name || defaultName} toast={toast} onChanged={onBooksChanged} />
        </>
      )}

      <div className="section-heading writers-dir-heading">
        <div><span className="eyebrow">THE COMMUNITY</span><h2>Writers on Rooted</h2></div>
      </div>
      {directory.length === 0 && <p className="empty-note">No writers yet. Be the first.</p>}
      <div className="writers-directory">
        {directory.map((person) => (
          <article key={person.name} className="writers-card">
            <span className="avatar">{person.name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{person.name}</strong>
              {person.bio && <p>{person.bio}</p>}
              <small><Users size={12} /> {person.stories} {person.stories === 1 ? 'story' : 'stories'} · {person.likes} likes</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
