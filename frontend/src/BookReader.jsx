import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Plus,
  X,
} from 'lucide-react'
import { BOOK_META, buildBookPages } from './bookContent'
import './BookReader.css'

const FONT_SIZES = [17, 19, 21, 23, 25]

function getSavedPosition(key) {
  try {
    const value = Number(window.localStorage.getItem(key))
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

function getSavedBookmarks(key) {
  try {
    const values = JSON.parse(window.localStorage.getItem(key) || '[]')
    return new Set(Array.isArray(values) ? values.filter(Number.isInteger) : [])
  } catch {
    return new Set()
  }
}

export default function BookReader({ book }) {
  const title = book?.title || BOOK_META.title
  const author = book?.author || 'Rooted Press'
  const subtitle = book?.subtitle || BOOK_META.subtitle
  const bookKey = String(book?.id || `${title}:${author}`)
  const positionKey = `rooted-reader-position:${bookKey}`
  const bookmarkKey = `rooted-reader-bookmarks:${bookKey}`
  const { pages, toc } = useMemo(() => buildBookPages(book), [book])

  const [fontIndex, setFontIndex] = useState(2)
  const [opened, setOpened] = useState(false)
  const [coverLifting, setCoverLifting] = useState(false)
  const [spread, setSpread] = useState(() => getSavedPosition(positionKey))
  const [loadedPositionKey, setLoadedPositionKey] = useState(positionKey)
  const [flipping, setFlipping] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.('(max-width: 680px)').matches ?? false,
  )
  const [bookmarks, setBookmarks] = useState(() => getSavedBookmarks(bookmarkKey))
  const [scale, setScale] = useState(1)
  const bookRef = useRef(null)
  const touchStartX = useRef(null)
  const openTimer = useRef(null)

  const step = isMobile ? 1 : 2
  const maxPosition = Math.max(0, pages.length - step)
  const safeSpread = Math.min(spread, maxPosition)
  const progress = maxPosition ? safeSpread / maxPosition : 0
  const fontSize = FONT_SIZES[fontIndex]
  const lineHeight = Math.round(fontSize * 1.55)
  const leftPage = isMobile ? null : pages[safeSpread]
  const rightPage = pages[safeSpread + (isMobile ? 0 : 1)]

  useEffect(() => {
    const query = window.matchMedia('(max-width: 680px)')
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    setSpread(getSavedPosition(positionKey))
    setBookmarks(getSavedBookmarks(bookmarkKey))
    setLoadedPositionKey(positionKey)
    setFlipping(null)
  }, [positionKey, bookmarkKey])

  useEffect(() => {
    setSpread((current) => Math.min(current, maxPosition))
  }, [maxPosition])

  useEffect(() => {
    if (loadedPositionKey !== positionKey) return
    try {
      window.localStorage.setItem(positionKey, String(safeSpread))
    } catch {
      // Keep reading available when browser storage is disabled.
    }
  }, [loadedPositionKey, positionKey, safeSpread])

  useEffect(() => {
    const element = bookRef.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => {
      setScale(Math.max(0.62, Math.min(1, element.clientWidth / 1040)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [opened])

  useEffect(() => () => window.clearTimeout(openTimer.current), [])

  const finishFlip = useCallback(() => {
    const direction = flipping
    setFlipping(null)
    if (direction === 'next') {
      setSpread((current) => Math.min(current + step, maxPosition))
    } else if (direction === 'prev') {
      setSpread((current) => Math.max(current - step, 0))
    }
  }, [flipping, maxPosition, step])

  const goNext = useCallback(() => {
    if (!flipping && safeSpread < maxPosition) setFlipping('next')
  }, [flipping, maxPosition, safeSpread])

  const goPrev = useCallback(() => {
    if (!flipping && safeSpread > 0) setFlipping('prev')
  }, [flipping, safeSpread])

  useEffect(() => {
    if (!opened) return undefined
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [opened, goNext, goPrev])

  const openCover = () => {
    if (coverLifting) return
    setCoverLifting(true)
    openTimer.current = window.setTimeout(() => setOpened(true), 620)
  }

  const closeBook = () => {
    setCoverLifting(false)
    setOpened(false)
    setFlipping(null)
    setMenuOpen(false)
  }

  const toggleBookmark = () => {
    setBookmarks((current) => {
      const next = new Set(current)
      if (next.has(safeSpread)) next.delete(safeSpread)
      else next.add(safeSpread)
      try {
        window.localStorage.setItem(bookmarkKey, JSON.stringify([...next]))
      } catch {
        // Bookmarks remain available for this session.
      }
      return next
    })
  }

  const jumpToPage = (contentPageIndex) => {
    const pageIndex = contentPageIndex + 2
    const target = isMobile ? pageIndex : Math.floor(pageIndex / 2) * 2
    setSpread(Math.min(target, maxPosition))
    setMenuOpen(false)
  }

  let leafFront = null
  let leafBack = null
  if (flipping === 'next') {
    leafFront = pages[safeSpread + (isMobile ? 0 : 1)]
    leafBack = pages[safeSpread + step]
  } else if (flipping === 'prev') {
    leafFront = pages[safeSpread]
    leafBack = pages[safeSpread - 1]
  }

  const faceProps = { title, author, subtitle, toc, onJump: jumpToPage }
  const isBookmarked = bookmarks.has(safeSpread)

  return (
    <div
      className="br-scene"
      onTouchStart={(event) => {
        if (!opened || menuOpen) return
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return
        const distance = event.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (distance < -45) goNext()
        else if (distance > 45) goPrev()
      }}
    >
      {!opened ? (
        <button
          type="button"
          className={`br-closed-book ${coverLifting ? 'br-closed-book--lifted' : ''}`}
          onClick={openCover}
          aria-label={`Open ${title}`}
        >
          <span className="br-closed-pages" aria-hidden="true" />
          <span className="br-closed-cover">
            <span className="br-closed-frame">
              <span className="br-closed-eyebrow">R O O T E D</span>
              <span className="br-closed-emblem">R</span>
              <span className="br-closed-title">{title}</span>
              <span className="br-closed-sub">{subtitle}</span>
              <span className="br-closed-rule" />
              <span className="br-closed-author">{author}</span>
            </span>
          </span>
          <span className="br-open-hint"><BookOpen size={16} /> Tap to open</span>
        </button>
      ) : (
        <>
          <div
            className="br-book"
            ref={bookRef}
            style={{
              '--br-scale': scale,
              '--br-font-size': `${fontSize}px`,
              '--br-line-height': `${lineHeight}px`,
            }}
          >
            <div className="br-underlay" />
            <div className={`br-spread ${isMobile ? 'br-spread--single' : ''}`}>
              <div
                className={`br-page br-page--left ${flipping === 'prev' || isMobile ? 'br-page--hidden' : ''}`}
                onClick={goPrev}
                role="button"
                tabIndex={0}
                aria-label="Turn to the previous page"
                onKeyDown={(event) => event.key === 'Enter' && goPrev()}
              >
                <PageFace page={leftPage} side="left" {...faceProps} />
              </div>
              <div
                className={`br-page br-page--right ${flipping === 'next' ? 'br-page--hidden' : ''}`}
                onClick={goNext}
                role="button"
                tabIndex={0}
                aria-label="Turn to the next page"
                onKeyDown={(event) => event.key === 'Enter' && goNext()}
              >
                <PageFace page={rightPage} side="right" {...faceProps} />
                {isBookmarked && <span className="br-ribbon" aria-label="Bookmarked" />}
              </div>
              <span className="br-gutter" aria-hidden="true" />
              {flipping && (
                <div
                  className={`br-leaf br-leaf--${flipping} ${isMobile ? 'br-leaf--single' : ''}`}
                  onAnimationEnd={finishFlip}
                  aria-hidden="true"
                >
                  <div className="br-leaf-face br-leaf-front">
                    <PageFace page={leafFront} side="right" {...faceProps} />
                    <span className="br-shade" />
                  </div>
                  <div className="br-leaf-face br-leaf-back">
                    <PageFace page={leafBack} side="left" {...faceProps} />
                    <span className="br-shade" />
                  </div>
                </div>
              )}
            </div>
            <span className="br-fore-edge" aria-hidden="true" />
            <span className="br-bottom-edge" aria-hidden="true" />
          </div>

          <div className="br-controls" aria-label="Reader controls">
            <button className="br-btn" onClick={goPrev} disabled={safeSpread === 0} aria-label="Previous page">
              <ChevronLeft size={18} />
            </button>
            <button
              className={`br-btn ${isBookmarked ? 'br-btn--active' : ''}`}
              onClick={toggleBookmark}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
              aria-pressed={isBookmarked}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
            <button className="br-btn" onClick={() => setMenuOpen(true)} aria-label="Open contents">
              <List size={16} />
            </button>
            <button
              className="br-btn"
              onClick={() => setFontIndex((index) => Math.max(0, index - 1))}
              disabled={fontIndex === 0}
              aria-label="Decrease text size"
            >
              <Minus size={16} />
            </button>
            <button
              className="br-btn"
              onClick={() => setFontIndex((index) => Math.min(FONT_SIZES.length - 1, index + 1))}
              disabled={fontIndex === FONT_SIZES.length - 1}
              aria-label="Increase text size"
            >
              <Plus size={16} />
            </button>
            <button className="br-btn" onClick={closeBook} aria-label="Close book">
              <X size={16} />
            </button>
            <button
              className="br-progress"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
                setSpread(Math.round(ratio * maxPosition))
              }}
              aria-label={`Reading progress ${Math.round(progress * 100)} percent`}
              title={`${Math.round(progress * 100)}% read`}
            >
              <span className="br-progress-fill" style={{ width: `${progress * 100}%` }} />
            </button>
            <button
              className="br-btn"
              onClick={goNext}
              disabled={safeSpread >= maxPosition}
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="br-hint">Tap a page or swipe to turn it · use the arrow keys on a keyboard</p>
        </>
      )}

      {menuOpen && (
        <div className="br-menu" onClick={() => setMenuOpen(false)}>
          <section className="br-menu-panel" onClick={(event) => event.stopPropagation()} aria-label="Book contents">
            <div className="br-menu-heading">
              <div>
                <span className="br-menu-kicker">IN THIS BOOK</span>
                <h3>Contents</h3>
              </div>
              <button className="br-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close contents">
                <X size={18} />
              </button>
            </div>
            {toc.map((item) => (
              <button
                key={item.chapterIndex}
                className="br-menu-item"
                onClick={() => jumpToPage(item.chapterIndex)}
              >
                <span>{item.title}</span>
                <span className="br-menu-pg">{item.page}</span>
              </button>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}

function PageFace({ page, side, title, author, subtitle, toc, onJump }) {
  if (!page || page.type === 'blank') return <div className="br-pageface br-pageface--blank" />

  if (page.type === 'title') {
    return (
      <div className="br-pageface br-pageface--title">
        <span className="br-eyebrow">R O O T E D</span>
        <h2>{title}</h2>
        <p className="br-subtitle">{subtitle}</p>
        <span className="br-ornament" aria-hidden="true">❦</span>
        <p className="br-author">{author}</p>
      </div>
    )
  }

  if (page.type === 'toc') {
    return (
      <div className="br-pageface br-pageface--toc">
        <h3>Contents</h3>
        {toc.slice(0, 8).map((item) => (
          <button
            key={item.chapterIndex}
            className="br-toc-row"
            onClick={(event) => {
              event.stopPropagation()
              onJump(item.chapterIndex)
            }}
          >
            <span>{item.title}</span>
            <i aria-hidden="true" />
            <span>{item.page}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="br-pageface br-pageface--body">
      {page.chapter && <h4 className="br-chapter-head">{page.chapter}</h4>}
      <div className="br-body-text">{page.body}</div>
      <span className={`br-pageno br-pageno--${side}`}>{page.number}</span>
    </div>
  )
}
