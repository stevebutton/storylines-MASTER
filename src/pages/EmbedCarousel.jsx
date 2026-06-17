import { useEffect } from 'react'
import Carousel from '@/components/marketing/Carousel'
import useCarouselPanels from '@/hooks/useCarouselPanels'

const spinnerStyle = {
  width: 32,
  height: 32,
  border: '3px solid rgba(0,0,0,0.08)',
  borderTopColor: '#2C97BE',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

export default function EmbedCarousel() {
  const { panels, isLoading, error } = useCarouselPanels()

  useEffect(() => {
    // Remove the pre-React black loader overlay
    const loader = document.getElementById('page-loader')
    if (loader) loader.remove()
    // Clear black backgrounds set on html/body/root for the main app
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.overflow = 'visible'
    const root = document.getElementById('root')
    if (root) root.style.background = 'transparent'
  }, [])

  if (isLoading) return (
    <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={spinnerStyle} />
    </div>
  )

  if (error) return (
    <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
      Unable to load content
    </div>
  )

  return (
    <div style={{ width: '100%', minHeight: '500px', paddingLeft: '500px', boxSizing: 'border-box', paddingBottom: '24px' }}>
      <Carousel panels={panels} />
    </div>
  )
}
