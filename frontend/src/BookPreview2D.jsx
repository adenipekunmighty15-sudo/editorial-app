import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BOOK_PAGES } from './bookContent'

export default function BookPreview2D() {
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = BOOK_PAGES.length

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 0))

  const page = BOOK_PAGES[currentPage] || { body: 'End of book' }

  return (
    <div className="book-preview-2d" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
      padding: '2rem',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div className="book-page-2d" style={{
        width: '100%',
        aspectRatio: '3/4',
        background: 'linear-gradient(135deg, #efe1c2 0%, #dcc79b 100%)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2), inset 0 0 100px rgba(0,0,0,0.05)',
        borderRadius: '4px 12px 12px 4px',
        borderLeft: '12px solid #3a2412',
        padding: '60px 40px',
        position: 'relative',
        color: '#3a2412',
        fontFamily: 'Georgia, serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div className="page-content" style={{
          fontSize: '22px',
          lineHeight: '1.6',
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
          textAlign: 'justify'
        }}>
          {page.body}
        </div>
        <div className="page-footer" style={{
          textAlign: 'center',
          fontSize: '16px',
          opacity: 0.6,
          marginTop: '2rem'
        }}>
          Page {currentPage + 1} of {totalPages}
        </div>
      </div>

      <div className="preview-controls" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <button 
          onClick={prevPage} 
          disabled={currentPage === 0}
          className="preview-nav-btn"
          style={{
            padding: '0.5rem',
            borderRadius: '50%',
            border: '1px solid #3a2412',
            background: 'transparent',
            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 0 ? 0.3 : 1,
            color: '#3a2412'
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
          {currentPage + 1} / {totalPages}
        </span>
        <button 
          onClick={nextPage} 
          disabled={currentPage === totalPages - 1}
          className="preview-nav-btn"
          style={{
            padding: '0.5rem',
            borderRadius: '50%',
            border: '1px solid #3a2412',
            background: 'transparent',
            cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages - 1 ? 0.3 : 1,
            color: '#3a2412'
          }}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  )
}
