import { useEffect } from 'react'
import Mosaic from '@/components/marketing/Mosaic'
import useMosaicPanels from '@/hooks/useMosaicPanels'

const spinnerStyle = {
  width: 32,
  height: 32,
  border: '3px solid rgba(0,0,0,0.08)',
  borderTopColor: '#2C97BE',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

export default function EmbedMosaic() {
  const { panels, isLoading, error } = useMosaicPanels()

  useEffect(() => {
    const loader = document.getElementById('page-loader')
    if (loader) loader.remove()
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.overflow = 'hidden'
    document.body.style.webkitFontSmoothing = 'antialiased'
    document.body.style.mozOsxFontSmoothing = 'grayscale'
    const root = document.getElementById('root')
    if (root) root.style.background = 'transparent'
  }, [])

  if (isLoading) return (
    <div style={{ width: '100%', height: '860px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={spinnerStyle} />
    </div>
  )

  if (error) return (
    <div style={{ width: '100%', height: '860px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
      Unable to load content
    </div>
  )

  return (
    <div style={{ width: '100%', minHeight: '860px' }}>
      <Mosaic panels={panels} />
    </div>
  )
}
