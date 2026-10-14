import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Bookmark, BookOpen, ChevronRight, Flame, Heart, Home, Library, Menu, PenLine, Plus, Search, Send, Sparkles, Users, X } from 'lucide-react'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { api } from './api'
import './styles.css'

const defaultBooks = [
  { title: 'The Practice of Presence', author: 'John Mark Comer', tag: 'SPIRITUAL FORMATION', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=500&q=80', progress: 68, color: 'terracotta' },
  { title: 'The Ruthless Elimination of Hurry', author: 'John Mark Comer', tag: 'FORMATION', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80', progress: 32, color: 'sage' },
  { title: 'Every Good Endeavor', author: 'Timothy Keller', tag: 'WORK & CALLING', image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80', progress: 12, color: 'plum' },
]

const defaultClubs = [
  { title: 'Faith & Fiction', book: 'The Midnight Library', members: '4 / 5', time: 'starts in 2 days', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80' },
  { title: 'The Quiet Life', book: 'The Ruthless Elimination of Hurry', members: '5 / 5', time: 'reading now', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80' },
]

const defaultStories = [
  { title: 'On prayer when words fail', author: 'Dami Adeyemi', readTime: 4, likes: 12, excerpt: 'Some prayers are only silence.' },
  { title: 'A field guide to holy friendship', author: 'Paps O.', readTime: 5, likes: 8, excerpt: 'Friendship as a spiritual discipline.' },
  { title: 'The table is bigger than we thought', author: 'Ifeoluwa A.', readTime: 6, likes: 21, excerpt: 'On hospitality and belonging.' },
]

const verses = [
  { text: '“Be still, and know.”', ref: 'Psalm 46:10' },
  { text: '“Love the Lord your God with all your heart.”', ref: 'Matthew 22:37' },
  { text: '“For I know the plans I have for you.”', ref: 'Jeremiah 29:11' },
  { text: '“The Lord is my shepherd; I shall not want.”', ref: 'Psalm 23:1' },
  { text: '“Walk by faith, not by sight.”', ref: '2 Corinthians 5:7' },
  { text: '“Be strong and courageous.”', ref: 'Joshua 1:9' },
  { text: '“Grace be with you all.”', ref: 'Galatians 6:18' },
]

const genres = ['Spiritual formation', 'Fantasy', 'Mystery', 'Romance', 'Memoir', 'Poetry', 'Horror']

const genreSignals = {
  Romance: ['love', 'heart', 'kiss', 'wedding', 'beloved'],
  Mystery: ['clue', 'secret', 'murder', 'detective', 'truth'],
  Thriller: ['danger', 'escape', 'threat', 'chase', 'fear'],
  Fantasy: ['magic', 'kingdom', 'dragon', 'spell', 'enchanted'],
  'Science fiction': ['planet', 'robot', 'space', 'future', 'orbit'],
  Memoir: ['remember', 'childhood', 'my mother', 'my father', 'years ago'],
  Poetry: ['river', 'moon', 'silence', 'wild', 'dream'],
  'Spiritual formation': ['prayer', 'grace', 'faith', 'God', 'soul'],
  Biography: ['born', 'career', 'worked', 'life of', 'legacy'],
  Horror: ['ghost', 'darkness', 'blood', 'haunted', 'scream'],
}

function organizeByGenre(text) {
  return text
    .split(/\n+/)
    .map((section, index) => {
      const normalized = section.toLowerCase()
      const match = Object.entries(genreSignals).find(([, words]) =>
        words.some((word) => normalized.includes(word.toLowerCase())),
      )
      return {
        section: section.trim() || `Section ${index + 1}`,
        genre: match?.[0] || 'Literary fiction',
      }
    })
    .filter(({ section }) => section)
}

function App() {
  const [active, setActive] = useState('Home')
  const [writerOpen, setWriterOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState(defaultBooks)
  const [clubs, setClubs] = useState(defaultClubs)
  const [stories, setStories] = useState(defaultStories)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [remoteBooks, remoteClubs, remoteStories] = await Promise.all([
          api.getBooks(),
          api.getClubs(),
          api.getStories(),
        ])
        if (cancelled) return
        if (remoteBooks.length) setBooks(remoteBooks)
        if (remoteClubs.length) setClubs(remoteClubs)
        if (remoteStories.length) setStories(remoteStories)
      } catch {
        // Backend unavailable — keep the bundled defaults.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const toast = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  const navItems = [
    { label: 'Home', icon: Home },
    { label: 'Library', icon: Library },
    { label: 'Book clubs', icon: Users },
    { label: 'Stories', icon: PenLine },
    { label: 'Preview', icon: BookOpen },
  ]

  const dailyVerse = verses[new Date().getDate() % verses.length]

  const handleSearch = (q) => {
    if (!q.trim()) return
    setActive('Library')
    toast(`Searching for "${q}"...`)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActive('Home')}>
          <span className="brand-mark">R</span>
          <span>ROOTED</span>
        </button>

        <div className="top-actions">
          <label className="search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch(query)}
              placeholder="Search books, stories, people"
            />
          </label>
          <button className="icon-button mobile-menu" aria-label="Menu">
            <Menu size={20} />
          </button>
          <button className="avatar" aria-label="Open profile">M</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="welcome">
            <span className="eyebrow">GOOD MORNING, MIGHTY</span>
            <h2>
              Make room
              <br />
              <em>for wonder.</em>
            </h2>
          </div>

          <nav>
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={active === label ? 'nav-item active' : 'nav-item'}
                onClick={() => setActive(label)}
              >
                <Icon size={18} />
                {label}
                <ChevronRight className="nav-arrow" size={15} />
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="streak">
              <div className="streak-icon">
                <Flame size={19} />
              </div>
              <div>
                <strong>12 day streak</strong>
                <span>Keep showing up</span>
              </div>
              <span className="streak-count">12</span>
            </div>
            <button className="write-button" onClick={() => setWriterOpen(true)}>
              <Plus size={17} />
              Start writing
            </button>
            <span className="version">ROOTED / BETA · SEPT 2026</span>
          </div>
        </aside>

        <main className="main-content">
          {active === 'Home' && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow coral">YOUR DAILY INVITATION</span>
                  <h1>
                    Read deeply.<br />
                    <em>Live fully.</em>
                  </h1>
                  <p>
                    A thoughtful place for Christian books, honest stories, and the people reading alongside you.
                  </p>
                  <button className="primary-button" onClick={() => setActive('Library')}>
                    Explore the library <ChevronRight size={17} />
                  </button>
                </div>

                <div className="hero-art">
                  <HeroBook3D />
                  <div className="art-label">
                    {dailyVerse.text}
                    <span>{dailyVerse.ref}</span>
                  </div>
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">CONTINUE READING</span>
                    <h2>Pick up where you left off</h2>
                  </div>
                  <button className="text-button" onClick={() => setActive('Library')}>
                    View library <ChevronRight size={16} />
                  </button>
                </div>

                <div className="book-grid">
                  {books.map((book) => (
                    <BookCard
                      key={book.title}
                      book={book}
                      onSave={() => toast(`${book.title} saved to your library`)}
                    />
                  ))}
                </div>
              </section>

              <section className="lower-grid">
                <div className="section-block clubs-block">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">READING TOGETHER</span>
                      <h2>Find your people</h2>
                    </div>
                    <button className="text-button" onClick={() => setActive('Book clubs')}>
                      All clubs <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="club-list">
                    {clubs.map((club) => (
                      <ClubCard
                        key={club.title}
                        club={club}
                        onJoin={() => toast(`Request sent to ${club.title}`)}
                      />
                    ))}
                  </div>
                </div>

                <aside className="quote-card">
                  <Sparkles size={19} />
                  <p>“We are what we repeatedly do. Excellence, then, is not an act, but a habit.”</p>
                  <span>— Will Durant</span>
                  <div className="quote-dots">
                    <i />
                    <i className="selected" />
                    <i />
                  </div>
                </aside>
              </section>
            </>
          )}

          {active === 'Library' && (
            <LibraryView books={books} onSave={() => toast('Saved to your library')} />
          )}
          {active === 'Book clubs' && (
            <ClubsView clubs={clubs} onJoin={() => toast('Request sent to the book club')} />
          )}
          {active === 'Stories' && (
            <StoriesView stories={stories} onWrite={() => setWriterOpen(true)} />
          )}
          {active === 'Preview' && <BookPreview books={books} />}
        </main>
      </div>

      {writerOpen && (
        <WriterModal
          onClose={() => setWriterOpen(false)}
          onPublish={async ({ title, body }) => {
            setWriterOpen(false)
            const readTime = Math.max(1, Math.round(body.split(/\s+/).length / 200))
            const story = {
              title: title || 'Untitled story',
              author: 'Mighty',
              content: body,
              excerpt: body.slice(0, 140),
              readTime,
            }
            try {
              const saved = await api.addStory(story)
              setStories((current) => [saved, ...current])
              toast('Your story has been published')
            } catch {
              setStories((current) => [{ ...story, likes: 0 }, ...current])
              toast('Saved locally — backend unavailable')
            }
          }}
        />
      )}

      {notice && (
        <div className="toast">
          <Heart size={16} fill="currentColor" />
          {notice}
        </div>
      )}
    </div>
  )
}

function HeroBook3D() {
  const mountRef = useRef(null)

  useLayoutEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0.15, 5.5)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x160b08, 0.035)
    mount.appendChild(renderer.domElement)

    const book = new THREE.Group()
    book.rotation.set(-0.28, -0.46, -0.12)
    scene.add(book)

    const leather = new THREE.MeshStandardMaterial({ color: 0x6f3022, roughness: 0.72, metalness: 0.08 })
    const leatherDark = new THREE.MeshStandardMaterial({ color: 0x3a1e19, roughness: 0.8 })
    const paper = new THREE.MeshStandardMaterial({ color: 0xe9d5ae, roughness: 0.95 })

    const coverGeometry = new THREE.BoxGeometry(2.55, 0.12, 1.78)
    const pageGeometry = new THREE.BoxGeometry(2.32, 0.34, 1.58)
    const coverTop = new THREE.Mesh(coverGeometry, leather)
    coverTop.position.y = 0.27
    book.add(coverTop)

    const coverBottom = new THREE.Mesh(coverGeometry, leatherDark)
    coverBottom.position.y = -0.27
    book.add(coverBottom)

    const pages = new THREE.Mesh(pageGeometry, paper)
    book.add(pages)

    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 1.78), leatherDark)
    spine.position.x = -1.22
    book.add(spine)

    const ribbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.07, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xb54632 }),
    )
    ribbon.position.set(0.45, 0.48, 0)
    ribbon.rotation.z = -0.16
    book.add(ribbon)

    const light = new THREE.DirectionalLight(0xffe8c6, 4)
    light.position.set(-3, 4, 5)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0x8b5a42, 1.4))

    const pointer = { x: 0, y: 0 }
    const startedAt = performance.now()
    let frame = 0

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect()
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const move = (event) => {
      const bounds = mount.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
      pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
    }

    const animate = () => {
      const elapsed = (performance.now() - startedAt) / 1000
      book.rotation.y += (pointer.x * 0.22 - book.rotation.y + 0.46) * 0.035
      book.rotation.x += (pointer.y * -0.12 - book.rotation.x + 0.28) * 0.035
      book.position.y = Math.sin(elapsed * 1.35) * 0.1
      ribbon.rotation.z = -0.16 + Math.sin(elapsed) * 0.025
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    mount.addEventListener('pointermove', move)
    animate()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      mount.removeEventListener('pointermove', move)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="hero-3d" aria-label="Floating three dimensional leather book" />
}

function BookCard({ book, onSave, onOpen }) {
  return (
    <article className="book-card" onClick={() => onOpen?.(book)}>
      <div className={`book-cover ${book.color}`}>
        <img src={book.image} alt="" />
        <span className="cover-tag">{book.tag}</span>
        <button
          className="save-button"
          onClick={(event) => {
            event.stopPropagation()
            onSave?.()
          }}
          aria-label="Save book"
        >
          <Bookmark size={17} />
        </button>
      </div>
      <div className="book-info">
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <div className="progress-row">
          <div className="progress">
            <span style={{ width: `${book.progress}%` }} />
          </div>
          <small>{book.progress}%</small>
        </div>
      </div>
    </article>
  )
}

function ClubCard({ club, onJoin }) {
  return (
    <article className="club-card">
      <img src={club.image} alt="" />
      <div className="club-details">
        <span className="eyebrow">SMALL GROUP</span>
        <h3>{club.title}</h3>
        <p>{club.book}</p>
        <div className="club-meta">
          <span>
            <Users size={14} />
            {club.members}
          </span>
          <span>{club.time}</span>
        </div>
      </div>
      <button className="join-button" onClick={onJoin}>Join</button>
    </article>
  )
}

function LibraryView({ books = defaultBooks, onSave, onOpen }) {
  const [filter, setFilter] = useState('For you')

  const catalog = books.concat([
    { ...books[0], title: 'The Cost of Discipleship', author: 'Dietrich Bonhoeffer', color: 'ochre', progress: 0, tag: 'NON-FICTION' },
  ])

  const filtered =
    filter === 'For you'
      ? catalog
      : catalog.filter((book) => {
          const tag = (book.tag || '').toUpperCase()
          if (filter === 'Fiction') return tag === 'FICTION'
          if (filter === 'Non-fiction') return tag === 'NON-FICTION'
          if (filter === 'Spiritual formation') return ['SPIRITUAL FORMATION', 'FORMATION'].includes(tag)
          return true
        })

  return (
    <div className="view">
      <div className="view-heading">
        <div>
          <span className="eyebrow coral">THE LIBRARY</span>
          <h1>Books to live with.</h1>
          <p>Curated Christian fiction, formation, and good questions.</p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            onOpen?.({
              title: 'A new recommendation',
              author: 'Rooted editorial desk',
              image: books[0].image,
              tag: 'COMING SOON',
              color: 'ochre',
              progress: 0,
            })
          }
        >
          <Plus size={17} />
          Suggest a book
        </button>
      </div>

      <div className="filter-row">
        {['For you', 'Fiction', 'Non-fiction', 'Spiritual formation'].map((item) => (
          <button
            key={item}
            className={filter === item ? 'filter active' : 'filter'}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="library-grid">
        {filtered.map((book, index) => (
          <BookCard key={`${book.title}-${index}`} book={book} onSave={onSave} onOpen={onOpen} />
        ))}
      </div>

      {filtered.length === 0 && <div className="empty-library">No books in this shelf yet. Try another genre.</div>}
    </div>
  )
}

function ClubsView({ clubs = defaultClubs, onJoin }) {
  const catalog = clubs.concat([
    { ...clubs[0], title: 'Women of the Word', book: 'The Hiding Place' },
  ])

  return (
    <div className="view">
      <div className="view-heading">
        <div>
          <span className="eyebrow coral">BOOK CLUBS</span>
          <h1>Read alongside others.</h1>
          <p>Five people, one book, a richer conversation.</p>
        </div>
        <button className="primary-button">
          <Plus size={17} />
          Create a club
        </button>
      </div>

      <div className="club-list wide">
        {catalog.map((club, index) => (
          <ClubCard key={`${club.title}-${index}`} club={club} onJoin={onJoin} />
        ))}
      </div>
    </div>
  )
}

function StoriesView({ stories = defaultStories, onWrite }) {
  return (
    <>
      <div className="view">
        <div className="view-heading">
          <div>
            <span className="eyebrow coral">THE STORY ROOM</span>
            <h1>Words that stay.</h1>
            <p>Notes, chapters, and honest stories from the Rooted community.</p>
          </div>
          <button className="primary-button" onClick={onWrite}>
            <PenLine size={17} />
            Start writing
          </button>
        </div>

        <div className="story-feature">
          <div className="story-image" />
          <div>
            <span className="eyebrow">FEATURED STORY · 8 MIN READ</span>
            <h2>The grace of beginning again</h2>
            <p>“Some seasons ask us to grow quietly. This one taught me that quiet growth is still growth.”</p>
            <div className="story-author">
              <span className="avatar small">A</span>
              <span>
                <strong>Amara Okafor</strong>
                <small>3 days ago · 14 responses</small>
              </span>
            </div>
          </div>
        </div>

        <div className="story-list">
          <div>
            <span className="eyebrow">FROM THE COMMUNITY</span>
            <h2>Freshly published</h2>
          </div>
          {stories.map((story, index) => (
            <article className="story-row" key={`${story.title}-${index}`}>
              <span className="story-number">0{index + 1}</span>
              <div>
                <h3>{story.title}</h3>
                <p>{story.author} · {story.readTime || index + 4} min read</p>
              </div>
              <Heart size={18} />
            </article>
          ))}
        </div>
      </div>

      <PublicationHub />
      <GenreOrganizer />
    </>
  )
}

function WriterModal({ onClose, onPublish }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleTextChange = (updater) => {
    updater()
    setIsSaving(true)
    window.setTimeout(() => setIsSaving(false), 1000)
  }

  return (
    <div className="modal-backdrop">
      <div className="writer-modal">
        <div className="writer-toolbar">
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
          <span className="writer-brand">ROOTED / WRITE</span>
          <span className="writer-save-state">{isSaving ? 'Saving...' : 'Saved privately'}</span>
          <button className="primary-button" onClick={() => onPublish({ title, body })}>
            <Send size={16} />
            Publish draft
          </button>
        </div>

        <main className="full-page-editor">
          <span className="eyebrow coral">NEW STORY</span>
          <input
            className="editor-title"
            placeholder="Untitled story"
            value={title}
            onChange={(event) => handleTextChange(() => setTitle(event.target.value))}
            autoFocus
          />
          <textarea
            className="editor-body"
            placeholder="Begin writing here..."
            value={body}
            onChange={(event) => handleTextChange(() => setBody(event.target.value))}
            rows="18"
          />
        </main>
      </div>
    </div>
  )
}

function PublicationHub() {
  const [tab, setTab] = useState('Reader')
  const [playing, setPlaying] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  const readerPosts = [
    { title: 'The grace of beginning again', meta: 'Amara Okafor · 8 min read', type: 'Essay' },
    { title: 'A field guide to holy friendship', meta: 'Paps O. · 5 min read', type: 'Audio' },
    { title: 'What we carry to the table', meta: 'Dami Adeyemi · 11 min read', type: 'Video' },
  ]

  return (
    <section className="publication-hub">
      <div className="hub-tabs">
        {['Reader', 'Notes', 'Studio', 'Chat'].map((item) => (
          <button
            key={item}
            className={tab === item ? 'hub-tab active' : 'hub-tab'}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Reader' && (
        <div className="reader-feed">
          <div className="feed-header">
            <div>
              <span className="eyebrow coral">YOUR INBOX</span>
              <h2>Read from everywhere.</h2>
              <p>Newsletters, audio, and video gathered in one quiet place.</p>
            </div>
            <span className="unread-count">3 unread</span>
          </div>

          {readerPosts.map((post) => (
            <article className="feed-post" key={post.title}>
              <div>
                <span className="post-type">{post.type}</span>
                <h3>{post.title}</h3>
                <p>{post.meta}</p>
              </div>
              <button className="text-button">
                Open <ChevronRight size={15} />
              </button>
            </article>
          ))}

          <div className="audio-player">
            <button className="audio-play" onClick={() => setPlaying(!playing)}>
              {playing ? '||' : '▶'}
            </button>
            <div>
              <strong>{playing ? 'Playing narration' : 'Listen to your reading list'}</strong>
              <span>AI narration · Warm voice · 12 min</span>
            </div>
            <span className="audio-progress">{playing ? '02:18' : '00:00'} / 12:00</span>
          </div>
        </div>
      )}

      {tab === 'Notes' && (
        <div className="notes-feed">
          <div className="feed-header">
            <div>
              <span className="eyebrow coral">NOTES</span>
              <h2>Small thoughts, wide reach.</h2>
              <p>Share a line, a question, or a discovery with your readers.</p>
            </div>
            <button className="primary-button note-button" onClick={() => setSent(true)}>
              <Send size={15} />
              Post note
            </button>
          </div>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What are you thinking about?"
            className="note-composer"
          />

          {sent && <div className="note-sent">Your note is now in the discovery feed.</div>}

          <div className="note-card">
            <span className="avatar small">A</span>
            <div>
              <strong>Amara Okafor</strong>
              <p>“Some seasons ask us to grow quietly. Quiet growth is still growth.”</p>
              <span>♡ 24 · ↗ 6 replies · 2h</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function GenreOrganizer() {
  const [story, setStory] = useState('')
  const [sections, setSections] = useState([])

  const analyze = () => setSections(organizeByGenre(story))

  return (
    <section className="genre-organizer">
      <div className="organizer-heading">
        <div>
          <span className="eyebrow coral">WRITER'S ASSISTANT</span>
          <h2>Let the story find its shelf.</h2>
          <p>Paste a draft and Rooted will suggest a genre for each section.</p>
        </div>
        <span className="ai-badge">
          <Sparkles size={14} />
          AUTONOMOUS AI
        </span>
      </div>

      <div className="genre-catalog">
        {genres.map((genre) => (
          <span key={genre}>{genre}</span>
        ))}
      </div>

      <div className="organizer-workspace">
        <textarea
          value={story}
          onChange={(event) => setStory(event.target.value)}
          placeholder="Paste or write sections of your story here... Use a new line for each section."
          aria-label="Story sections for genre organization"
        />

        <div className="organizer-results">
          {sections.length === 0 ? (
            <div className="organizer-empty">
              <Sparkles size={18} />
              <span>Your suggested genres will appear here.</span>
            </div>
          ) : (
            sections.map(({ section, genre }, index) => (
              <article className="genre-result" key={`${section}-${index}`}>
                <span>0{index + 1}</span>
                <div>
                  <p>{section}</p>
                  <strong>{genre}</strong>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <button className="primary-button organize-button" onClick={analyze} disabled={!story.trim()}>
        <Sparkles size={16} />
        Organize my story
      </button>
    </section>
  )
}

function PreviewImageRail({ books = defaultBooks }) {
  const railRef = useRef(null)
  const cardsRef = useRef([])
  const drag = useRef({ active: false, start: 0, x: 0, velocity: 0 })
  const images = books.concat(books).map((book, index) => ({ ...book, id: `${book.title}-${index}` }))

  useLayoutEffect(() => {
    const rail = railRef.current
    const cards = cardsRef.current
    const state = drag.current

    const move = (event) => {
      if (!state.active) return
      const x = event.clientX ?? event.touches?.[0]?.clientX
      state.velocity = x - state.x
      state.x = x
      gsap.set(rail, { x: `+=${state.velocity}` })
    }

    const end = () => {
      if (!state.active) return
      state.active = false
      gsap.to(rail, { x: `+=${state.velocity * 7}`, duration: 1.3, ease: 'power3.out', overwrite: true })
      gsap.to(cards, { rotationY: 0, rotationZ: 0, duration: 0.7, stagger: 0.03, ease: 'elastic.out(1, .65)' })
    }

    const start = (event) => {
      state.active = true
      state.x = event.clientX ?? event.touches?.[0]?.clientX
      state.velocity = 0
      gsap.killTweensOf(rail)
      gsap.to(cards, { rotationY: 8, rotationZ: 1.2, duration: 0.25, stagger: 0.02, ease: 'power2.out' })
    }

    rail.addEventListener('pointerdown', start)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)

    return () => {
      rail.removeEventListener('pointerdown', start)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      gsap.killTweensOf([rail, cards])
    }
  }, [])

  return (
    <div className="preview-rail-viewport">
      <div ref={railRef} className="preview-image-rail">
        {images.map((image, index) => (
          <div
            className="rail-card"
            key={image.id}
            ref={(node) => {
              cardsRef.current[index] = node
            }}
          >
            <img src={image.image} alt="" />
            <span>{image.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookPreview({ books = defaultBooks }) {
  const [opened, setOpened] = useState(false)
  const [spread, setSpread] = useState(0)
  const [turning, setTurning] = useState(false)
  const pageRef = useRef(null)

  const turns = [
    { left: 'Introduction', right: 'The art of paying attention is the first step toward a lived faith. In these pages, we explore the intersection of silence and sound.' },
    { left: 'Chapter I\nThe First Small Yes', right: 'Faith does not always arrive as a thunderclap. More often, it is a quiet invitation, a small yes spoken in the darkness of a Tuesday morning.' },
    { left: 'The Quiet Life', right: 'To live a quiet life is not to live a boring one. It is to find the frequency of the Spirit amidst the noise of the world.' },
    { left: 'Chapter II\nThe Road Opens', right: 'Every journey begins with a single step, but the most important steps are those taken in trust when the map is blank.' },
    { left: 'The Practice', right: 'Presence is a muscle. We build it through the repetitive act of returning our gaze to the only One who truly sees us.' },
    { left: 'Concluding Thoughts', right: 'May you find the courage to be still, the strength to be honest, and the grace to begin again tomorrow.' },
  ]

  const turnPage = (direction) => {
    if (turning || (direction > 0 && spread === turns.length - 1) || (direction < 0 && spread === 0)) return

    setTurning(true)
    gsap.to(pageRef.current, {
      rotateY: direction > 0 ? -180 : 180,
      duration: 0.95,
      ease: 'power2.inOut',
      onComplete: () => {
        setSpread((value) => value + direction)
        gsap.set(pageRef.current, { rotateY: 0 })
        setTurning(false)
      },
    })
  }

  useLayoutEffect(() => {
    const spreadElement = pageRef.current?.parentElement
    if (!spreadElement) return undefined

    const handlePageTap = (event) => {
      if (!opened) return
      if (event.target.closest('.page-left')) turnPage(-1)
      if (event.target.closest('.page-right')) turnPage(1)
    }

    spreadElement.addEventListener('click', handlePageTap)
    return () => spreadElement.removeEventListener('click', handlePageTap)
  }, [opened, spread, turning])

  const paperNoise = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27 viewBox=%270 0 180 180%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3CfeColorMatrix type=%27saturate%27 values=%270%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.16%27/%3E%3C/svg%3E")'

  return (
    <section className="book-preview">
      <div className="preview-heading">
        <div>
          <span className="eyebrow coral">CINEMATIC READING PREVIEW</span>
          <h1>The old book, reopened.</h1>
          <p>Read the finished story here. Make edits in Start writing.</p>
        </div>
        <span className="preview-status">{opened ? `SPREAD ${spread + 1} / ${turns.length}` : 'CLOSED EDITION'}</span>
      </div>

      <PreviewImageRail />

      <div className={`leather-book ${opened ? 'is-open' : ''}`}>
        <div className="book-clasp" />
        <div className="book-spread">
          <div className="page page-left" style={{ '--paper-noise': paperNoise }}>
            <span className="page-number">{spread * 2 + 1}</span>
            {turns[spread].left.split('\n').map((line, index) => (
              <p key={`${line}-${index}`} className={index === 0 ? 'chapter-label' : 'chapter-line'}>{line}</p>
            ))}
            <span className="page-rule" />
          </div>
          <div className="spine" />
          <div className="page page-right" style={{ '--paper-noise': paperNoise }}>
            {turns[spread].right.split('\n').map((line, index) => (
              <p key={`${line}-${index}`} className={index === 0 ? 'chapter-label' : 'chapter-line'}>{line}</p>
            ))}
            <span className="page-number">{spread * 2 + 2}</span>
          </div>
          <div ref={pageRef} className="turning-page" style={{ '--paper-noise': paperNoise }}>
            <span className="page-number">{spread * 2 + 2}</span>
          </div>
        </div>

        <button className="cover-layer" onClick={() => setOpened(true)} aria-label="Open the book">
          <span className="cover-ornament">R</span>
          <span className="cover-kicker">ROOTED LIBRARY</span>
          <strong>
            The Practice
            <br />
            of Presence
          </strong>
          <span className="cover-author">A reading edition</span>
          <span className="cover-open">
            Open the book <ChevronRight size={15} />
          </span>
        </button>
      </div>

      {opened && (
        <div className="preview-controls">
          <button className="page-button" onClick={() => turnPage(-1)} disabled={spread === 0 || turning}>
            Previous page
          </button>
          <span>Read-only preview</span>
          <button
            className="page-button primary"
            onClick={() => turnPage(1)}
            disabled={spread === turns.length - 1 || turning}
          >
            Turn page <ChevronRight size={15} />
          </button>
        </div>
      )}
    </section>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
