import Carousel from './components/Carousel'
import useCarouselPanels from './hooks/useCarouselPanels'

const spinnerStyle = {
  width: 32,
  height: 32,
  border: '3px solid rgba(0,0,0,0.08)',
  borderTopColor: '#2C97BE',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

export default function App() {
  const { panels, isLoading, error } = useCarouselPanels()

  if (isLoading) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={spinnerStyle} />
    </div>
  )

  if (error) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
      Unable to load content
    </div>
  )

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Carousel panels={panels} />
    </div>
  )
}
