import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Palette,
  Plus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { BOOK_META, getBookSource } from './bookContent'
import './BookReader.css'

const FONT_SIZES = [17, 19, 21, 23, 25]
const THEMES = ['classic', 'paper', 'night']
const BASE_PAGES = [{ type: 'title' }, { type: 'toc' }]

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Reading keeps working when browser storage is disabled.
  }
}

function getSavedOffset(key) {
  const value = Number(readStorage(key, 0))
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function getSavedMarks(key) {
  try {
    const values = JSON.parse(readStorage(key, '[]'))
    return new Set(Array.isArray(values) ? values.filter(Number.isInteger) : [])
  } catch {
    return new Set()
  }
}

// Lays the manuscript out page by page using the real page size and font, so no
// text is ever clipped. Positions are tracked as word offsets, which stay valid
// when the font size or screen size changes the pagination.
function paginateSource(source, measure, isMobile) {
  const face = measure.querySelector('.br-pageface')
  const head = face.querySelector('.br-chapter-head')
  const textEl = face.querySelector('.br-body-text')
  const style = window.getComputedStyle(face)
  const available =
    face.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)

  const headHeight = (title) => {
    head.textContent = title
    return head.offsetHeight + parseFloat(window.getComputedStyle(head).marginBottom)
  }
  const fits = (words, from, count, limit) => {
    textEl.textContent = words.slice(from, from + count).join(' ')
    return textEl.offsetHeight <= limit
  }

  const body = []
  const toc = []
  let offset = 0

  source.forEach((chapter) => {
    const words = chapter.text.trim().split(/[ \t]+/).filter(Boolean)
    let i = 0
    let first = true
    if (chapter.title) {
      toc.push({ title: chapter.title, contentIndex: body.length, page: body.length + 1 })
    }
    while (i < words.length) {
      const limit = available - (first && chapter.title ? headHeight(chapter.title) : 0)
      let lo = 1
      let hi = Math.min(words.length - i, 600)
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        if (fits(words, i, mid, limit)) lo = mid
        else hi = mid - 1
      }
      body.push({
        type: 'body',
        body: words.slice(i, i + lo).join(' '),
        chapter: first ? chapter.title : '',
        number: body.length + 1,
        start: offset,
        end: offset + lo,
      })
      offset += lo
      i += lo
      first = false
    }
  })

  if (!toc.length) toc.push({ title: 'Start reading', contentIndex: 0, page: 1 })

  const pages = [...BASE_PAGES, ...body]
  if (!isMobile && pages.length % 2) pages.push({ type: 'blank' })
  return { pages, toc, total: body.length }
}

let audioCtx = null

// Soft paper rustle, synthesised so no audio file is needed.
function playPageTurn() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    audioCtx = audioCtx || new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const length = Math.floor(audioCtx.sampleRate * 0.4)
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) {
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) ** 2 * (0.5 + 0.5 * Math.random())
    }
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    const filter = audioCtx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2400
    filter.Q.value = 0.7
    const gain = audioCtx.createGain()
    gain.gain.value = 0.22
    source.connect(filter).connect(gain).connect(audioCtx.destination)
    source.start()
  } catch {
    // Sound is optional.
  }
}

function offsetOfSpread(pages, spread, step) {
  const visible = pages.slice(spread, spread + step).find((page) => page.type === 'body')
  return visible ? visible.start : 0
}

function spreadForOffset(pages, offset, isMobile) {
  if (!offset) return 0
  let index = pages.findIndex((page) => page.type === 'body' && offset >= page.start && offset < page.end)
  if (index < 0) index = Math.max(0, pages.length - 1)
  return isMobile ? index : Math.floor(index / 2) * 2
}

export default function BookReader({ book }) {
  const title = book?.title || BOOK_META.title
  const author = book?.author || 'Rooted Press'
  const subtitle = book?.subtitle || BOOK_META.subtitle
  const bookKey = String(book?.id || `${title}:${author}`)
  const offsetKey = `rooted-reader-offset:${bookKey}`
  const marksKey = `rooted-reader-marks:${bookKey}`
  const source = useMemo(() => getBookSource(book), [book])

  const [fontIndex, setFontIndex] = useState(2)
  const [theme, setTheme] = useState(() => {
    const saved = readStorage('rooted-reader-theme', 'classic')
    return THEMES.includes(saved) ? saved : 'classic'
  })
  const [soundOn, setSoundOn] = useState(() => readStorage('rooted-reader-sound', 'on') === 'on')
  const [drag, setDrag] = useState(null)
  const [flipFrom, setFlipFrom] = useState(null)
  const [flipDur, setFlipDur] = useState(0.78)
  const [opened, setOpened] = useState(false)
  const [coverLifting, setCoverLifting] = useState(false)
  const [spread, setSpread] = useState(0)
  const [paged, setPaged] = useState(null)
  const [flipping, setFlipping] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.('(max-width: 680px)').matches ?? false,
  )
  const [marks, setMarks] = useState(() => getSavedMarks(marksKey))
  const [scale, setScale] = useState(1)
  const bookRef = useRef(null)
  const measureRef = useRef(null)
  const dragRef = useRef({ active: false, moved: false })
  const openTimer = useRef(null)
  const offsetRef = useRef(getSavedOffset(offsetKey))

  const pages = paged?.pages ?? BASE_PAGES
  const toc = paged?.toc ?? []
  const totalBody = paged?.total ?? 0
  const step = isMobile ? 1 : 2
  const maxPosition = Math.max(0, pages.length - step)
  const safeSpread = Math.min(spread, maxPosition)
  const progress = maxPosition ? safeSpread / maxPosition : 0
  const fontSize = FONT_SIZES[fontIndex]
  const lineHeight = Math.round(fontSize * 1.55)
  const leftPage = isMobile ? null : pages[safeSpread]
  const rightPage = pages[safeSpread + (isMobile ? 0 : 1)]
  const scaleKey = Math.round(scale * 100)

  const visibleBody = pages
    .slice(safeSpread, safeSpread + step)
    .filter((page) => page.type === 'body')
  const isBookmarked = visibleBody.some((page) =>
    [...marks].some((offset) => offset >= page.start && offset < page.end),
  )
  let pageLabel = 'Title page'
  if (visibleBody.length) {
    const first = visibleBody[0].number
    const last = visibleBody[visibleBody.length - 1].number
    pageLabel = `Page ${first}${last !== first ? `–${last}` : ''} of ${totalBody}`
  } else if (pages[safeSpread]?.type === 'toc' || pages[safeSpread + 1]?.type === 'toc') {
    pageLabel = 'Contents'
  }

  useEffect(() => {
    const query = window.matchMedia('(max-width: 680px)')
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  useLayoutEffect(() => {
    offsetRef.current = getSavedOffset(offsetKey)
    setMarks(getSavedMarks(marksKey))
    setFlipping(null)
  }, [offsetKey, marksKey])

  useEffect(() => {
    writeStorage('rooted-reader-theme', theme)
  }, [theme])

  useEffect(() => {
    writeStorage('rooted-reader-sound', soundOn ? 'on' : 'off')
  }, [soundOn])

  // Re-lay out the book whenever the text size, screen size or manuscript changes,
  // then return the reader to the same place in the text.
  useLayoutEffect(() => {
    if (!opened || !measureRef.current) return
    const result = paginateSource(source, measureRef.current, isMobile)
    setPaged(result)
    setSpread(spreadForOffset(result.pages, offsetRef.current, isMobile))
    setFlipping(null)
  }, [opened, source, fontSize, scaleKey, isMobile, offsetKey])

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

  const moveTo = useCallback(
    (next) => {
      const target = Math.max(0, Math.min(next, maxPosition))
      setSpread(target)
      const offset = offsetOfSpread(pages, target, step)
      offsetRef.current = offset
      writeStorage(offsetKey, String(offset))
    },
    [maxPosition, offsetKey, pages, step],
  )

  const finishFlip = useCallback(() => {
    const direction = flipping
    setFlipping(null)
    setFlipFrom(null)
    if (direction === 'next') moveTo(safeSpread + step)
    else if (direction === 'prev') moveTo(safeSpread - step)
  }, [flipping, moveTo, safeSpread, step])

  const goNext = useCallback(() => {
    if (flipping || drag || safeSpread >= maxPosition) return
    setFlipFrom(null)
    setFlipDur(0.78)
    setFlipping('next')
    if (soundOn) playPageTurn()
  }, [flipping, drag, maxPosition, safeSpread, soundOn])

  const goPrev = useCallback(() => {
    if (flipping || drag || safeSpread <= 0) return
    setFlipFrom(null)
    setFlipDur(0.78)
    setFlipping('prev')
    if (soundOn) playPageTurn()
  }, [flipping, drag, safeSpread, soundOn])

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
    setPaged(null)
    setFlipping(null)
    setMenuOpen(false)
  }

  const toggleBookmark = () => {
    if (!visibleBody.length) return
    setMarks((current) => {
      const next = new Set(current)
      if (isBookmarked) {
        ;[...next].forEach((offset) => {
          if (visibleBody.some((page) => offset >= page.start && offset < page.end)) next.delete(offset)
        })
      } else {
        next.add(visibleBody[0].start)
      }
      writeStorage(marksKey, JSON.stringify([...next]))
      return next
    })
  }

  const jumpToPage = (contentPageIndex) => {
    const pageIndex = contentPageIndex + BASE_PAGES.length
    moveTo(isMobile ? pageIndex : Math.floor(pageIndex / 2) * 2)
    setMenuOpen(false)
  }

  const bookmarkList = [...marks]
    .sort((x, y) => x - y)
    .map((offset) => pages.find((page) => page.type === 'body' && offset >= page.start && offset < page.end))
    .filter(Boolean)

  // Drag-to-turn: the page follows the finger, then settles or completes on release.
  const onPointerDown = (event) => {
    if (!opened || menuOpen || flipping || drag || event.button > 0) return
    if (event.target.closest?.('button')) return
    dragRef.current = {
      active: true,
      moved: false,
      dir: null,
      p: 0,
      x: event.clientX,
      width: event.currentTarget.getBoundingClientRect().width / (isMobile ? 1 : 2),
    }
  }

  const onPointerMove = (event) => {
    const d = dragRef.current
    if (!d.active) return
    const dx = event.clientX - d.x
    if (!d.dir) {
      if (Math.abs(dx) < 8) return
      const dir = dx < 0 ? 'next' : 'prev'
      if ((dir === 'next' && safeSpread >= maxPosition) || (dir === 'prev' && safeSpread <= 0)) {
        d.active = false
        return
      }
      d.dir = dir
      d.moved = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }
    const raw = d.dir === 'next' ? -dx : dx
    d.p = Math.max(0, Math.min(1, raw / d.width))
    setDrag({ dir: d.dir, p: d.p })
  }

  const onPointerUp = () => {
    const d = dragRef.current
    if (!d.active) return
    d.active = false
    if (!d.dir) return
    if (d.p > 0.3) {
      setFlipFrom(d.dir === 'next' ? -180 * d.p : -180 * (1 - d.p))
      setFlipDur(Math.max(0.25, 0.78 * (1 - d.p)))
      setDrag(null)
      setFlipping(d.dir)
      if (soundOn) playPageTurn()
    } else {
      setDrag({ dir: d.dir, p: 0, settling: true })
      window.setTimeout(() => setDrag(null), 260)
    }
  }

  const swallowClickAfterDrag = (handler) => () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false
      return
    }
    handler()
  }

  const turning = flipping || drag?.dir || null
  let leafFront = null
  let leafBack = null
  if (turning === 'next') {
    leafFront = pages[safeSpread + (isMobile ? 0 : 1)]
    leafBack = pages[safeSpread + step]
  } else if (turning === 'prev') {
    leafFront = pages[safeSpread]
    leafBack = pages[safeSpread - 1]
  }

  const faceProps = { title, author, subtitle, toc, onJump: jumpToPage }

  return (
    <div
      className="br-scene"
      data-theme={theme}
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
            <div
              className={`br-page br-page--measure ${isMobile ? 'br-page--measure-single' : ''}`}
              ref={measureRef}
              aria-hidden="true"
            >
              <div className="br-pageface br-pageface--body">
                <h4 className="br-chapter-head" />
                <div className="br-body-text" />
              </div>
            </div>
            <div
              className={`br-spread ${isMobile ? 'br-spread--single' : ''}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div
                className={`br-page br-page--left ${turning === 'prev' || isMobile ? 'br-page--hidden' : ''}`}
                onClick={swallowClickAfterDrag(goPrev)}
                role="button"
                tabIndex={0}
                aria-label="Turn to the previous page"
                onKeyDown={(event) => event.key === 'Enter' && goPrev()}
              >
                <PageFace page={leftPage} side="left" {...faceProps} />
              </div>
              <div
                className={`br-page br-page--right ${turning === 'next' ? 'br-page--hidden' : ''}`}
                onClick={swallowClickAfterDrag(goNext)}
                role="button"
                tabIndex={0}
                aria-label="Turn to the next page"
                onKeyDown={(event) => event.key === 'Enter' && goNext()}
              >
                <PageFace page={rightPage} side="right" {...faceProps} />
                {isBookmarked && <span className="br-ribbon" aria-label="Bookmarked" />}
              </div>
              <span className="br-gutter" aria-hidden="true" />
              {turning && (
                <div
                  className={`br-leaf ${flipping ? `br-leaf--${flipping}` : 'br-leaf--drag'} ${
                    drag?.settling ? 'br-leaf--settle' : ''
                  } ${isMobile ? 'br-leaf--single' : ''}`}
                  style={
                    flipping
                      ? flipFrom !== null
                        ? { '--br-from': `${flipFrom}deg`, animationDuration: `${flipDur}s` }
                        : undefined
                      : {
                          transform: `rotateY(${
                            drag.dir === 'next' ? -180 * drag.p : -180 * (1 - drag.p)
                          }deg)`,
                        }
                  }
                  onAnimationEnd={flipping ? finishFlip : undefined}
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
              disabled={!visibleBody.length}
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
              onClick={() => setTheme((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length])}
              aria-label={`Page colour: ${theme}. Tap to change`}
            >
              <Palette size={16} />
            </button>
            <button
              className="br-btn"
              onClick={() => setSoundOn((on) => !on)}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Turn page sound off' : 'Turn page sound on'}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
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
                moveTo(Math.round((ratio * maxPosition) / step) * step)
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
          <p className="br-hint">{pageLabel} · tap, swipe or drag a page to turn it</p>
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
                key={`${item.contentIndex}-${item.title}`}
                className="br-menu-item"
                onClick={() => jumpToPage(item.contentIndex)}
              >
                <span>{item.title}</span>
                <span className="br-menu-pg">{item.page}</span>
              </button>
            ))}
            {bookmarkList.length > 0 && (
              <>
                <span className="br-menu-kicker br-menu-kicker--gap">BOOKMARKS</span>
                {bookmarkList.map((page) => (
                  <button
                    key={`mark-${page.start}`}
                    className="br-menu-item"
                    onClick={() => jumpToPage(page.number - 1)}
                  >
                    <span>{page.chapter || `Page ${page.number}`}</span>
                    <span className="br-menu-pg">{page.number}</span>
                  </button>
                ))}
              </>
            )}
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
        {toc.slice(0, 9).map((item) => (
          <button
            key={`${item.contentIndex}-${item.title}`}
            className="br-toc-row"
            onClick={(event) => {
              event.stopPropagation()
              onJump(item.contentIndex)
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
