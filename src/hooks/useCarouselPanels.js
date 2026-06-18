import { useState, useEffect } from 'react'

const WP_API = import.meta.env.VITE_WP_API_URL

/**
 * Normalizes a WordPress carousel_panel post (with ACF fields) into
 * the shape the Carousel component expects.
 *
 * Expected ACF fields on the carousel_panel post type:
 *   panel_description     — Textarea
 *   panel_image           — Image (returns attachment ID via REST API)
 *   panel_expanded_image  — Image (optional, jpg shown when card is expanded)
 *   expanded_video_url        — URL (optional, mp4 dissolved in when card is expanded)
 *   panel_video_url       — URL (mp4, YouTube, or Vimeo; standalone autoplay background)
 *   panel_content         — WYSIWYG (returns HTML string)
 *   panel_link            — URL (optional, shows Find Out More button)
 */
function normalizePanel(post) {
  const acf = post.acf || {}
  return {
    id: post.id,
    category: post.title?.rendered || '',
    description: acf.panel_description || '',
    image: typeof acf.panel_image === 'string' ? acf.panel_image : null,
    _imageId: typeof acf.panel_image === 'number' ? acf.panel_image : null,
    expandedImage: typeof acf.panel_expanded_image === 'string' ? acf.panel_expanded_image : null,
    _expandedImageId: typeof acf.panel_expanded_image === 'number' ? acf.panel_expanded_image : null,
    expandedVideoUrl: acf.expanded_video_url || null,
    videoUrl: acf.panel_video_url || null,
    content: acf.panel_content || '',
    link: acf.panel_link || null,
    order: post.menu_order ?? 0,
  }
}

async function resolveImageIds(panels) {
  // Collect all attachment IDs that need resolving across both image fields
  const tasks = []
  panels.forEach(p => {
    if (p._imageId) tasks.push({ panelId: p.id, attachmentId: p._imageId, field: 'image' })
    if (p._expandedImageId) tasks.push({ panelId: p.id, attachmentId: p._expandedImageId, field: 'expandedImage' })
  })

  if (!tasks.length) return panels

  const resolved = await Promise.all(
    tasks.map(t =>
      fetch(`${WP_API}/storylines/v1/media-url/${t.attachmentId}?_=${Date.now()}`)
        .then(r => r.json())
        .then(m => ({ ...t, url: m.source_url || null }))
        .catch(() => ({ ...t, url: null }))
    )
  )

  return panels.map(p => {
    const { _imageId, _expandedImageId, ...rest } = p
    const updates = {}
    resolved.filter(r => r.panelId === p.id).forEach(r => { updates[r.field] = r.url })
    return { ...rest, ...updates }
  })
}

export default function useCarouselPanels() {
  const [panels, setPanels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!WP_API) {
      setError('VITE_WP_API_URL is not set')
      setIsLoading(false)
      return
    }

    const url = `${WP_API}/wp/v2/carousel_panel?per_page=20&orderby=menu_order&order=asc&_fields=id,title,acf,menu_order&_=${Date.now()}`

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
        console.error('[useCarouselPanels]', err)
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  return { panels, isLoading, error }
}
