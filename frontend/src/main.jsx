import { createContext, StrictMode, useContext, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Heart,
  Home,
  Library,
  Menu,
  MessageCircle,
  PenLine,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'
import { AIRecommendations, ClubGuide, GenreOrganizer, RootedChat } from './AIWidgets'
import { api, ai } from './api'
import BookReader from './BookReader'
import { supabase } from './supabaseClient'
import './styles.css'
import './BookPreview.css'

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

const defaultClubDiscussion = [
  { author: 'Amara Okafor', time: 'Today · 9:12 AM', text: 'What line from this week stayed with you after you closed the book?', likes: 3 },
  { author: 'Paps O.', time: 'Yesterday · 6:40 PM', text: 'I noticed how a slower pace changed the way I read this chapter. Curious if anyone else felt that shift.', likes: 2 },
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

const reflectionPrompts = [
  { id: 1, text: 'Where did you encounter stillness today?', category: 'Presence' },
  { id: 2, text: 'What is a truth you have struggled to accept recently?', category: 'Honesty' },
  { id: 3, text: 'Describe a moment when a stranger showed you unexpected kindness.', category: 'Connection' },
  { id: 4, text: 'If your current season of life was a book chapter, what would it be titled?', category: 'Perspective' },
  { id: 5, text: 'What does "rest" actually feel like in your body?', category: 'Sabbath' },
  { id: 6, text: 'Write a letter to your future self about the faith you have right now.', category: 'Growth' },
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

async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'create') {
        if (!name.trim()) {
          setError('Add your name to create an account.')
          return
        }
        if (password !== confirmPassword) {
          setError('Those passwords do not match.')
          return
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password,
          options: { data: { full_name: name.trim() } },
        })
        if (signUpError) throw signUpError
        onEnter({ name: data.user?.user_metadata?.full_name || name.trim(), email: data.user?.email })
      } else if (mode === 'sign-in') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        })
        if (signInError) throw signInError
        onEnter({ name: data.user?.user_metadata?.full_name || 'Reader', email: data.user?.email })
      } else if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail)
        if (resetError) throw resetError
        setError('Password reset link sent to your email.')
        switchMode('welcome')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
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
          <div className="entry-highlights">
            <div><Library size={17} /><span><strong>Your shelves</strong><small>Keep your place</small></span></div>
            <div><Users size={17} /><span><strong>Reading circles</strong><small>Meet around a book</small></span></div>
            <div><PenLine size={17} /><span><strong>Story room</strong><small>Share what stays</small></span></div>
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

function StreakParticles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let particles = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    class Particle {
      constructor() {
        this.reset()
      }
      reset() {
        this.x = Math.random() * canvas.width
        this.y = canvas.height + 10
        this.size = Math.random() * 2 + 1
        this.speedY = Math.random() * -1 - 0.5
        this.speedX = (Math.random() - 0.5) * 0.5
        this.opacity = Math.random() * 0.5 + 0.2
        this.life = Math.random() * 100 + 100
      }
      update() {
        this.y += this.speedY
        this.x += this.speedX
        this.life--
        if (this.life <= 0 || this.y < -10) this.reset()
      }
      draw() {
        ctx.fillStyle = `rgba(224, 83, 54, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    resize()
    window.addEventListener('resize', resize)
    particles = Array.from({ length: 30 }, () => new Particle())

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.update()
        p.draw()
      })
      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

function App() {
  const [session, setSession] = useState(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [active, setActive] = useState('Home')
  const [writerOpen, setWriterOpen] = useState(false)
  const [editingStory, setEditingStory] = useState(null)
  const [readingStory, setReadingStory] = useState(null)
  const [selectedClub, setSelectedClub] = useState(null)
  const [selectedAuthor, setSelectedAuthor] = useState(null)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState([])
  const [clubs, setClubs] = useState([])
  const [stories, setStories] = useState([])
  const [joinedClubs, setJoinedClubs] = useStoredState('rooted.joined-clubs', [])
  const [readingGoal, setReadingGoal] = useStoredState('rooted.reading-goal', 4)
  const [readingSessions, setReadingSessions] = useStoredState('rooted.reading-sessions', [])
  const [loadingData, setLoadingData] = useState(true)
  const [previewBook, setPreviewBook] = useState(defaultBooks[0])
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useStoredState('rooted.theme', 'light')
  const [notifications, setNotifications] = useStoredState('rooted.notifications', true)
  const toast = (message) => setNotice(message)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true)
        const [booksRes, clubsRes, storiesRes] = await Promise.all([
          supabase.from('books').select('*'),
          supabase.from('clubs').select('*'),
          supabase.from('stories').select('*'),
        ])

        if (booksRes.error) throw booksRes.error
        if (clubsRes.error) throw clubsRes.error
        if (storiesRes.error) throw storiesRes.error

        setBooks(booksRes.data || [])
        setClubs(clubsRes.data || [])
        setStories(storiesRes.data || [])
      } catch (err) {
        console.error('Error fetching production data:', err)
        setBooks(defaultBooks)
        setClubs(defaultClubs)
        setStories(defaultStories)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {

      if (currentSession) {
        setSession(currentSession.user)
      } else {
        setSession(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <EntryFlow onEnter={setSession} />
  if (loadingData) return (
    <div className="app-shell loading-screen">
      <div className="loading-brand">
        <span className="brand-mark">R</span> ROOTED
      </div>
      <div className="loading-spinner" />
    </div>
  )

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

  const saveSettings = () => {
    const normalizedEmail = accountEmail.trim().toLowerCase()
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast('Enter a valid email address')
      return
    }
    const previousEmail = session.email
    setSession((current) => ({ ...current, email: normalizedEmail }))
    if (previousEmail && normalizedEmail) {
      try {
        const account = JSON.parse(localStorage.getItem('rooted.local-account') || 'null')
        if (account?.email === previousEmail) {
          account.email = normalizedEmail
          localStorage.setItem('rooted.local-account', JSON.stringify(account))
        }
      } catch {
        toast('Could not update local account storage')
        return
      }
    }
    setSettingsOpen(false)
    toast('Settings saved')
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
  const readingDayKeys = new Set(readingSessions.map((item) => {
    const date = new Date(item.date)
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }))
  const streakDate = new Date()
  streakDate.setHours(0, 0, 0, 0)
  let readingStreak = 0
  while (readingDayKeys.has(`${streakDate.getFullYear()}-${streakDate.getMonth()}-${streakDate.getDate()}`)) {
    readingStreak += 1
    streakDate.setDate(streakDate.getDate() - 1)
  }

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
           <button className="avatar" aria-label="Open profile" onClick={() => setProfileOpen(true)}>{session.name.charAt(0).toUpperCase()}</button>
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
                <div className="avatar large">{session.name.charAt(0).toUpperCase()}</div>
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
                    type="email"
                    value={accountEmail}
                    onChange={(event) => setAccountEmail(event.target.value)}
                    placeholder="Email address"
                  />
                </div>
                <button className="primary-button" style={{ width: '100%', marginTop: '1rem' }} onClick={saveSettings}>
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
            <span className="eyebrow">GOOD MORNING, {session.name.toUpperCase()}</span>
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
              <StreakParticles />
              <div className="streak-icon">
                <Flame size={19} />
              </div>
              <div>
                <strong>{readingStreak} day streak</strong>
                <span>{readingStreak ? 'Keep your rhythm' : 'Start your rhythm today'}</span>
              </div>
              <span className="streak-count">{readingStreak}</span>
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
              author={session.name}
              onUpdate={(updatedClub) => {
                setClubs((current) => current.map((item) => item.title === selectedClub.title ? updatedClub : item))
                setSelectedClub(updatedClub)
              }}
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
                      <HeroBook2D />
                      <div className="art-label">
                        {dailyVerse.text}
                        <span>{dailyVerse.ref}</span>
                      </div>
                    </div>
                  </section>

                  <ReadingPulse
                    books={books}
                    clubs={clubs}
                    readingGoal={readingGoal}
                    readingSessions={readingSessions}
                    onLogReading={() => {
                      const currentBook = books.find((book) => Number(book.progress) > 0 && Number(book.progress) < 100)
                      setReadingSessions((current) => [...current, { date: new Date().toISOString(), title: currentBook?.title || 'Reading time' }])
                      toast('Reading session logged')
                    }}
                    onLibrary={() => navigateTo('Library')}
                    onClubs={() => navigateTo('Book clubs')}
                  />
  
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
                          isLoading={loadingData}
                          onSave={() => handleSaveBook(book.title)}
                          onUpdateProgress={handleUpdateProgress}
                          onOpen={(selected) => { setPreviewBook(selected); navigateTo('Preview') }}
                        />
                      ))}
                      {loadingData && Array.from({ length: 3 }).map((_, i) => <BookCard key={`skeleton-book-${i}`} isLoading={true} />)}
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
                             isLoading={loadingData}
                             onJoin={() => handleJoinClub(club.title)}
                             onOpen={setSelectedClub}
                             joined={joinedClubs.includes(club.title)}
                           />
                         ))}
                         {loadingData && Array.from({ length: 2 }).map((_, i) => <ClubCard key={`skeleton-club-${i}`} isLoading={true} />)}
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
                <StoriesView books={books} clubs={clubs} stories={stories} author={session.name} onWrite={() => { setEditingStory(null); setWriterOpen(true) }} onRead={setReadingStory} onAuthor={setSelectedAuthor} />
              )}
              {active === 'Discover' && <PublicationHub books={books} stories={stories} clubs={clubs} author={session.name} onRead={setReadingStory} />}
               {active === 'Preview' && (
                 <div className="preview-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
                   <BookPreview books={books} book={previewBook} onSelect={setPreviewBook} />
                 </div>
               )}

              {active === 'Dashboard' && <WriterDashboard stories={stories} books={books} author={session.name} readingGoal={readingGoal} setReadingGoal={setReadingGoal} readingSessions={readingSessions} setReadingSessions={setReadingSessions} onWrite={() => { setEditingStory(null); setWriterOpen(true) }} onEdit={(story) => { setEditingStory(story); setWriterOpen(true) }} />}
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

function ReadingPulse({ books, clubs, readingGoal, readingSessions, onLogReading, onLibrary, onClubs }) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const count = readingSessions.filter((session) => new Date(session.date).toDateString() === date.toDateString()).length
    return { date, count }
  })
  const sessionsThisWeek = days.reduce((total, day) => total + day.count, 0)
  const currentBook = books.find((book) => Number(book.progress) > 0 && Number(book.progress) < 100)
  const goal = Math.max(1, Number(readingGoal) || 4)
  const progressPercent = Math.min(100, (sessionsThisWeek / goal) * 100)

  return (
    <section className="reading-pulse" aria-labelledby="reading-pulse-title">
      <div className="pulse-heading">
        <div><span className="eyebrow coral">YOUR READING LIFE</span><h2 id="reading-pulse-title">A little time adds up.</h2></div>
        <div className="pulse-goal-ring" style={{ position: 'relative', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="25" cy="25" r="22" fill="none" stroke="oklch(88% 0.02 80)" strokeWidth="4" />
            <circle cx="25" cy="25" r="22" fill="none" stroke="oklch(57% 0.16 35)" strokeWidth="4" strokeDasharray={138} strokeDashoffset={138 - (138 * progressPercent / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
          </svg>
          <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 700 }}>{Math.round(progressPercent)}%</span>
        </div>
      </div>
      <div className="pulse-layout">
        <div className="pulse-current-book">
          <div className="pulse-cover"><img src={currentBook?.image || books[0]?.image} alt="" /><span>{currentBook?.progress || 0}%</span></div>
          <div className="pulse-current-copy"><span className="eyebrow">BACK ON YOUR SHELF</span><strong>{currentBook?.title || 'Choose your next book'}</strong><small>{currentBook?.author || 'Your library is ready'}</small>
            <div className="pulse-progress" role="progressbar" aria-label="Current book progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={currentBook?.progress || 0}><span style={{ width: `${currentBook?.progress || 0}%` }} /></div>
          </div>
        </div>
        <div className="pulse-week">
          <div className="pulse-chart" aria-label={`${sessionsThisWeek} reading sessions this week`}>
            {days.map(({ date, count }, index) => <div className="pulse-day" key={date.toISOString()}><span className="pulse-bar-track"><i className={count ? 'has-session' : ''} style={{ height: `${count ? Math.min(100, 28 + count * 24) : 8}%` }} /></span><small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small></div>)}
          </div>
          <div className="pulse-summary"><strong>{sessionsThisWeek} <span>sessions</span></strong><small>One quiet moment at a time</small></div>
        </div>
      </div>
      <div className="pulse-actions"><button className="text-button" onClick={onLibrary}><Library size={15} /> Open library</button><button className="text-button" onClick={onClubs}><Users size={15} /> {clubs.length} circles</button><button className="primary-button" onClick={onLogReading}><Clock3 size={15} /> Log reading</button><span className="pulse-goal-hint">Weekly aim · {goal} sessions</span></div>
    </section>
  )
}

function HeroBook2D() {
  return (
    <div className="hero-2d-art" style={{ 
      position: 'relative', 
      width: '300px', 
      height: '400px', 
      display: 'grid', 
      placeItems: 'center', 
      zIndex: 1 
    }}>
      <div style={{ 
        width: '200px', 
        height: '280px', 
        background: 'oklch(60% .1 40)', 
        boxShadow: '15px 15px 30px rgba(0,0,0,0.3), inset -5px 0 10px rgba(0,0,0,0.2)', 
        borderRadius: '4px 12px 12px 4px',
        position: 'relative',
        borderLeft: '12px solid oklch(40% .1 30)'
      }}>
        <div style={{ 
          position: 'absolute', 
          inset: '20px', 
          border: '1px solid rgba(255,255,255,0.2)', 
          borderRadius: '2px' 
        }} />
      </div>
    </div>
  )
}

function BookCard({ book, onSave, onOpen, onUpdateProgress, isLoading }) {
  if (isLoading) {
    return (
      <article className="book-card">
        <div className="book-cover skeleton skeleton-card" />
        <div className="book-info">
          <div className="skeleton skeleton-text" style={{ width: '70%' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          <div className="progress-row">
            <div className="progress skeleton" />
            <div className="skeleton" style={{ width: '20px', height: '10px' }} />
          </div>
        </div>
      </article>
    )
  }
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

function ClubCard({ club, onJoin, onOpen, joined = false, isLoading }) {
  if (isLoading) {
    return (
      <article className="club-card">
        <div className="skeleton skeleton-circle" style={{ width: '65px', height: '65px' }} />
        <div className="club-details">
          <div className="skeleton skeleton-text" style={{ width: '60px', height: '8px' }} />
          <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton skeleton-text" style={{ width: '180px', height: '12px' }} />
        </div>
        <div className="skeleton" style={{ width: '60px', height: '30px' }} />
      </article>
    )
  }
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
  
  const isFounder = books.length === 0

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
        {isFounder && (
          <div className="founder-empty-state">
            <div className="founder-icon"><Library size={32} /></div>
            <h2>Your library is a blank page.</h2>
            <p>Every great reading life starts with a single book. Suggest your first read to begin your journey.</p>
            <button className="primary-button" style={{ width: 'auto', marginTop: '20px' }} onClick={() => setSuggestOpen(true)}>
              Suggest a book <Plus size={16} />
            </button>
          </div>
        )}
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
  
  const isFounder = clubs.length === 0

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
        {isFounder && (
          <div className="founder-empty-state">
            <div className="founder-icon"><Users size={32} /></div>
            <h2>No circles yet.</h2>
            <p>Reading is a solitary act, but understanding is a communal one. Start a new circle and invite others into the conversation.</p>
            <button className="primary-button" style={{ width: 'auto', marginTop: '20px' }} onClick={() => setShowCreateModal(true)}>
              Create a club <Plus size={16} />
            </button>
          </div>
        )}
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

function StoriesView({ books = defaultBooks, clubs = defaultClubs, stories = defaultStories, author = 'Reader', onWrite, onRead, onAuthor }) {
  const toast = useContext(ToastContext)
  const [storyLikes, setStoryLikes] = useStoredState('rooted.story-likes', {})
  const [subscribedAuthors, setSubscribedAuthors] = useStoredState('rooted.subscribed-authors', [])
  const [feedFilter, setFeedFilter] = useState('For you')
  const [storyQuery, setStoryQuery] = useState('')

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

  const visibleStories = stories.filter((story) => {
    if (feedFilter === 'Following' && !subscribedAuthors.includes(story.author)) return false
    if (feedFilter === 'Liked' && !storyLikes[story.title]?.liked) return false
    const normalizedQuery = storyQuery.trim().toLowerCase()
    return !normalizedQuery || [story.title, story.author, story.excerpt].some((value) => value?.toLowerCase().includes(normalizedQuery))
  }).sort((first, second) => feedFilter === 'Most loved'
    ? (storyLikes[second.title]?.count ?? second.likes ?? 0) - (storyLikes[first.title]?.count ?? first.likes ?? 0)
    : 0)

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
          <div className="story-list-heading">
            <span className="eyebrow">FROM THE COMMUNITY</span>
            <h2>Freshly published</h2>
          </div>
          <div className="story-feed-toolbar">
            <div className="story-filter-tabs" role="tablist" aria-label="Story feed filters">
              {['For you', 'Following', 'Liked', 'Most loved'].map((item) => <button key={item} role="tab" aria-selected={feedFilter === item} className={feedFilter === item ? 'story-filter active' : 'story-filter'} onClick={() => setFeedFilter(item)}>{item}</button>)}
            </div>
            <label className="story-search"><Search size={15} /><input value={storyQuery} onChange={(event) => setStoryQuery(event.target.value)} placeholder="Find a story" aria-label="Search stories" /></label>
          </div>
          {visibleStories.map((story, index) => (
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
          {visibleStories.length === 0 && <div className="story-empty"><BookOpen size={20} /><strong>No stories in this view yet.</strong><span>Try another filter or follow a writer you enjoy.</span></div>}
        </div>
      </div>
 
      <PublicationHub books={books} clubs={clubs} stories={stories} author={author} onRead={onRead} />
      <GenreOrganizer />
    </>
  )
}

function StoryReader({ story, onBack, onAuthor }) {
  const toast = useContext(ToastContext)
  const [fontSize, setFontSize] = useState(20)
  const [savedStories, setSavedStories] = useStoredState('rooted.saved-stories', [])
  const [highlights, setHighlights] = useStoredState('rooted.highlights', [])
  const [selection, setSelection] = useState('')
  const [isPiercing, setIsPiercing] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [reflection, setReflection] = useState('')
  const [savingReflection, setSavingReflection] = useState(false)
  const saved = savedStories.includes(story.title)
  const content = story.content || story.excerpt || 'This story is ready to be read. Check back soon for the full piece.'

  const handlePierce = async () => {
    if (!selection) return
    setIsPiercing(true)
    setAiQuestion('')
    try {
      const result = await api.post('/ai/pierce', { text: selection })
      setAiQuestion(result.question)
    } catch (err) {
      toast('The companion is silent right now. Try again later.')
    } finally {
      setIsPiercing(false)
    }
  }

  const saveSoulMarker = async () => {
    if (!reflection.trim()) return
    setSavingReflection(true)
    try {
      const user = supabase.auth.getUser()
      const { data: { user: currentUser } } = await user
      
      await api.post('/soul-markers', {
        user_id: currentUser?.id,
        source_text: selection,
        ai_question: aiQuestion,
        user_reflection: reflection,
        source_type: 'story',
        source_id: story.title,
      })
      toast('Reflection saved to your soul map')
      setSelection('')
      setReflection('')
      setAiQuestion('')
    } catch (err) {
      toast('Could not save reflection.')
    } finally {
      setSavingReflection(false)
    }
  }

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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="text-button" onClick={saveSelection}>Save highlight</button>
              <button className="primary-button" style={{ fontSize: '11px', padding: '4px 12px' }} onClick={handlePierce}>
                <Sparkles size={14} /> Ask the Soul
              </button>
            </div>
          </div>
        )}
        {aiQuestion && (
          <div className="soul-marker-modal">
            <div className="soul-marker-content">
              <button className="close-button" onClick={() => { setAiQuestion(''); setReflection(''); setSelection(''); }}>
                <X size={20} />
              </button>
              <span className="eyebrow coral">SOUL REFLECTION</span>
              <p className="soul-question">{aiQuestion}</p>
              <textarea 
                className="soul-textarea" 
                placeholder="Listen to your heart... what is the answer?" 
                value={reflection} 
                onChange={e => setReflection(e.target.value)}
              />
              <button 
                className="primary-button" 
                onClick={saveSoulMarker} 
                disabled={!reflection.trim() || savingReflection}
              >
                {savingReflection ? 'Saving...' : 'Save to Soul Map'}
              </button>
            </div>
          </div>
        )}
        {highlights.filter((item) => item.title === story.title).length > 0 && (
          <section className="saved-highlights"><h2>Highlights</h2>{highlights.filter((item) => item.title === story.title).map((item) => <blockquote key={item.createdAt}>{item.text}</blockquote>)}</section>
        )}
      </div>
    </article>
  )
}

function ClubProfile({ club, onBack, onJoin, joined, onUpdate, author = 'Reader' }) {
  const toast = useContext(ToastContext)
  const [tab, setTab] = useState('Overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [settingsByClub, setSettingsByClub] = useStoredState('rooted.club-settings', {})
  const [postsByClub, setPostsByClub] = useStoredState('rooted.club-discussions', {})
  const preferences = settingsByClub[club.title] || { reminders: true, digest: true, pace: 'Weekly' }
  const [clubBasics, setClubBasics] = useState({
    title: club.title,
    book: club.book,
    meeting: club.meeting || 'Sunday · 6:30 PM',
    privacy: club.privacy || 'Invite only',
    memberApproval: club.memberApproval ?? true,
  })
  const posts = postsByClub[club.title] || defaultClubDiscussion
  const [unlockedMilestones, setUnlockedMilestones] = useStoredState(`rooted.unlocked-${club.title}`, [1])

  const milestones = [
    { id: 1, title: 'Chapters 1–4: The Call to Silence', range: '1-4' },
    { id: 2, title: 'Chapters 5–8: The Weight of Word', range: '5-8' },
    { id: 3, title: 'Chapters 9–12: The Narrow Way', range: '9-12' },
    { id: 4, title: 'The Final Page: Stillness', range: '13+' },
  ]

  const currentMilestone = milestones.find(m => m.id === Math.max(...unlockedMilestones))

  const unlockMilestone = (id) => {
    if (!unlockedMilestones.includes(id)) {
      setUnlockedMilestones(current => [...current, id])
      toast('New discussion threads unlocked')
    }
  }

  useEffect(() => {
    setClubBasics({
      title: club.title,
      book: club.book,
      meeting: club.meeting || 'Sunday · 6:30 PM',
      privacy: club.privacy || 'Invite only',
      memberApproval: club.memberApproval ?? true,
    })
  }, [club.title, club.book, club.meeting, club.privacy, club.memberApproval])
  const memberNames = ['Amara Okafor', 'Paps O.', author, 'Ifeoluwa A.']

  const updatePreference = (key, value) => {
    setSettingsByClub((current) => ({
      ...current,
      [club.title]: { ...preferences, [key]: value },
    }))
  }

  const saveClubSettings = () => {
    const title = clubBasics.title.trim()
    const book = clubBasics.book.trim()
    if (!title || !book) {
      toast('Add a club name and current book')
      return
    }
    const updatedClub = { ...club, ...clubBasics, title, book, time: clubBasics.meeting }
    onUpdate?.(updatedClub)
    if (title !== club.title) {
      setSettingsByClub((current) => {
        const next = { ...current }
        if (next[club.title]) {
          next[title] = next[club.title]
          delete next[club.title]
        }
        return next
      })
    }
    toast('Club settings saved')
  }

  const postMessage = (event) => {
    event.preventDefault()
    const content = message.trim()
    if (!content) return
    setPostsByClub((current) => ({
      ...current,
      [club.title]: [{ author, time: 'Just now', text: content, likes: 0, milestone: currentMilestone.id }, ...posts],
    }))
    setMessage('')
    toast('Your note was added to the discussion')
  }

  const toggleLike = (postIndex) => {
    setPostsByClub((current) => {
      const currentPosts = current[club.title] || posts
      return {
        ...current,
        [club.title]: currentPosts.map((post, index) => index === postIndex
          ? { ...post, liked: !post.liked, likes: Math.max(0, post.likes + (post.liked ? -1 : 1)) }
          : post),
      }
    })
  }

  return (
    <section className="club-profile">
      <div className="club-profile-toolbar">
        <button className="text-button" onClick={onBack}><ChevronRight className="back-chevron" size={16} /> All book clubs</button>
        <button className={`icon-button club-settings-trigger ${settingsOpen ? 'active' : ''}`} onClick={() => setSettingsOpen((value) => !value)} aria-label="Open club settings" title="Club settings"><Settings2 size={17} /></button>
      </div>
      <div className="club-profile-hero">
        <img src={club.image} alt="" />
        <div>
          <span className="eyebrow coral">ROOTED BOOK CLUB</span>
          <h1>{club.title}</h1>
          <p>Reading <strong>{club.book}</strong> together. A small circle for thoughtful pages and honest conversation.</p>
          <div className="club-profile-meta"><span><Users size={14} /> {club.members} readers</span><span><Clock3 size={14} /> {club.time}</span></div>
          <button className="primary-button" onClick={onJoin} disabled={joined}>{joined ? 'Request sent' : 'Request to join'}</button>
        </div>
      </div>

      {settingsOpen && (
        <section className="club-settings-panel">
          <div className="club-section-heading"><div><span className="eyebrow coral">YOUR PREFERENCES</span><h2>Club settings</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close club settings"><X size={17} /></button></div>
          <div className="club-settings-grid">
            <label className="club-setting-row"><span><strong>Club name</strong><small>Shown to members</small></span><input className="club-settings-text" value={clubBasics.title} onChange={(event) => setClubBasics((current) => ({ ...current, title: event.target.value }))} maxLength={80} /></label>
            <label className="club-setting-row"><span><strong>Current book</strong><small>The group's shared read</small></span><input className="club-settings-text" value={clubBasics.book} onChange={(event) => setClubBasics((current) => ({ ...current, book: event.target.value }))} maxLength={120} /></label>
            <label className="club-setting-row"><span><strong>Meet cadence</strong><small>Set the gathering rhythm</small></span><select value={clubBasics.meeting} onChange={(event) => setClubBasics((current) => ({ ...current, meeting: event.target.value }))}><option>Sunday · 6:30 PM</option><option>Wednesday · 7:00 PM</option><option>Saturday · 10:00 AM</option><option>Monthly · first Sunday</option></select></label>
            <label className="club-setting-row"><span><strong>Visibility</strong><small>Who can discover the club</small></span><select value={clubBasics.privacy} onChange={(event) => setClubBasics((current) => ({ ...current, privacy: event.target.value }))}><option>Invite only</option><option>Discoverable</option></select></label>
            <label className="club-setting-row"><span><strong>Approve members</strong><small>Review requests before they join</small></span><input type="checkbox" checked={clubBasics.memberApproval} onChange={(event) => setClubBasics((current) => ({ ...current, memberApproval: event.target.checked }))} /></label>
            <label className="club-setting-row"><span><strong>Meeting reminders</strong><small>Get a nudge before the next gathering</small></span><input type="checkbox" checked={preferences.reminders} onChange={(event) => updatePreference('reminders', event.target.checked)} /></label>
            <label className="club-setting-row"><span><strong>Weekly digest</strong><small>Receive the discussion highlights</small></span><input type="checkbox" checked={preferences.digest} onChange={(event) => updatePreference('digest', event.target.checked)} /></label>
            <label className="club-setting-row"><span><strong>Reading pace</strong><small>How often the group checks in</small></span><select value={preferences.pace} onChange={(event) => updatePreference('pace', event.target.value)}><option>Weekly</option><option>Every two weeks</option><option>Monthly</option></select></label>
          </div>
          <button className="primary-button club-settings-save" onClick={saveClubSettings}><Check size={15} /> Save club settings</button>
        </section>
      )}

      <nav className="club-tabs" aria-label="Club sections">
        {['Overview', 'Discussion', 'Reading plan', 'Members'].map((item) => <button key={item} className={tab === item ? 'club-tab active' : 'club-tab'} onClick={() => setTab(item)}>{item}</button>)}
      </nav>

      {tab === 'Overview' && (
        <div className="club-profile-grid">
          <section className="club-overview-copy"><span className="eyebrow">THIS WEEK</span><h2>A small table for good conversation.</h2><p>Read at your own pace, bring a question, and make room for different perspectives. New members can join when a seat opens.</p>
            <div className="club-next-meeting"><CalendarDays size={19} /><div><strong>Next gathering</strong><span>Sunday · 6:30 PM · 45 minutes</span></div><button className="text-button" onClick={() => toast('Meeting added to your reading calendar')}>Add reminder</button></div>
            <div className="club-activity"><span className="eyebrow">RECENT ACTIVITY</span><p><strong>Amara</strong> added a question to this week's reading.</p><p><strong>Paps</strong> finished the first section.</p></div>
          </section>
          <ClubGuide clubs={[club]} />
        </div>
      )}

       {tab === 'Discussion' && (
         <section className="club-discussion">
           <div className="club-section-heading"><div><span className="eyebrow">THE CONVERSATION</span><h2>Leave room for a new thought.</h2></div><span className="club-live-count"><span /> {memberNames.length} readers</span></div>
           <form className="club-compose" onSubmit={postMessage}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Reflect on ${currentMilestone.title}...`} maxLength={700} aria-label="Write to the club discussion" /><div><span>{message.length}/700</span><button className="primary-button" disabled={!message.trim()}><Send size={15} /> Post reflection</button></div></form>
           <div className="club-discussion-list">
             {posts.map((post, index) => {
               const isLocked = post.milestone && !unlockedMilestones.includes(post.milestone);
               return (
                 <article className={`club-discussion-post ${isLocked ? 'locked-post' : ''}`} key={`${post.author}-${post.time}-${index}`}>
                   <span className="avatar small">{post.author.charAt(0)}</span>
                   <div className="club-post-content">
                     <div><strong>{post.author}</strong><time>{post.time}</time></div>
                     <p style={{ filter: isLocked ? 'blur(6px)' : 'none', opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>{post.text}</p>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <button className={post.liked ? 'club-like active' : 'club-like'} onClick={() => toggleLike(index)} aria-label={`Appreciate ${post.author}'s reflection`}><Heart size={14} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}</button>
                       {isLocked && <span className="locked-badge">Milestone {post.milestone}</span>}
                     </div>
                   </div>
                 </article>
               );
             })}
           </div>
           {unlockedMilestones.length < milestones.length && (
             <div className="milestone-unlocker" style={{ marginTop: '2rem', textAlign: 'center', padding: '20px', background: 'oklch(90% 0.02 80)', borderRadius: '16px', border: '1px dashed oklch(70% 0.05 60)' }}>
               <p style={{ fontSize: '13px', marginBottom: '12px' }}>Ready for the next part of the journey?</p>
               <button className="primary-button" onClick={() => unlockMilestone(unlockedMilestones.length + 1)}>
                 Unlock Milestone {unlockedMilestones.length + 1} <ChevronRight size={16} />
               </button>
             </div>
           )}
         </section>
       )}


      {tab === 'Reading plan' && (
        <section className="club-reading-plan"><div className="club-section-heading"><div><span className="eyebrow">READING TOGETHER</span><h2>A gentle pace, one week at a time.</h2></div><span className="club-plan-status">WEEK 1 OF 4</span></div>
          {['Begin with the opening pages', 'Notice what changes', 'Bring one question', 'Gather and reflect'].map((week, index) => <article className={`reading-week ${index === 0 ? 'current' : ''}`} key={week}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{week}</strong><small>{index === 0 ? 'This week · pages 1–48' : `Week ${index + 1} · Coming up`}</small></div><span className="week-state">{index === 0 ? 'IN PROGRESS' : 'UP NEXT'}</span></article>)}
        </section>
      )}

      {tab === 'Members' && (
        <section className="club-members"><div className="club-section-heading"><div><span className="eyebrow">YOUR READING CIRCLE</span><h2>People around the table.</h2></div><span className="club-live-count"><span /> {memberNames.length} members</span></div>
          <div className="club-member-grid">{memberNames.map((name, index) => <article className="club-member" key={name}><span className={`avatar member-avatar member-color-${index}`}>{name.charAt(0)}</span><div><strong>{name}</strong><small>{index === 0 ? 'Host' : index === 2 ? 'You' : 'Reader'}</small></div><button className="icon-button" aria-label={`Message ${name}`} onClick={() => { setTab('Discussion'); setMessage(`@${name} `) }}><MessageCircle size={16} /></button></article>)}</div>
        </section>
      )}
    </section>
  )
}

function SoulMap() {
  const toast = useContext(ToastContext)
  const [markers, setMarkers] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMarkers = async () => {
      setBusy(true)
      setError('')
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('You must be signed in to view your soul map.')
        const result = await api.get(`/soul-markers?user_id=${user.id}`)
        setMarkers(result.markers || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(false)
      }
    }
    loadMarkers()
  }, [])

  return (
    <section className="soul-map-container">
      <div className="view-heading">
        <div>
          <span className="eyebrow coral">JOURNEY OF THE HEART</span>
          <h1>Your Soul Map</h1>
          <p>A gallery of breakthroughs, reflections, and quiet realizations.</p>
        </div>
      </div>

      {busy && <div className="soul-empty"><Sparkles size={20} /><span>Tracing your journey...</span></div>}
      {error && <div className="soul-empty error"><X size={20} /><span>{error}</span></div>}
      
      {!busy && !error && markers.length === 0 && (
        <div className="soul-empty">
          <BookOpen size={40} />
          <strong>Your map is currently a blank page.</strong>
          <span>Highlight a passage in a story and "Ask the Soul" to create your first marker.</span>
        </div>
      )}

      <div className="soul-map-grid">
        {markers.map((marker, index) => (
          <article className="soul-card" key={marker.id || index}>
            <span className="source">{marker.source_type} · {marker.source_id}</span>
            <span className="passage">"{marker.source_text}"</span>
            <span className="question">{marker.ai_question}</span>
            <p className="reflection">{marker.user_reflection}</p>
          </article>
        ))}
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
  const [promptIndex, setPromptIndex] = useState(0)
  const [channel, setChannel] = useState(null)

  useEffect(() => {
    if (!initialStory?.title) return;

    const storyChannel = supabase.channel(`story-edit-${initialStory.title}`)
      .on('broadcast', { event: 'edit' }, ({ payload }) => {
        if (payload.body !== undefined && payload.body !== body) setBody(payload.body);
        if (payload.title !== undefined && payload.title !== title) setTitle(payload.title);
      })
      .subscribe();

    setChannel(storyChannel);

    return () => {
      supabase.removeChannel(storyChannel);
    };
  }, [initialStory?.title, body, title]);

  const handleTextChange = (updater, field, value) => {
    updater();
    setIsSaving(true);
    window.setTimeout(() => setIsSaving(false), 1000);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'edit',
        payload: { [field]: value },
      });
    }
  }


  const cyclePrompt = () => {
    setPromptIndex((prev) => (prev + 1) % reflectionPrompts.length)
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
      const result = await api.post('/ai/assist', { action, text: body })
      setSuggestion({ action, text: result.result })
    } catch (error) {
      setAiError(error.message || 'The AI assistant is resting. Try again later.')
    } finally {
      setAiAction('')
    }
  }

  const applySuggestion = () => {
    if (!suggestion) return
    const updatedBody = suggestion.action === 'headline'
      ? `${suggestion.text}\n\n${body}`
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
          <button onClick={() => requestAssistance('refine')} disabled={Boolean(aiAction)} title="Refine tone and flow">
            <WandSparkles size={15} /> Refine
          </button>
          <button onClick={() => requestAssistance('summarize')} disabled={Boolean(aiAction)} title="Create a poetic summary">
            <FileText size={15} /> Summarize
          </button>
          <button onClick={() => requestAssistance('headline')} disabled={Boolean(aiAction)} title="Suggest minimalist headlines">
            <Check size={15} /> Headlines
          </button>
          {aiAction && <span className="writer-ai-state" role="status">Listening to the silence...</span>}
          {aiError && <span className="writer-ai-error" role="alert">{aiError}</span>}
        </div>

        <main className="full-page-editor">
          <div className="book-editor-spread">
            <div className="book-spine" />
            <div className="book-page book-page-left">
              <span className="eyebrow coral">NEW STORY</span>
                <input
                  className="editor-title"
                  placeholder="Untitled story"
                  value={title}
                  onChange={(event) => handleTextChange(() => setTitle(event.target.value), 'title', event.target.value)}
                  autoFocus
                />

              <div className="editor-container">
                <textarea
                  className="editor-body"
                  placeholder={body.trim() ? "Continue writing..." : `Reflection: ${reflectionPrompts[promptIndex].text}`}
                  value={body}
                  onChange={(event) => handleTextChange(() => setBody(event.target.value), 'body', event.target.value)}
                  rows="18"
                />
                {!body.trim() && (
                  <div className="prompt-overlay">
                    <div className="prompt-content">
                      <span className="prompt-category">{reflectionPrompts[promptIndex].category}</span>
                      <p>{reflectionPrompts[promptIndex].text}</p>
                      <button className="text-button prompt-cycle" onClick={cyclePrompt}>
                        <Sparkles size={14} /> Different prompt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="book-page book-page-right">
              <div className="page-content-placeholder">
                <div className="page-decoration"></div>
                <p className="page-hint">Your words will flow here...</p>
              </div>
            </div>
          </div>
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

function PublicationHub({ books = defaultBooks, stories = defaultStories, clubs = defaultClubs, author = 'Reader', onRead }) {
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
               <span className="avatar small">{author.charAt(0).toUpperCase()}</span>
               <div><strong>{author}</strong><p>{item.content}</p><span>Just now</span></div>
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

function ReadingMomentumWidget({ readingSessions, readingGoal }) {
  const now = new Date()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      date,
      count: readingSessions.filter((session) => new Date(session.date).toDateString() === date.toDateString()).length,
    }
  })
  
  const sessionsThisWeek = weekDays.reduce((total, day) => total + day.count, 0)
  const goalProgress = Math.min(100, Math.round((sessionsThisWeek / Math.max(1, Number(readingGoal))) * 100))

  return (
    <section className="momentum-widget">
      <div className="momentum-heading">
        <div><span className="eyebrow coral">READING MOMENTUM</span><h2 style={{ fontSize: '20px' }}>Your Weekly Flow</h2></div>
        <div className="momentum-goal">Goal: <strong style={{ fontSize: '12px' }}>{readingGoal} sessions</strong></div>
      </div>
      <div className="momentum-visual">
        <svg viewBox="0 0 400 100" className="momentum-waveform">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(57% .16 35)" />
              <stop offset="100%" stopColor="oklch(74% .1 62)" />
            </linearGradient>
          </defs>
          {weekDays.map((day, i) => {
            const x = i * 60 + 20
            const height = day.count * 20 + 10
            return (
              <g key={i}>
                <rect x={x} y={100 - height} width="30" height={height} rx="4" fill="url(#waveGradient)" opacity={0.4 + (day.count * 0.2)}>
                  <animate attributeName="height" from="0" to={height} dur="0.8s" fill="freeze" />
                  <animate attributeName="y" from="100" to={100 - height} dur="0.8s" fill="freeze" />
                </rect>
                <text x={x + 15} y="95" textAnchor="middle" fontSize="10" fill="oklch(56% .03 55)">
                  {day.date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="momentum-footer">
        <div className="momentum-progress-container">
          <div className="momentum-progress-bar">
            <span style={{ width: `${goalProgress}%` }} />
          </div>
          <span className="momentum-percentage">{goalProgress}% of weekly goal</span>
        </div>
        <div className="momentum-stats">
          <div className="momentum-stat"><strong style={{ fontSize: '20px' }}>{sessionsThisWeek}</strong><span style={{ fontSize: '10px' }}>sessions</span></div>
        </div>
      </div>
    </section>
  )
}

function WriterDashboard({ stories = [], books = [], author, readingGoal, setReadingGoal, readingSessions = [], setReadingSessions, onWrite, onEdit }) {
  const myStories = stories.filter((story) => story.author === author)
  const [selectedBook, setSelectedBook] = useState(books[0]?.title || '')
  const now = new Date()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      date,
      count: readingSessions.filter((session) => new Date(session.date).toDateString() === date.toDateString()).length,
    }
  })
  const sessionsThisWeek = weekDays.reduce((total, day) => total + day.count, 0)
  const goalProgress = Math.min(100, Math.round((sessionsThisWeek / Math.max(1, Number(readingGoal))) * 100))
  const currentlyReading = books.filter((book) => Number(book.progress) > 0 && Number(book.progress) < 100)
  const logSession = () => {
    setReadingSessions((current) => [...current, { date: new Date().toISOString(), title: selectedBook || 'Reading time' }])
  }

  return (
    <div className="view dashboard-view">
      <div className="view-heading">
        <div><span className="eyebrow coral">YOUR READING DESK</span><h1 style={{ textTransform: 'uppercase', letterSpacing: '.1em' }}>A life made of pages.</h1><p>Your reading practice, stories, and next small step.</p></div>
        <button className="primary-button" onClick={onWrite}><PenLine size={16} /> Write a story</button>
      </div>
      <ReadingMomentumWidget readingSessions={readingSessions} readingGoal={readingGoal} />
      <section className="dashboard-goal">

        <div className="dashboard-goal-heading"><div><span className="eyebrow">WEEKLY READING RHYTHM</span><h2>Keep a little room for reading.</h2></div><label>Goal <select value={readingGoal} onChange={(event) => setReadingGoal(Number(event.target.value))} aria-label="Weekly reading goal">{[2, 3, 4, 5, 6, 7].map((goal) => <option key={goal} value={goal}>{goal} sessions</option>)}</select></label></div>
        <div className="dashboard-goal-layout">
          <div className="dashboard-week-chart" aria-label={`${sessionsThisWeek} of ${readingGoal} reading sessions this week`}>
            {weekDays.map(({ date, count }) => <div className="dashboard-day" key={date.toISOString()}><span className="dashboard-bar-track"><i className={count ? 'has-session' : ''} style={{ height: `${count ? Math.min(100, 28 + count * 24) : 8}%` }} /></span><small>{date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</small></div>)}
          </div>
          <div className="dashboard-goal-summary"><strong>{sessionsThisWeek}<span> / {readingGoal}</span></strong><p>reading sessions this week</p><div className="dashboard-goal-track" role="progressbar" aria-label="Weekly reading goal" aria-valuemin="0" aria-valuemax={readingGoal} aria-valuenow={sessionsThisWeek}><span style={{ width: `${goalProgress}%` }} /></div><label>Log a session<select value={selectedBook} onChange={(event) => setSelectedBook(event.target.value)} aria-label="Choose a book for your session">{books.map((book) => <option key={book.title} value={book.title}>{book.title}</option>)}</select></label><button className="text-button" onClick={logSession}><Plus size={15} /> Add a reading session</button></div>
        </div>
      </section>

      <div className="dashboard-stat-row">
        <article><BookOpen size={17} /><span><strong>{currentlyReading.length}</strong><small>In progress</small></span></article>
        <article><Bookmark size={17} /><span><strong>{books.filter((book) => book.saved).length}</strong><small>Saved for later</small></span></article>
        <article><PenLine size={17} /><span><strong>{myStories.length}</strong><small>Published stories</small></span></article>
      </div>

      <section className="dashboard-archive">
        <div className="section-heading"><div><span className="eyebrow">YOUR WORDS</span><h2>Story archive</h2></div><button className="text-button" onClick={onWrite}><Plus size={15} /> New story</button></div>
        {myStories.length ? <div className="story-list">{myStories.map((story, index) => <article className="story-row" key={`${story.title}-${index}`}><span className="story-number">{String(index + 1).padStart(2, '0')}</span><div style={{ flex: 1 }}><h3>{story.title}</h3><p>{story.readTime || 5} min read · {story.views || 0} reads</p></div><button className="text-button" onClick={() => onEdit?.(story)}>Edit</button></article>)}</div> : <div className="dashboard-empty"><PenLine size={19} /><div><strong>Your first story can start small.</strong><p>Write a reflection, note, or question for your reading circle.</p></div><button className="text-button" onClick={onWrite}>Start writing <ChevronRight size={15} /></button></div>}
      </section>
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
          <span className="eyebrow coral">A QUIETER WAY TO READ</span>
          <h1>{selectedBook?.title || 'The old book, reopened.'}</h1>
          <p>Open the cover, settle in, and turn a page at your own pace.</p>
        </div>
        <span className="preview-status">2D BOOK EDITION</span>
      </div>
 
      <PreviewImageRail books={books} onSelect={onSelect} />
 
      <BookReader book={selectedBook} />
    </section>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
