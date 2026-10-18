const BOOK_TITLE = 'The Practice of Presence'
const BOOK_SUBTITLE = 'A reading edition'

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

/**
 * Splits long text into pages based on font and dimensions
 */
export function paginateText(text, fontSize = 26, lineHeight = 42, pageWidth = 550) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `italic ${fontSize}px Georgia, serif`;

  const pages = [];
  const paragraphs = text.split('\n');
  let currentPage = [];
  let currentY = 150;

  paragraphs.forEach(para => {
    const words = para.split(' ');
    let line = '';
    
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > pageWidth && line) {
        currentPage.push(line);
        line = word;
        currentY += lineHeight;
      } else {
        line = test;
      }
    });

    if (line) {
      currentPage.push(line);
      currentY += lineHeight;
    }
    currentY += lineHeight * 0.4;

    if (currentY > 800) {
      pages.push({ body: currentPage.join('\n') });
      currentPage = [];
      currentY = 150;
    }
  });

  if (currentPage.length > 0) {
    pages.push({ body: currentPage.join('\n') });
  }

  return pages;
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
  
  ctx.fillStyle = '#3a2412'
  ctx.font = 'italic 26px Georgia, serif'
  
  const content = page?.body || '...'
  wrapText(ctx, content, inner, 150, innerRight - inner, 42)

  ctx.font = '20px Georgia, serif'
  ctx.fillStyle = '#6b5334'
  const label = String(pageNumber)
  ctx.fillText(label, side === 'left' ? inner : innerRight - ctx.measureText(label).width, H - 44)

  return canvas
}
