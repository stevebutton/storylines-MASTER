import { useState, useEffect } from 'react'

const WP_API = import.meta.env.VITE_WP_API_URL

function normalizePanel(post) {
  const acf = post.acf || {}
  return {
    id: post.id,
    category: post.title?.rendered || '',
    description: acf.panel_description || '',
    image: typeof acf.panel_image === 'string' ? acf.panel_image : null,
    _imageId: typeof acf.panel_image === 'number' ? acf.panel_image : null,
    videoUrl: acf.panel_video_url || null,
    content: acf.panel_content || '',
    link: acf.panel_link || null,
    order: post.menu_order ?? 0,
  }
}

async function resolveImageIds(panels) {
  const needsResolution = panels.filter(p => p._imageId)
  if (!needsResolution.length) return panels

  const resolved = await Promise.all(
    needsResolution.map(p =>
      fetch(`${WP_API}/storylines/v1/media-url/${p._imageId}?_=${Date.now()}`)
        .then(r => r.json())
        .then(m => ({ id: p.id, url: m.source_url || null }))
        .catch(() => ({ id: p.id, url: null }))
    )
  )

  return panels.map(p => {
    const match = resolved.find(r => r.id === p.id)
    const { _imageId, ...rest } = p
    return match ? { ...rest, image: match.url } : rest
  })
}

export default function useMosaicPanels() {
  const [panels, setPanels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!WP_API) {
      setError('VITE_WP_API_URL is not set')
      setIsLoading(false)
      return
    }

    const url = `${WP_API}/wp/v2/mosaic_panel?per_page=20&orderby=menu_order&order=asc&_fields=id,title,acf,menu_order&_=${Date.now()}`

    fetch(url, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`WordPress API returned HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        const normalized = data
          .map(normalizePanel)
          .sort((a, b) => a.order - b.order)
        return resolveImageIds(normalized)
      })
      .then(panels => {
        setPanels(panels)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('[useMosaicPanels]', err)
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  return { panels, isLoading, error }
}
