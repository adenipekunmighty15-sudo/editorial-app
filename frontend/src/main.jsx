import { StrictMode, createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Bookmark, BookOpen, Check, ChevronRight, Eye, EyeOff, FileText, Flame, Heart, Home, Library, Menu, PenLine, Plus, Search, Send, Sparkles, Users, WandSparkles, X } from 'lucide-react'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { ai, api } from './api'
import { AIRecommendations, ClubGuide, GenreOrganizer, RootedChat } from './AIWidgets'
import Book3D from './Book3D'
import './styles.css'

const ToastContext = createContext(() => {})

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

function QuoteCard() {
  const quotes = [
    { text: '“We are what we repeatedly do. Excellence, then, is not an act, but a habit.”', author: 'Will Durant' },
    { text: '“He who has a why to live can bear almost any how.”', author: 'Friedrich Nietzsche' },
    { text: '“Truth is not a destination, but a way of traveling.”', author: 'Unknown' },
  ]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % quotes.length), 5000)
    return () => clearInterval(timer)
  }, [quotes.length])

  return (
    <>
      <Sparkles size={19} />
      <p>{quotes[index].text}</p>
      <span>— {quotes[index].author}</span>
      <div className="quote-dots" aria-label={`Quote ${index + 1} of ${quotes.length}`}>
        {quotes.map((quote, quoteIndex) => (
          <i key={quote.author} className={quoteIndex === index ? 'selected' : ''} />
        ))}
      </div>
    </>
  )
}

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }, [key, value])

  return [value, setValue]
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256)
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function EntryFlow({ onEnter }) {
  const [mode, setMode] = useState('welcome')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (mode === 'reset') {
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.')
        return
      }
      if (password !== confirmPassword) {
        setError('Those passwords do not match.')
        return
      }
      const savedAccount = JSON.parse(localStorage.getItem('rooted.local-account') || 'null')
      if (!savedAccount || savedAccount.email !== normalizedEmail) {
        setError('No Rooted account was found for that email on this device.')
        return
      }
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
      savedAccount.salt = salt
      savedAccount.passwordHash = await hashPassword(password, salt)
      localStorage.setItem('rooted.local-account', JSON.stringify(savedAccount))
      switchMode('sign-in')
      setError('Password updated. Sign in to continue.')
      return
    }

    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    setBusy(true)
    try {
      const savedAccount = JSON.parse(localStorage.getItem('rooted.local-account') || 'null')
      if (mode === 'create') {
        if (!name.trim()) {
          setError('Add your name to create an account.')
          return
        }
        if (password !== confirmPassword) {
          setError('Those passwords do not match.')
          return
        }
        if (savedAccount?.email === normalizedEmail) {
          setError('An account already exists on this device. Sign in instead.')
          return
        }
        const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
        const account = { name: name.trim(), email: normalizedEmail, salt, passwordHash: await hashPassword(password, salt) }
        localStorage.setItem('rooted.local-account', JSON.stringify(account))
        onEnter({ name: account.name, email: account.email })
        return
      }
      if (!savedAccount || savedAccount.email !== normalizedEmail || await hashPassword(password, savedAccount.salt) !== savedAccount.passwordHash) {
        setError('Email or password is incorrect on this device.')
        return
      }
      onEnter({ name: savedAccount.name, email: savedAccount.email })
    } catch {
      setError('Secure account storage is unavailable in this browser.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'welcome') {
    return (
      <main className="entry-screen welcome-screen">
        <section className="entry-copy">
          <button className="entry-brand" onClick={() => switchMode('welcome')}><span className="brand-mark">R</span> ROOTED</button>
          <span className="eyebrow coral">READ DEEPLY · LIVE FULLY</span>
          <h1>A quieter place<br /><em>to find your next page.</em></h1>
          <p>Build a reading life with thoughtful books, honest stories, and people who make room for conversation.</p>
          <div className="entry-actions">
            <button className="primary-button" onClick={() => switchMode('create')}>Create your account <ChevronRight size={17} /></button>
            <button className="entry-secondary" onClick={() => switchMode('sign-in')}>Sign in</button>
          </div>
          <button className="guest-link" onClick={() => onEnter({ name: 'Guest Reader', email: '' })}>Explore as a guest</button>
          <span className="entry-privacy">Preview accounts stay on this device.</span>
        </section>
        <div className="entry-image" role="img" aria-label="A warm, quiet library lined with books" />
      </main>
    )
  }

  return (
    <main className="entry-screen auth-screen">
      <div className="auth-image" />
      <section className="auth-panel">
        <button className="entry-brand" onClick={() => switchMode('welcome')}><span className="brand-mark">R</span> ROOTED</button>
        <button className="text-button auth-back" onClick={() => switchMode('welcome')}><ChevronRight className="back-chevron" size={16} /> Back</button>
        <span className="eyebrow coral">{mode === 'create' ? 'MAKE YOURSELF AT HOME' : mode === 'reset' ? 'ACCOUNT ACCESS' : 'WELCOME BACK'}</span>
        <h1>{mode === 'create' ? 'Create your account.' : mode === 'reset' ? 'Choose a new password.' : 'Sign in to Rooted.'}</h1>
        <p className="auth-intro">{mode === 'create' ? 'A reading life is better when it has a place to grow.' : mode === 'reset' ? 'Reset the password for your account on this device.' : 'Your books, stories, and reading circle are waiting.'}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'create' && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          {mode !== 'reset' && <label>Password<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
          {mode === 'reset' && <label>New password<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
          {(mode === 'create' || mode === 'reset') && <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label>}
          {mode === 'sign-in' && <button type="button" className="forgot-link" onClick={() => switchMode('reset')}>Forgot password?</button>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'create' ? 'Create account' : mode === 'reset' ? 'Update password' : 'Sign in'} <ChevronRight size={17} /></button>
        </form>
        <p className="auth-switch">{mode === 'create' ? 'Already have an account?' : mode === 'reset' ? 'Remember your password?' : 'New to Rooted?'} <button onClick={() => switchMode(mode === 'create' ? 'sign-in' : 'create')}>{mode === 'create' || mode === 'reset' ? 'Sign in' : 'Create account'}</button></p>
        <p className="entry-privacy">Accounts in this preview are stored on this device.</p>
      </section>
    </main>
  )
}

function App() {
  const [session, setSession] = useStoredState('rooted.session', null)
  const [active, setActive] = useState('Home')
  const [writerOpen, setWriterOpen] = useState(false)
  const [editingStory, setEditingStory] = useState(null)
  const [readingStory, setReadingStory] = useState(null)
  const [selectedClub, setSelectedClub] = useState(null)
  const [selectedAuthor, setSelectedAuthor] = useState(null)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [books, setBooks] = useStoredState('rooted.books', defaultBooks)
  const [clubs, setClubs] = useStoredState('rooted.clubs', defaultClubs)
  const [stories, setStories] = useStoredState('rooted.stories', defaultStories)
  const [joinedClubs, setJoinedClubs] = useStoredState('rooted.joined-clubs', [])
  const [previewBook, setPreviewBook] = useState(defaultBooks[0])
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useStoredState('rooted.theme', 'light')
  const [notifications, setNotifications] = useStoredState('rooted.notifications', true)
  const toast = (message) => setNotice(message)

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

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

  if (!session) return <EntryFlow onEnter={setSession} />

  const handleSaveBook = (title) => {
    setBooks((current) => current.map((book) => book.title === title ? { ...book, saved: !book.saved } : book))
    toast('Library updated')
  }

  const handleUpdateProgress = (title, progress) => {
    setBooks((current) => current.map((book) => book.title === title ? { ...book, progress } : book))
  }

  const handleJoinClub = (title) => {
    if (joinedClubs.includes(title)) return
    setJoinedClubs((current) => [...current, title])
    toast(`Request sent to ${title}`)
  }

  const navItems = [
    { label: 'Home', icon: Home },
    { label: 'Library', icon: Library },
    { label: 'Book clubs', icon: Users },
    { label: 'Stories', icon: PenLine },
    { label: 'Discover', icon: Sparkles },
    { label: 'Preview', icon: BookOpen },
    { label: 'Dashboard', icon: FileText },
  ]

  const navigateTo = (label) => {
    setActive(label)
    setReadingStory(null)
    setSelectedClub(null)
    setSelectedAuthor(null)
    setMenuOpen(false)
  }

  const dailyVerse = verses[new Date().getDate() % verses.length]

  const handleSearch = (q) => {
    if (!q.trim()) return
    navigateTo('Library')
  }

  return (
    <ToastContext.Provider value={toast}>
    <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => navigateTo('Home')}>
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
                 navigateTo(label)
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
                <h2>{session.name}</h2>
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
              <button className="text-button" style={{ margin: '1rem auto 0' }} onClick={() => { setProfileOpen(false); setSession(null) }}>Sign out</button>
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
                onClick={() => navigateTo(label)}
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
          {readingStory && (
            <StoryReader story={readingStory} onBack={() => setReadingStory(null)} onAuthor={(author) => { setReadingStory(null); setSelectedAuthor(author) }} />
          )}
          {selectedClub && (
            <ClubProfile
              club={selectedClub}
              onBack={() => setSelectedClub(null)}
              onJoin={() => handleJoinClub(selectedClub.title)}
              joined={joinedClubs.includes(selectedClub.title)}
            />
          )}
          {selectedAuthor && (
            <AuthorPublicationPage author={selectedAuthor} stories={stories} onBack={() => setSelectedAuthor(null)} onRead={(story) => { setSelectedAuthor(null); setReadingStory(story) }} />
          )}
          {!readingStory && !selectedClub && !selectedAuthor && (
            <>
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
                      <button className="primary-button" onClick={() => navigateTo('Library')}>
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
                      <button className="text-button" onClick={() => navigateTo('Library')}>
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
                          onOpen={(selected) => { setPreviewBook(selected); navigateTo('Preview') }}
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
                        <button className="text-button" onClick={() => navigateTo('Book clubs')}>
                          All clubs <ChevronRight size={16} />
                        </button>
                      </div>
 
                      <div className="club-list">
                        {clubs.map((club) => (
                          <ClubCard
                            key={club.title}
                            club={club}
                            onJoin={() => handleJoinClub(club.title)}
                            onOpen={setSelectedClub}
                            joined={joinedClubs.includes(club.title)}
                          />
                        ))}
                      </div>
                    </div>
 
                    <aside className="quote-card">
                      <QuoteCard />
                    </aside>
                  </section>
                </>
              )}
 
              {active === 'Library' && (
                <LibraryView 
                  books={books} 
                  onSave={(title) => handleSaveBook(title)} 
                  onUpdateProgress={handleUpdateProgress}
                  searchQuery={query}
                  onSuggest={(book) => setBooks((current) => [book, ...current])}
                  onOpen={(book) => { setPreviewBook(book); navigateTo('Preview') }}
                />
              )}
              {active === 'Book clubs' && (
                <ClubsView
                  clubs={clubs}
                  onJoin={handleJoinClub}
                  joinedClubs={joinedClubs}
                  onCreate={(club) => setClubs((current) => [club, ...current])}
                  onOpen={setSelectedClub}
                />
              )}
              {active === 'Stories' && (
                <StoriesView books={books} clubs={clubs} stories={stories} onWrite={() => { setEditingStory(null); setWriterOpen(true) }} onRead={setReadingStory} onAuthor={setSelectedAuthor} />
              )}
              {active === 'Discover' && <PublicationHub books={books} stories={stories} clubs={clubs} onRead={setReadingStory} />}
              {active === 'Preview' && <BookPreview books={books} book={previewBook} onSelect={setPreviewBook} />}
              {active === 'Dashboard' && <WriterDashboard stories={stories} author={session.name} onEdit={(story) => { setEditingStory(story); setWriterOpen(true) }} />}
            </>
          )}
        </main>
      </div>

      {writerOpen && (
        <WriterModal
          initialStory={editingStory}
          onClose={() => { setWriterOpen(false); setEditingStory(null) }}
          onAssist={(input) => ai.write(input)}
          onPublish={({ title, body }) => {
            setWriterOpen(false)
            const currentStory = editingStory
            setEditingStory(null)
            const readTime = Math.max(1, Math.round(body.split(/\s+/).length / 200))
            const story = {
              title: title || 'Untitled story',
              author: session.name,
              content: body,
              excerpt: body.slice(0, 140),
              readTime,
            }
            setStories((current) => currentStory
              ? current.map((item) => item.title === currentStory.title ? { ...item, ...story } : item)
              : [{ ...story, likes: 0 }, ...current])
            toast(currentStory ? 'Story updated' : 'Story published')
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
    </ToastContext.Provider>
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
  const progress = Math.min(100, Math.max(0, Number(book.progress) || 0))

  return (
    <article className="book-card" onClick={() => onOpen?.(book)}>
      <div className={`book-cover ${book.color}`} style={{ cursor: 'pointer' }}>
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
          <div className="progress" role="progressbar" aria-label={`${book.title} reading progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{progress}%</small>
        </div>
      </div>
    </article>
  )
}

function ClubCard({ club, onJoin, onOpen, joined = false }) {
  return (
    <article className="club-card">
      <img src={club.image} alt="" onClick={() => onOpen?.(club)} style={{ cursor: 'pointer' }} />
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
      <button className="join-button" onClick={onJoin} disabled={joined}>{joined ? 'Requested' : 'Join'}</button>
    </article>
  )
}
  function LibraryView({ books = defaultBooks, onSave, onUpdateProgress, onOpen, onSuggest, searchQuery = '' }) {
  const toast = useContext(ToastContext)
  const [filter, setFilter] = useState('For you')
    const [shelf, setShelf] = useState('All books')
    const [sortBy, setSortBy] = useState('Featured')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestion, setSuggestion] = useState({ title: '', author: '', reason: '' })

  const handleSuggest = () => {
    const title = suggestion.title.trim()
    const author = suggestion.author.trim()
    if (!title || !author) {
      toast('Add a title and author')
      return
    }
    onSuggest?.({ ...suggestion, title, author, image: defaultBooks[0].image, tag: 'RECOMMENDED', color: 'sage', progress: 0 })
    setSuggestOpen(false)
    setSuggestion({ title: '', author: '', reason: '' })
    toast('Book added to the library')
  }
 
  const catalog = books.concat([
    { ...books[0], title: 'The Cost of Discipleship', author: 'Dietrich Bonhoeffer', color: 'ochre', progress: 0, saved: false, tag: 'NON-FICTION' },
  ])
 
  const byFilter =
    filter === 'For you'
      ? catalog
      : catalog.filter((book) => {
          const tag = (book.tag || '').toUpperCase()
          if (filter === 'Fiction') return tag === 'FICTION'
          if (filter === 'Non-fiction') return tag === 'NON-FICTION'
          if (filter === 'Spiritual formation') return ['SPIRITUAL FORMATION', 'FORMATION'].includes(tag)
          return true
        })
  const byShelf = byFilter.filter((book) => {
    if (shelf === 'Reading') return Number(book.progress) > 0 && Number(book.progress) < 100
    if (shelf === 'Saved') return Boolean(book.saved)
    return true
  })
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filtered = byShelf.filter((book) => {
    if (!normalizedQuery) return true
    return [book.title, book.author, book.tag].some((value) => value?.toLowerCase().includes(normalizedQuery))
  }).sort((first, second) => {
    if (sortBy === 'Title A-Z') return first.title.localeCompare(second.title)
    if (sortBy === 'Progress') return (second.progress || 0) - (first.progress || 0)
    return 0
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

      <div className="library-toolbar">
        <div className="shelf-tabs" role="tablist" aria-label="Library shelves">
          {['All books', 'Reading', 'Saved'].map((item) => (
            <button key={item} role="tab" aria-selected={shelf === item} className={shelf === item ? 'shelf-tab active' : 'shelf-tab'} onClick={() => setShelf(item)}>
              {item}{item === 'Saved' ? ` · ${books.filter((book) => book.saved).length}` : ''}
            </button>
          ))}
        </div>
        <label className="sort-control">Sort
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort books">
            <option>Featured</option>
            <option>Title A-Z</option>
            <option>Progress</option>
          </select>
        </label>
      </div>

      <p className="library-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'book' : 'books'}{normalizedQuery ? ` matching “${searchQuery.trim()}”` : ''}</p>
 
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

function ClubsView({ clubs = defaultClubs, onJoin, joinedClubs = [], onCreate, onOpen }) {
  const toast = useContext(ToastContext)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClub, setNewClub] = useState({ title: '', book: '' })

  const handleCreateClub = () => {
    const title = newClub.title.trim()
    const book = newClub.book.trim()
    if (!title || !book) {
      toast('Add a club name and book')
      return
    }
    onCreate?.({ ...newClub, title, book, members: '1 / 5', time: 'just started', image: defaultClubs[0].image })
    setShowCreateModal(false)
    setNewClub({ title: '', book: '' })
    toast('Your reading club is ready')
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
          <ClubCard key={`${club.title}-${index}`} club={club} onJoin={() => onJoin(club.title)} onOpen={onOpen} joined={joinedClubs.includes(club.title)} />
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

function StoriesView({ books = defaultBooks, clubs = defaultClubs, stories = defaultStories, onWrite, onRead, onAuthor }) {
  const toast = useContext(ToastContext)
  const [storyLikes, setStoryLikes] = useStoredState('rooted.story-likes', {})
  const [subscribedAuthors, setSubscribedAuthors] = useStoredState('rooted.subscribed-authors', [])

  const handleLike = (title) => {
    const story = stories.find((item) => item.title === title)
    setStoryLikes((current) => {
      const liked = Boolean(current[title]?.liked)
      const count = current[title]?.count ?? story?.likes ?? 0
      return { ...current, [title]: { liked: !liked, count: Math.max(0, count + (liked ? -1 : 1)) } }
    })
  }

  const handleSubscribe = (author) => {
    if (subscribedAuthors.includes(author)) return
    setSubscribedAuthors((current) => [...current, author])
    toast(`Subscribed to ${author}`)
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
          <div className="story-image" style={{ position: 'relative', overflow: 'hidden' }}>
             <div className="story-animation-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(45deg, rgba(0,0,0,0.2), transparent)', pointerEvents: 'none' }} />
          </div>
          <div>
            <span className="eyebrow">FEATURED STORY · 8 MIN READ</span>
            <h2 onClick={() => onRead(stories.find((story) => story.title === 'The grace of beginning again') || { title: 'The grace of beginning again', author: 'Amara Okafor', excerpt: 'Some seasons ask us to grow quietly. This one taught me that quiet growth is still growth.' })} style={{ cursor: 'pointer' }}>The grace of beginning again</h2>
            <p>“Some seasons ask us to grow quietly. This one taught me that quiet growth is still growth.”</p>
            <div className="story-author">
              <span className="avatar small">A</span>
              <span>
                <button className="author-link" onClick={() => onAuthor?.('Amara Okafor')}>Amara Okafor</button>
                <small>3 days ago · 14 responses</small>
              </span>
            </div>
            <button 
              className="primary-button" 
              style={{ marginTop: '1rem', fontSize: '0.8rem' }} 
              onClick={() => handleSubscribe('Amara Okafor')}
              disabled={subscribedAuthors.includes('Amara Okafor')}
            >
              {subscribedAuthors.includes('Amara Okafor') ? 'Subscribed' : 'Subscribe to Author'}
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
              <div style={{ cursor: 'pointer' }} onClick={() => onRead(story)}>
                <h3>{story.title}</h3>
                <p><button className="author-link" onClick={(event) => { event.stopPropagation(); onAuthor?.(story.author) }}>{story.author}</button> · {story.readTime || index + 4} min read</p>
                <button 
                  className="text-button" 
                  style={{ padding: 0, fontSize: '0.7rem', color: 'coral' }} 
                  onClick={(e) => { e.stopPropagation(); handleSubscribe(story.author); }}
                  disabled={subscribedAuthors.includes(story.author)}
                >
                  {subscribedAuthors.includes(story.author) ? 'Subscribed' : `+ Subscribe to ${story.author}`}
                </button>
              </div>
              <button 
                onClick={() => handleLike(story.title)} 
                className={`like-button ${storyLikes[story.title]?.liked ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: storyLikes[story.title]?.liked ? 'red' : 'inherit' }}
                aria-label={`${storyLikes[story.title]?.liked ? 'Unlike' : 'Like'} ${story.title}`}
              >
                <Heart size={18} fill={storyLikes[story.title]?.liked ? 'currentColor' : 'none'} />
                <span>{storyLikes[story.title]?.count ?? story.likes ?? 0}</span>
              </button>
            </article>
          ))}
        </div>
      </div>
 
      <PublicationHub books={books} clubs={clubs} stories={stories} onRead={onRead} />
      <GenreOrganizer />
    </>
  )
}

function StoryReader({ story, onBack, onAuthor }) {
  const [fontSize, setFontSize] = useState(20)
  const [savedStories, setSavedStories] = useStoredState('rooted.saved-stories', [])
  const [highlights, setHighlights] = useStoredState('rooted.highlights', [])
  const [selection, setSelection] = useState('')
  const saved = savedStories.includes(story.title)
  const content = story.content || story.excerpt || 'This story is ready to be read. Check back soon for the full piece.'

  const saveSelection = () => {
    if (!selection) return
    setHighlights((current) => [...current, { title: story.title, text: selection, createdAt: Date.now() }])
    setSelection('')
  }

  return (
    <article className="story-reader">
      <header className="story-reader-toolbar">
        <button className="text-button" onClick={onBack}><ChevronRight className="back-chevron" size={16} /> Back to stories</button>
        <div className="reader-actions">
          <button className={saved ? 'reader-action active' : 'reader-action'} onClick={() => setSavedStories((current) => saved ? current.filter((title) => title !== story.title) : [...current, story.title])} aria-label={saved ? 'Remove saved story' : 'Save story'}>
            <Bookmark size={16} />{saved ? 'Saved' : 'Save'}
          </button>
          <button className="reader-action" onClick={() => setFontSize((size) => Math.max(16, size - 1))} aria-label="Decrease reading text size">A−</button>
          <button className="reader-action" onClick={() => setFontSize((size) => Math.min(28, size + 1))} aria-label="Increase reading text size">A+</button>
        </div>
      </header>
      <div className="story-reader-content">
        <span className="eyebrow coral">{story.readTime || 5} MIN READ</span>
        <h1>{story.title}</h1>
        <button className="author-link story-reader-author" onClick={() => onAuthor?.(story.author)}>{story.author}</button>
        {story.excerpt && <p className="story-reader-lede">{story.excerpt}</p>}
        <div className="story-reader-copy" style={{ fontSize: `${fontSize}px` }} onMouseUp={() => setSelection(window.getSelection()?.toString().trim() || '')}>
          {content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
        {selection && (
          <div className="highlight-action">
            <span>Passage selected</span>
            <button className="text-button" onClick={saveSelection}>Save highlight</button>
          </div>
        )}
        {highlights.filter((item) => item.title === story.title).length > 0 && (
          <section className="saved-highlights"><h2>Highlights</h2>{highlights.filter((item) => item.title === story.title).map((item) => <blockquote key={item.createdAt}>{item.text}</blockquote>)}</section>
        )}
      </div>
    </article>
  )
}

function ClubProfile({ club, onBack, onJoin, joined }) {
  return (
    <section className="club-profile">
      <button className="text-button" onClick={onBack}><ChevronRight className="back-chevron" size={16} /> All book clubs</button>
      <div className="club-profile-hero">
        <img src={club.image} alt="" />
        <div>
          <span className="eyebrow coral">ROOTED BOOK CLUB</span>
          <h1>{club.title}</h1>
          <p>Reading <strong>{club.book}</strong> together</p>
          <div className="club-profile-meta"><span>{club.members} readers</span><span>{club.time}</span></div>
          <button className="primary-button" onClick={onJoin} disabled={joined}>{joined ? 'Request sent' : 'Request to join'}</button>
        </div>
      </div>
      <div className="club-profile-grid">
        <section><span className="eyebrow">HOW IT WORKS</span><h2>A small table for good conversation.</h2><p>Read at your own pace, bring a question, and make room for different perspectives. New members can join when a seat opens.</p></section>
        <ClubGuide clubs={[club]} />
      </div>
    </section>
  )
}

function AuthorPublicationPage({ author, stories, onBack, onRead }) {
  const [subscriptions, setSubscriptions] = useStoredState('rooted.subscribed-authors', [])
  const subscribed = subscriptions.includes(author)
  const authorStories = stories.filter((story) => story.author === author)

  return (
    <section className="author-page">
      <button className="text-button" onClick={onBack}><ChevronRight className="back-chevron" size={16} /> Back to stories</button>
      <div className="author-page-heading"><span className="avatar large">{author.charAt(0)}</span><div><span className="eyebrow coral">ROOTED WRITER</span><h1>{author}</h1><p>Essays, reflections, and reading notes.</p></div>
        <button className="primary-button" disabled={subscribed} onClick={() => setSubscriptions((current) => [...current, author])}>{subscribed ? 'Subscribed' : 'Subscribe'}</button>
      </div>
      <div className="story-list"><span className="eyebrow">PUBLICATIONS</span>
        {authorStories.length ? authorStories.map((story) => <button className="author-story-row" key={story.title} onClick={() => onRead(story)}><span><strong>{story.title}</strong><small>{story.readTime || 5} min read</small></span><ChevronRight size={17} /></button>) : <p>No stories from this writer yet.</p>}
      </div>
    </section>
  )
}

function WriterModal({ initialStory, onClose, onPublish, onAssist }) {
  const [title, setTitle] = useState(initialStory?.title || '')
  const [body, setBody] = useState(initialStory?.content || '')
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

function PublicationHub({ books = defaultBooks, stories = defaultStories, clubs = defaultClubs, onRead }) {
  const toast = useContext(ToastContext)
  const [tab, setTab] = useState('Reader')
  const [playing, setPlaying] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [notes, setNotes] = useStoredState('rooted.notes', [])
  const [narrationError, setNarrationError] = useState('')

  const readerPosts = [
    { title: 'The grace of beginning again', meta: 'Amara Okafor · 8 min read', type: 'Essay' },
    { title: 'A field guide to holy friendship', meta: 'Paps O. · 5 min read', type: 'Audio' },
    { title: 'What we carry to the table', meta: 'Dami Adeyemi · 11 min read', type: 'Video' },
  ]

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const toggleNarration = () => {
    if (playing) {
      window.speechSynthesis?.cancel()
      setPlaying(false)
      return
    }
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setNarrationError('Narration is not supported in this browser.')
      return
    }
    setNarrationError('')
    const text = readerPosts.map((post) => `${post.title}. ${post.meta}`).join('. ')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setPlaying(false)
    utterance.onerror = () => { setPlaying(false); setNarrationError('Narration could not be played.') }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setPlaying(true)
  }

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
              <button className="text-button" onClick={() => onRead?.(stories.find((story) => story.title === post.title) || { title: post.title, author: post.meta.split(' · ')[0], excerpt: post.meta })}>
                Open <ChevronRight size={15} />
              </button>
            </article>
          ))}

          <div className="audio-player">
            <button className="audio-play" onClick={toggleNarration} aria-label={playing ? 'Stop narration' : 'Play narration'}>
              {playing ? '||' : '▶'}
            </button>
            <div>
              <strong>{playing ? 'Playing narration' : 'Listen to your reading list'}</strong>
              <span>AI narration · Warm voice · 12 min</span>
            </div>
            <span className="audio-progress" role="status">{playing ? 'Narration playing' : narrationError || 'Ready to listen'}</span>
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
               } catch {
                 setNotes((current) => [{ content: note.trim(), createdAt: Date.now() }, ...current])
                 setSent(true)
                 setNote('')
                 toast('Note saved to this session')
               }
             }} disabled={!note.trim()}>
               <Send size={15} />
               Post note
             </button>
           </div>

           <textarea
             value={note}
             onChange={(event) => setNote(event.target.value)}
             placeholder="What are you thinking about?"
             className="note-composer"
             aria-label="Write a note"
             maxLength={1000}
           />
           {sent && <div className="note-sent" role="status">Your note is now in the discovery feed.</div>}
           {notes.map((item) => (
             <div className="note-card" key={item.createdAt}>
               <span className="avatar small">M</span>
               <div><strong>Mighty</strong><p>{item.content}</p><span>Just now</span></div>
             </div>
           ))}
           <div className="note-card">
             <span className="avatar small">A</span>
             <div>
               <strong>Amara Okafor</strong>
               <p>“Some seasons ask us to grow quietly. Quiet growth is still growth.”</p>
               <span>♡ 24 · 6 replies · 2h</span>
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

function WriterDashboard({ stories = [], author, onEdit }) {
  const myStories = stories.filter((story) => story.author === author)
  const stats = { views: 0, subscribers: 0, stories: myStories.length }

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
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{story.title}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
                  {story.readTime} min read · {story.views || 0} views · 
                  <span style={{ marginLeft: '8px', color: 'coral' }}>{Math.round((story.views / 1000) * 100)}% reach</span>
                </p>
              </div>
              <button className="text-button" onClick={() => onEdit?.(story)}>Edit</button>
            </article>
          ))}
          {myStories.length === 0 && <p>You haven't published any stories yet.</p>}
        </div>
      </div>
    </div>
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

function BookPreview({ books, book, onSelect }) {
  const selectedBook = book || books[0]

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
 
      <PreviewImageRail books={books} onSelect={onSelect} />
 
      <Book3D book={selectedBook} />
    </section>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
