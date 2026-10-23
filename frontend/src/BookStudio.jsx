import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, BookPlus, ChevronLeft, Eye, EyeOff, ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { studio, uploadCover } from './api'
import './BookStudio.css'

const wordCount = (text) => (text.trim().match(/\S+/g) || []).length

function Cover({ book, size = 56 }) {
  return book.image ? (
    <img className="studio-cover" src={book.image} alt="" style={{ width: size, height: size * 1.4 }} />
  ) : (
    <span className="studio-cover studio-cover--empty" style={{ width: size, height: size * 1.4 }}>
      {(book.title || '?').charAt(0).toUpperCase()}
    </span>
  )
}

function BookForm({ initial, defaultAuthor, saving, onSubmit, onCancel, toast }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    author: initial?.author || defaultAuthor || '',
    genre: initial?.genre || '',
    image: initial?.image || '',
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const pickCover = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadCover(file)
      setForm((current) => ({ ...current, image: url }))
    } catch (error) {
      toast?.(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(form)
      }}
    >
      <div className="studio-cover-pick">
        <Cover book={form} size={72} />
        <div>
          <button type="button" className="text-button" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={15} /> {uploading ? 'Uploading…' : form.image ? 'Change cover' : 'Add a cover'}
          </button>
          <small>JPG, PNG or WebP, up to 2 MB</small>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickCover} />
        </div>
      </div>
      <label>
        Title
        <input value={form.title} maxLength={180} required onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label>
        Author
        <input value={form.author} maxLength={140} required onChange={(e) => setForm({ ...form, author: e.target.value })} />
      </label>
      <label>
        Genre <small>(optional)</small>
        <input value={form.genre} maxLength={80} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Devotional, Memoir, Fiction…" />
      </label>
      <div className="studio-form-actions">
        <button className="primary-button" disabled={saving || uploading}>{saving ? 'Saving…' : initial ? 'Save details' : 'Create book'}</button>
        {onCancel && <button type="button" className="text-button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

function ChapterEditor({ chapter, saving, onSubmit, onCancel }) {
  const [title, setTitle] = useState(chapter?.title || '')
  const [body, setBody] = useState(chapter?.body || '')
  return (
    <form
      className="studio-form studio-chapter-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ title, body })
      }}
    >
      <label>
        Chapter title
        <input value={title} maxLength={180} required onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1: The Beginning" />
      </label>
      <label>
        Chapter text
        <textarea value={body} rows={12} required maxLength={100000} onChange={(e) => setBody(e.target.value)} placeholder="Write here. Leave a blank line between paragraphs." />
        <small>{wordCount(body).toLocaleString()} words</small>
      </label>
      <div className="studio-form-actions">
        <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : chapter ? 'Save chapter' : 'Add chapter'}</button>
        {onCancel && <button type="button" className="text-button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

function BookEditor({ book: initial, onBack, onChanged, toast }) {
  const [book, setBook] = useState(initial)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null) // chapter id | 'new' | null
  const [detailsOpen, setDetailsOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await studio.chapters(initial.id)
      setChapters(result.chapters || [])
    } catch (error) {
      toast?.(error.message)
    } finally {
      setLoading(false)
    }
  }, [initial.id, toast])

  useEffect(() => {
    load()
  }, [load])

  const run = async (action, success) => {
    setSaving(true)
    try {
      const result = await action()
      if (success) toast?.(success)
      return result ?? true
    } catch (error) {
      toast?.(error.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveDetails = async (form) => {
    const updated = await run(() => studio.updateBook(book.id, form), 'Book details saved')
    if (updated) {
      setBook(updated)
      setDetailsOpen(false)
      onChanged?.()
    }
  }

  const saveChapter = async (fields) => {
    const ok = await run(
      () => (editing === 'new' ? studio.addChapter(book.id, fields) : studio.updateChapter(editing, fields)),
      editing === 'new' ? 'Chapter added' : 'Chapter saved',
    )
    if (ok) {
      setEditing(null)
      await load()
    }
  }

  const removeChapter = async (chapter) => {
    if (!window.confirm(`Delete "${chapter.title}"? This cannot be undone.`)) return
    if (await run(() => studio.deleteChapter(chapter.id), 'Chapter deleted')) await load()
  }

  const move = async (chapter, direction) => {
    if (await run(() => studio.moveChapter(chapter.id, direction))) await load()
  }

  const togglePublish = async () => {
    const updated = await run(
      () => studio.updateBook(book.id, { published: !book.published }),
      book.published ? 'Book is now a draft' : 'Book published',
    )
    if (updated) {
      setBook(updated)
      onChanged?.()
    }
  }

  return (
    <div className="studio-editor">
      <button className="text-button" onClick={onBack}><ChevronLeft size={15} /> All my books</button>
      <header className="studio-editor-head">
        <Cover book={book} size={64} />
        <div>
          <span className={`writers-badge ${book.published ? 'published' : 'draft'}`}>{book.published ? 'Published' : 'Draft'}</span>
          <h2>{book.title}</h2>
          <p>{book.author}{book.genre ? ` · ${book.genre}` : ''}</p>
        </div>
        <div className="studio-editor-actions">
          <button className="text-button" onClick={() => setDetailsOpen((open) => !open)}><Pencil size={14} /> Details</button>
          <button className="primary-button" disabled={saving} onClick={togglePublish}>
            {book.published ? <><EyeOff size={15} /> Unpublish</> : <><Eye size={15} /> Publish</>}
          </button>
        </div>
      </header>

      {detailsOpen && (
        <BookForm initial={book} saving={saving} onSubmit={saveDetails} onCancel={() => setDetailsOpen(false)} toast={toast} />
      )}

      <div className="section-heading">
        <div><span className="eyebrow">THE TEXT</span><h3>Chapters</h3></div>
        {editing !== 'new' && (
          <button className="primary-button writers-new" onClick={() => setEditing('new')}><BookPlus size={16} /> Add chapter</button>
        )}
      </div>

      {editing === 'new' && <ChapterEditor saving={saving} onSubmit={saveChapter} onCancel={() => setEditing(null)} />}
      {loading && <p className="empty-note">Loading chapters…</p>}
      {!loading && chapters.length === 0 && editing !== 'new' && (
        <p className="empty-note">No chapters yet. Add your first one to start the book.</p>
      )}

      <ol className="studio-chapters">
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            {editing === chapter.id ? (
              <ChapterEditor chapter={chapter} saving={saving} onSubmit={saveChapter} onCancel={() => setEditing(null)} />
            ) : (
              <div className="studio-chapter-row">
                <div>
                  <strong>{chapter.title}</strong>
                  <small>{wordCount(chapter.body).toLocaleString()} words</small>
                </div>
                <div className="writers-actions studio-row-actions">
                  <button className="text-button" disabled={index === 0 || saving} onClick={() => move(chapter, 'up')} aria-label="Move up"><ArrowUp size={14} /></button>
                  <button className="text-button" disabled={index === chapters.length - 1 || saving} onClick={() => move(chapter, 'down')} aria-label="Move down"><ArrowDown size={14} /></button>
                  <button className="text-button" onClick={() => setEditing(chapter.id)}><Pencil size={14} /> Edit</button>
                  <button className="text-button danger" onClick={() => removeChapter(chapter)}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function BookStudio({ defaultAuthor = '', toast, onChanged }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState(null) // null | 'new' | book
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setError('')
      const result = await studio.myBooks()
      setBooks(result.books || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (form) => {
    setSaving(true)
    try {
      const book = await studio.createBook(form)
      toast?.('Book created. Add your chapters next.')
      await load()
      onChanged?.()
      setView(book)
    } catch (err) {
      toast?.(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (book) => {
    if (!window.confirm(`Delete "${book.title}" and all its chapters? This cannot be undone.`)) return
    try {
      await studio.deleteBook(book.id)
      toast?.('Book deleted')
      await load()
      onChanged?.()
    } catch (err) {
      toast?.(err.message)
    }
  }

  if (view && view !== 'new') {
    return (
      <section className="studio">
        <BookEditor
          book={view}
          toast={toast}
          onBack={() => { setView(null); load() }}
          onChanged={() => { load(); onChanged?.() }}
        />
      </section>
    )
  }

  return (
    <section className="studio">
      <div className="section-heading">
        <div><span className="eyebrow">YOUR BOOKS</span><h2>My books</h2></div>
        {view !== 'new' && (
          <button className="primary-button writers-new" onClick={() => setView('new')}><BookPlus size={16} /> New book</button>
        )}
      </div>

      {view === 'new' && (
        <BookForm defaultAuthor={defaultAuthor} saving={saving} onSubmit={create} onCancel={() => setView(null)} toast={toast} />
      )}
      {error && <p className="writers-error" role="alert">{error}</p>}
      {loading && <p className="empty-note">Loading your books…</p>}
      {!loading && !error && books.length === 0 && view !== 'new' && (
        <p className="empty-note">You have not created a book yet. Start one and add chapters.</p>
      )}

      <div className="writers-list">
        {books.map((book) => (
          <article key={book.id} className="writers-row studio-book-row">
            <Cover book={book} />
            <div className="studio-book-info">
              <span className={`writers-badge ${book.published ? 'published' : 'draft'}`}>{book.published ? 'Published' : 'Draft'}</span>
              <h3>{book.title}</h3>
              <small>{book.author}{book.genre ? ` · ${book.genre}` : ''}</small>
            </div>
            <div className="writers-actions">
              <button className="text-button" onClick={() => setView(book)}><Pencil size={14} /> Open</button>
              <button className="text-button danger" onClick={() => remove(book)}><Trash2 size={14} /> Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
