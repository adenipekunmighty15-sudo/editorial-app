const BOOK_TITLE = 'The Practice of Presence'
const BOOK_SUBTITLE = 'A reading edition'

export const BOOK_PAGES = [
  {
    heading: 'Introduction',
    body: 'The art of paying attention is the first step toward a lived faith. In these pages we explore the meeting place of silence and sound, of the ordinary and the holy.',
  },
  {
    heading: 'A Word Before You Begin',
    body: 'You do not need to rush this book. Read a page, close your eyes, and let a single sentence stay with you. Depth is built slowly.',
  },
  {
    heading: 'Chapter I\nThe First Small Yes',
    body: 'Faith does not always arrive as a thunderclap. More often it is a quiet invitation, a small yes spoken in the darkness of a Tuesday morning.',
  },
  {
    heading: 'On Beginning',
    body: 'Every practice begins with permission. Give yourself permission to start badly, to start again, to be a beginner in the presence of God.',
  },
  {
    heading: 'The Quiet Life',
    body: 'To live a quiet life is not to live a boring one. It is to find the frequency of the Spirit amidst the noise of the world.',
  },
  {
    heading: 'On Stillness',
    body: 'Stillness is not emptiness. It is the room we make so that something larger than our own voice can finally be heard.',
  },
  {
    heading: 'Chapter II\nThe Road Opens',
    body: 'Every journey begins with a single step, but the most important steps are taken in trust when the map is blank and the road ahead is unclear.',
  },
  {
    heading: 'On Trust',
    body: 'Trust is not the absence of questions. It is the decision to walk forward while still holding them gently in your hands.',
  },
  {
    heading: 'The Practice',
    body: 'Presence is a muscle. We build it through the repetitive act of returning our gaze to the only One who truly sees us.',
  },
  {
    heading: 'On Returning',
    body: 'Wandering is not failure. The whole of the spiritual life is the practice of coming home, again and again, without shame.',
  },
  {
    heading: 'Chapter III\nA Liturgy of Days',
    body: 'Rhythm rescues us from survival. When we mark our days with prayer, rest, and table, time becomes a story instead of a blur.',
  },
  {
    heading: 'On Rest',
    body: 'Rest is an act of trust. It says to the world, and to ourselves, that the story does not depend on our endless striving.',
  },
  {
    heading: 'The Table',
    body: 'We were never meant to read or pray alone. A shared meal, a shared book, a shared silence — these are the architecture of belonging.',
  },
  {
    heading: 'On Friendship',
    body: 'Holy friendship is a discipline. It asks us to show up, to be known, and to stay when staying is inconvenient.',
  },
  {
    heading: 'Chapter IV\nThe Long Obedience',
    body: 'None of this is spectacular. It is a long obedience in the same direction, a thousand small faithful mornings that add up to a life.',
  },
  {
    heading: 'On Patience',
    body: 'Growth is rarely visible in the moment. Trust the slow work of the Spirit beneath the surface of your ordinary days.',
  },
  {
    heading: 'The Wilderness',
    body: 'In the dry seasons, we discover what we truly rely on. The wilderness is not punishment; it is formation by another name.',
  },
  {
    heading: 'On Lament',
    body: 'Honest sorrow is welcome here. We do not have to perform our faith. We are allowed to bring our whole, unfinished hearts.',
  },
  {
    heading: 'Chapter V\nThe Weight of Glory',
    body: 'We are being made into something we cannot yet see. The smallest act of love is never wasted; it is folded into eternity.',
  },
  {
    heading: 'On Generosity',
    body: 'To give is to declare that we are not the source of our own life. Generosity is gratitude with its sleeves rolled up.',
  },
  {
    heading: 'On Hospitality',
    body: 'Make room. The stranger at the edge of the story is often the very presence of God in disguise.',
  },
  {
    heading: 'Concluding Thoughts',
    body: 'May you find courage to be still, strength to be honest, and grace to begin again tomorrow.',
  },
  {
    heading: 'A Blessing for the Road',
    body: 'Go gently. Read deeply. Live fully. And may the One who began a good work in you carry it on to completion.',
  },
  {
    heading: 'Notes',
    body: 'This is your space. Write what stayed with you, the questions you are carrying, and the small next steps you are choosing.',
  },
]

export const BOOK_META = { title: BOOK_TITLE, subtitle: BOOK_SUBTITLE }

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split('\n')
  let cursorY = y
  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(' ')
    let line = ''
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY)
        line = word
        cursorY += lineHeight
      } else {
        line = test
      }
    })
    if (line) {
      ctx.fillText(line, x, cursorY)
      cursorY += lineHeight
    }
    cursorY += lineHeight * 0.4
  })
  return cursorY
}

export function createPageTexture(page, { pageNumber, side = 'right', mirrored = false } = {}) {
  const W = 640
  const H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  if (mirrored) {
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
  }

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#efe1c2')
  bg.addColorStop(0.5, '#e8d6b0')
  bg.addColorStop(1, '#dcc79b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.globalAlpha = 0.05
  for (let i = 0; i < 2600; i += 1) {
    ctx.fillStyle = i % 2 ? '#8a6a42' : '#fff6e2'
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }
  ctx.globalAlpha = 1

  const inner = side === 'left' ? 26 : 90
  const innerRight = W - (side === 'right' ? 26 : 90)
  const gutter = ctx.createLinearGradient(
    side === 'left' ? W - 150 : 0,
    0,
    side === 'left' ? W : 150,
    0,
  )
  gutter.addColorStop(0, 'rgba(60,32,14,0)')
  gutter.addColorStop(1, 'rgba(60,32,14,0.28)')
  ctx.fillStyle = gutter
  ctx.fillRect(side === 'left' ? W - 150 : 0, 0, 150, H)

  ctx.fillStyle = '#3a2412'
  if (page?.heading) {
    const lines = page.heading.split('\n')
    ctx.font = 'italic 600 34px Georgia, serif'
    let hy = 150
    lines.forEach((line) => {
      ctx.fillText(line, inner, hy)
      hy += 44
    })
    ctx.strokeStyle = 'rgba(120,80,40,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(inner, hy + 6)
    ctx.lineTo(inner + 70, hy + 6)
    ctx.stroke()
    hy += 60
    ctx.font = 'italic 27px Georgia, serif'
    ctx.fillStyle = '#43301c'
    wrapText(ctx, page.body || '', inner, hy, innerRight - inner, 42)
  } else {
    ctx.font = 'italic 26px Georgia, serif'
    ctx.fillStyle = '#43301c'
    wrapText(ctx, BOOK_TITLE, inner, 130, innerRight - inner, 42)
  }

  ctx.font = '20px Georgia, serif'
  ctx.fillStyle = '#6b5334'
  const label = String(pageNumber)
  ctx.fillText(label, side === 'left' ? inner : innerRight - ctx.measureText(label).width, H - 44)

  return canvas
}
