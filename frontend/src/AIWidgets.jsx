import { useState } from 'react'
import { ArrowUp, BookOpen, MessageCircle, Sparkles } from 'lucide-react'
import { ai } from './api'
import './ai.css'

const genres = [
  'Spiritual formation', 'Fantasy', 'Mystery', 'Romance', 'Memoir', 'Poetry',
  'Horror', 'Thriller', 'Science fiction', 'Biography', 'Literary fiction',
]

function AIStatus({ busy, error }) {
  if (busy) return <p className="ai-status" role="status">Thinking...</p>
  if (error) return <p className="ai-error" role="alert">{error}</p>
  return null
}

export function GenreOrganizer() {
  const [story, setStory] = useState('')
  const [sections, setSections] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await ai.analyzeGenre({ text: story })
      setSections(result.sections || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="genre-organizer">
      <div className="organizer-heading">
        <div>
          <span className="eyebrow coral">WRITER'S ASSISTANT</span>
          <h2>Let the story find its shelf.</h2>
          <p>Get a model-based genre and rationale for each section of your draft.</p>
        </div>
        <span className="ai-badge"><Sparkles size={14} /> AI</span>
      </div>

      <div className="genre-catalog">
        {genres.map((genre) => <span key={genre}>{genre}</span>)}
      </div>

      <div className="organizer-workspace">
        <textarea
          value={story}
          onChange={(event) => setStory(event.target.value)}
          placeholder="Paste a draft. Separate sections with a blank line."
          aria-label="Story sections for genre analysis"
          maxLength={12000}
        />
        <div className="organizer-results" aria-live="polite">
          {sections.length === 0 ? (
            <div className="organizer-empty"><Sparkles size={18} /><span>Genre suggestions will appear here.</span></div>
          ) : sections.map(({ section, genre, rationale }, index) => (
            <article className="genre-result" key={`${section}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><p>{section}</p><strong>{genre}</strong>{rationale && <small>{rationale}</small>}</div>
            </article>
          ))}
        </div>
      </div>

      <AIStatus busy={busy} error={error} />
      <button className="primary-button organize-button" onClick={analyze} disabled={!story.trim() || busy}>
        <Sparkles size={16} />
        {busy ? 'Analyzing...' : 'Analyze sections'}
      </button>
    </section>
  )
}

export function AIRecommendations({ books }) {
  const [preferences, setPreferences] = useState('')
  const [mood, setMood] = useState('Seeking')
  const [recommendations, setRecommendations] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const moods = [
    { label: 'Seeking', icon: '🔍', desc: 'Looking for truth and direction' },
    { label: 'Restless', icon: '🌪️', desc: 'Searching for peace and stillness' },
    { label: 'Joyful', icon: '✨', desc: 'Celebrating faith and life' },
    { label: 'Grieving', icon: '🕯️', desc: 'Finding comfort in the dark' },
    { label: 'Curious', icon: '📖', desc: 'Exploring new perspectives' },
  ]

  const getRecommendations = async () => {
    setBusy(true)
    setError('')
    try {
      const combinedPreferences = `Mood: ${mood}. ${preferences}`
      const result = await ai.recommend({ preferences: combinedPreferences, books })
      setRecommendations(result.recommendations || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ai-tool-panel">
      <div className="ai-tool-title"><BookOpen size={18} /><div><strong>Reading companion</strong><span>Recommendations for your current season</span></div></div>
      
      <div className="mood-selector" aria-label="Select your current mood">
        {moods.map((m) => (
          <button 
            key={m.label} 
            className={`mood-chip ${mood === m.label ? 'active' : ''}`}
            onClick={() => setMood(m.label)}
            title={m.desc}
          >
            <span className="mood-icon">{m.icon}</span>
            <span className="mood-label">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="ai-inline-form">
        <input
          value={preferences}
          onChange={(event) => setPreferences(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && (preferences.trim() || mood) && getRecommendations()}
          placeholder="What specifically are you looking for?"
          aria-label="Reading interests"
          maxLength={1000}
        />
        <button className="icon-command" onClick={getRecommendations} disabled={(!preferences.trim() && !mood) || busy} aria-label="Get recommendations" title="Get recommendations">
          <ArrowUp size={17} />
        </button>
      </div>
      <AIStatus busy={busy} error={error} />
      {recommendations.length > 0 && (
        <div className="ai-recommendation-list" aria-live="polite">
          {recommendations.map((book) => (
            <article key={book.title}><strong>{book.title}</strong><span>{book.author}</span><p>{book.reason}</p></article>
          ))}
        </div>
      )}
      {!busy && !error && recommendations.length === 0 && preferences && <p className="ai-status">No matches yet. Try a different reading interest.</p>}
    </section>
  )
}

export function ClubGuide({ clubs }) {
  const [clubTitle, setClubTitle] = useState(clubs[0]?.title || '')
  const [guide, setGuide] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedClub = clubs.find((club) => club.title === clubTitle)

  const createGuide = async () => {
    if (!selectedClub) return
    setBusy(true)
    setError('')
    try {
      setGuide(await ai.clubGuide({ club: selectedClub.title, book: selectedClub.book }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ai-tool-panel club-guide-panel">
      <div className="ai-tool-title"><MessageCircle size={18} /><div><strong>Discussion guide</strong><span>Questions for a thoughtful conversation</span></div></div>
      <div className="ai-guide-controls">
        <select value={clubTitle} onChange={(event) => { setClubTitle(event.target.value); setGuide(null) }} aria-label="Choose a book club">
          {clubs.map((club) => <option key={club.title} value={club.title}>{club.title} · {club.book}</option>)}
        </select>
        <button className="text-button" onClick={createGuide} disabled={!selectedClub || busy}>
          <Sparkles size={15} />{busy ? 'Preparing...' : 'Generate guide'}
        </button>
      </div>
      <AIStatus busy={busy} error={error} />
      {guide && <div className="ai-guide-result" aria-live="polite">
        {guide.opening && <p>{guide.opening}</p>}
        <ol>{guide.questions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}</ol>
      </div>}
    </section>
  )
}

export function RootedChat({ books, stories, clubs }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome. Ask me about the Rooted library, stories, or what you might enjoy reading next.' },
  ])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sendMessage = async (event) => {
    event.preventDefault()
    const prompt = message.trim()
    if (!prompt || busy) return
    const history = messages.slice(-8)
    setMessages((current) => [...current, { role: 'user', content: prompt }])
    setMessage('')
    setBusy(true)
    setError('')
    try {
      const result = await ai.chat({ message: prompt, history, books, stories, clubs })
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-chat">
      <div className="feed-header">
        <div><span className="eyebrow coral">ROOTED COMPANION</span><h2>A little help finding your next page.</h2><p>Ask about the books, stories, and clubs in this app.</p></div>
        <span className="ai-badge"><Sparkles size={14} /> AI</span>
      </div>
      <div className="ai-chat-messages" aria-live="polite">
        {messages.map((item, index) => <p className={`ai-chat-message ${item.role}`} key={`${item.role}-${index}`}>{item.content}</p>)}
        {busy && <p className="ai-chat-message assistant ai-status" role="status">Thinking...</p>}
      </div>
      <AIStatus error={error} />
      <form className="ai-chat-form" onSubmit={sendMessage}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask Rooted..." aria-label="Message Rooted" maxLength={1500} />
        <button className="icon-command" type="submit" disabled={!message.trim() || busy} aria-label="Send message" title="Send message"><ArrowUp size={17} /></button>
      </form>
    </div>
  )
}