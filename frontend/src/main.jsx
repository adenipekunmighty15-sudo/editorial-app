import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Bookmark, BookOpen, Check, ChevronRight, FileText, Flame, Heart, Home, Library, Menu, PenLine, Plus, Search, Send, Sparkles, Users, WandSparkles, X } from 'lucide-react'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { ai, api } from './api'
import { AIRecommendations, ClubGuide, GenreOrganizer, RootedChat } from './AIWidgets'
import Book3D from './Book3D'
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

function App() {
  const [active, setActive] = useState('Home')
  const [writerOpen, setWriterOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState(defaultBooks)
  const [clubs, setClubs] = useState(defaultClubs)
  const [stories, setStories] = useState(defaultStories)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState('light')
  const [notifications, setNotifications] = useState(true)

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

  const handleSaveBook = async (title) => {
    try {
      await api.toggleBookSave(title)
      setBooks(current => current.map(b => b.title === title ? { ...b, saved: !b.saved } : b))
      toast('Library updated')
    } catch (e) {
      toast('Failed to save book')
    }
  }

  const handleUpdateProgress = async (title, progress) => {
    try {
      await api.updateBookProgress(title, progress)
      setBooks(current => current.map(b => b.title === title ? { ...b, progress } : b))
    } catch (e) {
      // Silent fail for slider to prevent toast spam
    }
  }

  const handleJoinClub = async (title) => {
    try {
      await api.joinClub(title)
      toast(`Request sent to ${title}`)
    } catch (e) {
      toast('Failed to join club')
    }
  }

  const navItems = [
    { label: 'Home', icon: Home },
    { label: 'Library', icon: Library },
    { label: 'Book clubs', icon: Users },
    { label: 'Stories', icon: PenLine },
    { label: 'Preview', icon: BookOpen },
    { label: 'Dashboard', icon: FileText },
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
           <button className="icon-button mobile-menu" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>
             <Menu size={20} />
           </button>
           <button className="avatar" aria-label="Open profile" onClick={() => setProfileOpen(true)}>M</button>
       </div>
     </header>

     {menuOpen && (
       <div className="mobile-nav-overlay" onClick={() => setMenuOpen(false)}>
         <nav className="mobile-nav" onClick={(e) => e.stopPropagation()}>
           {navItems.map(({ label, icon: Icon }) => (
             <button
               key={label}
               className={active === label ? 'nav-item active' : 'nav-item'}
               onClick={() => {
                 setActive(label)
                 setMenuOpen(false)
               }}
             >
               <Icon size={18} />
               {label}
             </button>
           ))}
         </nav>
       </div>
     )}

      {profileOpen && (
        <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="writer-toolbar">
              <span className="writer-brand">USER PROFILE</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="icon-button" onClick={() => { setProfileOpen(false); setSettingsOpen(true); }} title="Settings">
                  <Search size={18} />
                </button>
                <button className="close-button" onClick={() => setProfileOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="profile-content">
              <div className="profile-header">
                <div className="avatar large">M</div>
                <h2>Mighty</h2>
                <p>Dedicated Reader & Writer</p>
              </div>
              <div className="profile-stats">
                <div className="stat-box"><strong>12</strong><span>Day Streak</span></div>
                <div className="stat-box"><strong>4</strong><span>Books Saved</span></div>
                <div className="stat-box"><strong>2</strong><span>Clubs</span></div>
              </div>
              <button className="primary-button" style={{ width: '100%', marginTop: '2rem' }} onClick={() => setProfileOpen(false)}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="writer-toolbar">
              <span className="writer-brand">SETTINGS</span>
              <button className="close-button" onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Dark Mode</strong>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Reduce eye strain at night</p>
                  </div>
                  <button 
                    className={`icon-button ${theme === 'dark' ? 'active' : ''}`} 
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: theme === 'dark' ? '#ff4d4d' : '#ccc' }} />
                  </button>
                </div>
                <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Notifications</strong>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Get alerted about new book clubs</p>
                  </div>
                  <button 
                    className={`icon-button ${notifications ? 'active' : ''}`} 
                    onClick={() => setNotifications(!notifications)}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: notifications ? '#4CAF50' : '#ccc' }} />
                  </button>
                </div>
                <div className="setting-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <strong>Account Email</strong>
                  <input 
                    className="editor-title" 
                    style={{ fontSize: '1rem', padding: '0.5rem' }} 
                    defaultValue="mighty@example.com" 
                  />
                </div>
                <button className="primary-button" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setSettingsOpen(false)}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      onSave={() => handleSaveBook(book.title)}
                      onUpdateProgress={handleUpdateProgress}
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
                        onJoin={() => handleJoinClub(club.title)}
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
             <LibraryView 
               books={books} 
               onSave={(title) => handleSaveBook(title)} 
               onUpdateProgress={handleUpdateProgress}
             />
           )}
           {active === 'Book clubs' && (
             <ClubsView clubs={clubs} onJoin={handleJoinClub} />
           )}
           {active === 'Stories' && (
             <StoriesView books={books} clubs={clubs} stories={stories} onWrite={() => setWriterOpen(true)} />
           )}
           {active === 'Preview' && <BookPreview books={books} />}
           {active === 'Dashboard' && <WriterDashboard />}
        </main>
      </div>

      {writerOpen && (
        <WriterModal
          onClose={() => setWriterOpen(false)}
          onAssist={(input) => ai.write(input)}
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

function BookCard({ book, onSave, onOpen, onUpdateProgress }) {
  const [progress, setProgress] = useState(book.progress)

  const handleProgressChange = (e) => {
    const newProg = Number(e.target.value)
    setProgress(newProg)
    onUpdateProgress?.(book.title, newProg)
  }

  return (
    <article className="book-card" onClick={() => onOpen?.(book)}>
      <div className={`book-cover ${book.color}`}>
        <img src={book.image} alt="" />
        <span className="cover-tag">{book.tag}</span>
        <button
          className={`save-button ${book.saved ? 'active' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            onSave?.()
          }}
          aria-label="Save book"
        >
          <Bookmark size={17} fill={book.saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="book-info">
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <div className="progress-row">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={progress} 
            onChange={handleProgressChange}
            className="progress-slider"
          />
          <small>{progress}%</small>
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

function LibraryView({ books = defaultBooks, onSave, onUpdateProgress, onOpen, onSuggest }) {
  const [filter, setFilter] = useState('For you')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestion, setSuggestion] = useState({ title: '', author: '', reason: '' })

  const handleSuggest = async () => {
    try {
      await api.addBook(suggestion)
      setSuggestOpen(false)
      setSuggestion({ title: '', author: '', reason: '' })
      toast('Recommendation sent!')
    } catch (e) {
      toast('Failed to suggest book')
    }
  }
 
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
          onClick={() => setSuggestOpen(true)}
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
          <BookCard 
            key={`${book.title}-${index}`} 
            book={book} 
            onSave={() => onSave(book.title)} 
            onUpdateProgress={onUpdateProgress}
            onOpen={onOpen} 
          />
        ))}
      </div>
 
      <AIRecommendations books={books} />
 
      {filtered.length === 0 && <div className="empty-library">No books in this shelf yet. Try another genre.</div>}

      {suggestOpen && (
        <div className="modal-backdrop" onClick={() => setSuggestOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="writer-toolbar">
              <span className="writer-brand">SUGGEST A BOOK</span>
              <button className="close-button" onClick={() => setSuggestOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <label>
                  <span className="eyebrow">BOOK TITLE</span>
                  <input 
                    className="editor-title" 
                    style={{ width: '100%', fontSize: '1rem' }} 
                    value={suggestion.title} 
                    onChange={e => setSuggestion({...suggestion, title: e.target.value})}
                  />
                </label>
                <label>
                  <span className="eyebrow">AUTHOR</span>
                  <input 
                    className="editor-title" 
                    style={{ width: '100%', fontSize: '1rem' }} 
                    value={suggestion.author} 
                    onChange={e => setSuggestion({...suggestion, author: e.target.value})}
                  />
                </label>
                <label>
                  <span className="eyebrow">WHY THIS BOOK?</span>
                  <textarea 
                    className="editor-body" 
                    style={{ width: '100%', fontSize: '1rem', height: '100px' }} 
                    value={suggestion.reason} 
                    onChange={e => setSuggestion({...suggestion, reason: e.target.value})}
                  />
                </label>
                <button className="primary-button" onClick={handleSuggest}>
                  Send Recommendation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClubsView({ clubs = defaultClubs, onJoin }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClub, setNewClub] = useState({ title: '', book: '' })

  const handleCreateClub = async () => {
    try {
      await api.addClub(newClub)
      setShowCreateModal(false)
      setNewClub({ title: '', book: '' })
      // Note: in a real app we'd refresh the clubs list from API
      window.location.reload() 
    } catch (e) {
      alert('Failed to create club')
    }
  }

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
        <button className="primary-button" onClick={() => setShowCreateModal(true)}>
          <Plus size={17} />
          Create a club
        </button>
      </div>
 
      <div className="club-list wide">
        {catalog.map((club, index) => (
          <ClubCard key={`${club.title}-${index}`} club={club} onJoin={onJoin} />
        ))}
      </div>
 
      <ClubGuide clubs={catalog} />

      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="writer-toolbar">
              <span className="writer-brand">CREATE CLUB</span>
              <button className="close-button" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <label>
                  <span className="eyebrow">CLUB NAME</span>
                  <input 
                    className="editor-title" 
                    style={{ width: '100%', fontSize: '1rem' }} 
                    value={newClub.title} 
                    onChange={e => setNewClub({...newClub, title: e.target.value})}
                    placeholder="e.g. Friday Faith"
                  />
                </label>
                <label>
                  <span className="eyebrow">BOOK</span>
                  <input 
                    className="editor-title" 
                    style={{ width: '100%', fontSize: '1rem' }} 
                    value={newClub.book} 
                    onChange={e => setNewClub({...newClub, book: e.target.value})}
                    placeholder="e.g. The Great Gatsby"
                  />
                </label>
                <button className="primary-button" onClick={handleCreateClub}>
                  Create Club
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StoriesView({ books = defaultBooks, clubs = defaultClubs, stories = defaultStories, onWrite }) {
  const [storyLikes, setStoryLikes] = useState({})
  const [subscribedAuthors, setSubscribedAuthors] = useState([])

  const handleLike = async (title) => {
    try {
      await api.likeStory(title)
      setStoryLikes(prev => ({
        ...prev,
        [title]: { 
          liked: !prev[title]?.liked, 
          count: prev[title]?.liked ? (stories.find(s => s.title === title)?.likes - 1 || 0) : (stories.find(s => s.title === title)?.likes + 1 || 1) 
        }
      }))
    } catch (e) {
      toast('Failed to like story')
    }
  }

  const handleSubscribe = async (author) => {
    try {
      await api.subscribeToAuthor(author)
      setSubscribedAuthors(prev => [...prev, author])
      toast(`Subscribed to ${author}!`)
    } catch (e) {
      toast('Failed to subscribe')
    }
  }

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
            <button 
              className="primary-button" 
              style={{ marginTop: '1rem', fontSize: '0.8rem' }} 
              onClick={() => handleSubscribe('Amara Okafor')}
            >
              Subscribe to Author
            </button>
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
                <button 
                  className="text-button" 
                  style={{ padding: 0, fontSize: '0.7rem', color: 'coral' }} 
                  onClick={() => handleSubscribe(story.author)}
                >
                  + Subscribe to {story.author}
                </button>
              </div>
              <button 
                onClick={() => handleLike(story.title)} 
                className={`like-button ${storyLikes[story.title]?.liked ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: storyLikes[story.title]?.liked ? 'red' : 'inherit' }}
              >
                <Heart size={18} fill={storyLikes[story.title]?.liked ? 'currentColor' : 'none'} />
              </button>
            </article>
          ))}
        </div>
      </div>
 
      <PublicationHub books={books} clubs={clubs} stories={stories} />
      <GenreOrganizer />
    </>
  )
}

function WriterModal({ onClose, onPublish, onAssist }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [aiAction, setAiAction] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [aiError, setAiError] = useState('')

  const handleTextChange = (updater) => {
    updater()
    setIsSaving(true)
    window.setTimeout(() => setIsSaving(false), 1000)
  }

  const requestAssistance = async (action) => {
    if (!body.trim()) {
      setAiError('Write a little first, then ask for a suggestion.')
      return
    }
    setAiAction(action)
    setAiError('')
    setSuggestion(null)
    try {
      const result = await onAssist({ action, title, text: body })
      setSuggestion({ action, text: result.text })
    } catch (error) {
      setAiError(error.message)
    } finally {
      setAiAction('')
    }
  }

  const applySuggestion = () => {
    if (!suggestion) return
    const updatedBody = suggestion.action === 'continue'
      ? `${body.trimEnd()}\n\n${suggestion.text}`
      : suggestion.text
    setBody(updatedBody)
    setSuggestion(null)
    setAiError('')
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

        <div className="writer-ai-toolbar" aria-label="AI writing actions">
          <span><Sparkles size={15} /> Writing partner</span>
          <button onClick={() => requestAssistance('continue')} disabled={Boolean(aiAction)} title="Continue this draft">
            <WandSparkles size={15} /> Continue
          </button>
          <button onClick={() => requestAssistance('revise')} disabled={Boolean(aiAction)} title="Revise this draft">
            <Check size={15} /> Revise
          </button>
          <button onClick={() => requestAssistance('summarize')} disabled={Boolean(aiAction)} title="Summarize this draft">
            <FileText size={15} /> Summarize
          </button>
          {aiAction && <span className="writer-ai-state" role="status">Working with your local model...</span>}
          {aiError && <span className="writer-ai-error" role="alert">{aiError}</span>}
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
          {suggestion && (
            <section className="writer-suggestion" aria-live="polite">
              <div className="writer-suggestion-heading">
                <strong>{suggestion.action === 'continue' ? 'Suggested continuation' : suggestion.action === 'revise' ? 'Suggested revision' : 'Draft summary'}</strong>
                <div>
                  {suggestion.action !== 'summarize' && <button onClick={applySuggestion}><Check size={15} /> Apply</button>}
                  <button onClick={() => setSuggestion(null)} aria-label="Dismiss suggestion"><X size={16} /></button>
                </div>
              </div>
              <p>{suggestion.text}</p>
              {suggestion.action === 'summarize' && <span>Summary only. Your draft has not been changed.</span>}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function PublicationHub({ books = defaultBooks, stories = defaultStories, clubs = defaultClubs }) {
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
             <button className="primary-button note-button" onClick={async () => {
               if (!note.trim()) return
               try {
                 await api.postNote(note)
                 setSent(true)
                 setNote('')
                 toast('Note published to feed!')
               } catch (e) {
                 toast('Failed to post note')
function WriterDashboard() {
  const [stats, setStats] = useState({ views: 0, subscribers: 0, stories: 0 })
  const [myStories, setMyStories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, stories] = await Promise.all([api.getWriterStats(), api.getMyStories()])
        setStats(s)
        setMyStories(stories)
      } catch (e) {
        console.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="view" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading Dashboard...</div>

  return (
    <div className="view">
      <div className="view-heading">
        <div>
          <span className="eyebrow coral">WRITER'S HUB</span>
          <h1>Your publication</h1>
          <p>Manage your stories and grow your reading community.</p>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="eyebrow">TOTAL VIEWS</span>
          <strong style={{ fontSize: '2rem', display: 'block' }}>{stats.views}</strong>
        </div>
        <div className="stat-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="eyebrow">SUBSCRIBERS</span>
          <strong style={{ fontSize: '2rem', display: 'block' }}>{stats.subscribers}</strong>
        </div>
        <div className="stat-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="eyebrow">STORIES</span>
          <strong style={{ fontSize: '2rem', display: 'block' }}>{stats.stories}</strong>
        </div>
      </div>

      <div className="stories-management">
        <div className="section-heading">
          <h2>Your Archive</h2>
        </div>
        <div className="story-list">
          {myStories.map((story, idx) => (
            <article className="story-row" key={idx}>
              <span className="story-number">0{idx + 1}</span>
              <div>
                <h3>{story.title}</h3>
                <p>{story.readTime} min read · {story.views || 0} views</p>
              </div>
              <button className="text-button">Edit</button>
            </article>
          ))}
          {myStories.length === 0 && <p>You haven't published any stories yet.</p>}
        </div>
      </div>
    </div>
  )
}
             }}>
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

      {tab === 'Studio' && (
        <>
          <AIRecommendations books={books} />
          <ClubGuide clubs={clubs} />
        </>
      )}

      {tab === 'Chat' && <RootedChat books={books} stories={stories} clubs={clubs} />}
    </section>
  )
}

function PreviewImageRail({ books = defaultBooks, onSelect }) {
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
            onClick={() => onSelect?.(image)}
          >
            <img src={image.image} alt="" />
            <span>{image.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookPreview({ books }) {
  const [selectedBook, setSelectedBook] = useState(books[0])

  return (
    <section className="book-preview">
      <div className="preview-heading">
        <div>
          <span className="eyebrow coral">CINEMATIC READING PREVIEW</span>
          <h1>{selectedBook?.title || 'The old book, reopened.'}</h1>
          <p>Turn the pages of the finished edition — it reads like the real thing.</p>
        </div>
        <span className="preview-status">INTERACTIVE 3D EDITION</span>
      </div>
 
      <PreviewImageRail books={books} onSelect={setSelectedBook} />
 
      <Book3D book={selectedBook} />
    </section>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
