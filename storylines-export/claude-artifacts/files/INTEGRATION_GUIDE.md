# TextPanelCarousel Integration Guide

## Overview
TextPanelCarousel is a glassmorphism text overlay component with automatic pagination, staggered entrance animations, and smooth height transitions.

## Dependencies
```json
{
  "react": "^18.0.0",
  "framer-motion": "^11.0.0"
}
```

Install if needed:
```bash
npm install framer-motion
```

## Basic Usage

```jsx
import TextPanelCarousel from './components/TextPanelCarousel';
import { AnimatePresence } from 'framer-motion';

function MyGallery() {
  const [currentImage, setCurrentImage] = useState(0);
  
  const slides = [
    {
      imageUrl: 'https://...',
      chapterTitle: 'Chapter 3: Urban Shadows',
      slideTitle: 'Nairobi After Dark',
      location: 'Nairobi, Kenya',
      description: 'Short intro paragraph...',
      extendedContent: [
        'First extended paragraph with lots of detail...',
        'Second extended paragraph with even more detail...'
      ]
    },
    // ... more slides
  ];

  return (
    <div className="relative w-full h-screen">
      {/* Background image */}
      <img src={slides[currentImage].imageUrl} className="w-full h-full object-cover" />
      
      {/* Text panel overlay */}
      <div className="absolute top-[100px] left-[40px] z-10">
        <AnimatePresence mode="wait">
          <TextPanelCarousel
            key={currentImage}
            chapterTitle={slides[currentImage].chapterTitle}
            slideTitle={slides[currentImage].slideTitle}
            location={slides[currentImage].location}
            description={slides[currentImage].description}
            extendedContent={slides[currentImage].extendedContent}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
```

## Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `chapterTitle` | `string` | No | Small uppercase gray text at top |
| `slideTitle` | `string` | No | Large bold heading |
| `description` | `string` | Yes | First page content (always short, never auto-split) |
| `extendedContent` | `string[]` | Yes | Array of additional content (auto-splits at 550 chars) |
| `location` | `string` | No | Location text with orange dot indicator |

## Auto-Pagination

Content in `extendedContent` array is **automatically split** at 550 characters while respecting paragraph boundaries.

**How it works:**
- `description` is always page 1 (never split)
- Each item in `extendedContent` is checked
- If item exceeds 550 chars, it's split at paragraph breaks (`\n\n`)
- Results in dynamic page count

**To adjust the character limit:**
```jsx
// In TextPanelCarousel.jsx, line ~60:
const splitIntoPagesAtParagraphs = (text, maxChars = 550) => {
  // Change 550 to your desired limit (e.g., 750, 450)
```

**Example:**
```jsx
// Input
extendedContent: [
  "Paragraph 1 is 300 chars...\n\nParagraph 2 is 400 chars...", // 700 total
  "Short paragraph 200 chars..."
]

// Result: 3 pages
// Page 1: description
// Page 2: "Paragraph 1 is 300 chars..."
// Page 3: "Paragraph 2 is 400 chars..."
// Page 4: "Short paragraph 200 chars..."
```

## Positioning

**Default positioning:** 100px from top, 40px from left, 400px wide

**To adjust:**
```jsx
// Wrapper div positioning
<div className="absolute top-[100px] left-[40px] z-10">

// Component width (in TextPanelCarousel.jsx, line ~242)
<motion.div className="... w-[400px] ...">
```

## Animations

### Panel Entrance (on image change)
- Slides up from y: -100px, fades in
- Delay: 1s, Duration: 1s

### Staggered Text Reveals (first load only)
After panel slides in, elements reveal in sequence:
1. Chapter title: 2.2s
2. Slide title: 2.8s  
3. Location: 3.4s
4. Content: 4.0s

Once `hasAnimatedIn` flag is set, these staggers don't replay on toggle/navigation.

### Height Transitions
- Automatically animates when page content changes length
- Duration: 1s with easeInOut easing
- Measures actual DOM height via refs

### Page Transitions
- Content dissolves: 300ms opacity fade
- Happens when navigating between pages

### Toggle Open/Close
- Height: 500ms with easeInOut
- No stagger replay after initial load

## Keyboard Navigation
- **Left Arrow:** Previous page
- **Right Arrow:** Next page

## Styling Notes

**Requires Tailwind CSS** for styling. 

**Key design elements:**
- Glassmorphism: `bg-white/80 backdrop-blur-md`
- Text alignment: All text right-aligned (`text-right`)
- Max content height: `max-h-[calc(100vh-340px)]` with scroll
- Spacing: 30px margin after location element

**To customize:**

**Colors:**
- Panel background: `bg-white/80` → change opacity or color
- Text colors: `text-gray-900`, `text-gray-600`, `text-black`
- Orange location dot: `bg-orange-500` → change to any Tailwind color

**Typography:**
- Chapter: `text-sm font-semibold uppercase tracking-wide`
- Title: `text-2xl font-bold`
- Content: `text-base leading-relaxed`
- Location: `text-sm`

**Dimensions:**
- Panel width: `w-[400px]` (line ~242)
- Panel padding: `p-8`
- Toggle button: `w-8 h-8`

## Integration with Base44

Since you're using Claude Code to edit within Base44:

1. **Add component file** (`TextPanelCarousel.jsx`) to your components folder
2. **Install framer-motion**: `npm install framer-motion`
3. **Verify Tailwind CSS** is configured and working
4. **Wrap with AnimatePresence** for entrance/exit animations
5. **Use unique key prop** - change when image changes to trigger panel animations

**Critical for animations to work:**
```jsx
<AnimatePresence mode="wait">
  <TextPanelCarousel
    key={currentImage}  // ← Must change to trigger entrance/exit
    {...props}
  />
</AnimatePresence>
```

## Data Structure Example

```javascript
const slideData = [
  {
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
    chapterTitle: "Chapter 3: Urban Shadows",
    slideTitle: "Nairobi After Dark",
    location: "Nairobi, Kenya",
    description: "In the shadows of Nairobi's night, a figure sits motionless against the blur of the city. The darkness obscures details, offering anonymity to someone caught in a moment of vulnerability.",
    extendedContent: [
      "The soft glow of distant lights creates an almost abstract backdrop—greens and pinks bleeding into darkness—while the foreground remains stubbornly out of reach, both literally and figuratively. The blurred setting mirrors the way society often chooses to see this reality: unfocused, indistinct, easier to ignore.",
      "Filmed covertly to protect both subject and observer, the footage captures a stillness that feels suspended in time. There's no dramatic action, no sensational moment—just the quiet persistence of a crisis that unfolds nightly in cities across East Africa."
    ]
  },
  // More slides...
];
```

## Common Issues & Solutions

**Height not animating smoothly?**
- All pages must be rendered in DOM (they are, just hidden)
- Check that `pageRefs` are properly assigned
- Verify height measurement is working (console.log in useEffect)

**Animations replaying when toggling?**
- `hasAnimatedIn` flag should persist after first load
- Only resets when `key` prop changes (new image/slide)
- Check AnimatePresence has `mode="wait"`

**Content overflowing panel?**
- Adjust `max-h-[calc(100vh-340px)]` to your needs
- Panel has scrolling enabled if content exceeds max height

**Staggered animations not playing?**
- Verify component has unique `key` prop
- Wrapped in AnimatePresence?
- `hasAnimatedIn` is false on first mount?

**Progress dots not showing?**
- Only visible when `pages.length > 1`
- Check if extendedContent is actually creating multiple pages

## Performance Notes

- All pages rendered in DOM simultaneously (hidden except current)
- Acceptable for <10 pages, tested with 3-5 pages
- Height calculations use `offsetHeight` (triggers layout, but infrequent)
- Stagger animations run once per component instance
- Page transitions are lightweight (opacity only)

## Future Enhancements (Ideas)

- Make character limit configurable via props
- Add custom color themes via props
- Support for images within content
- Optional auto-advance timer
- Custom animation timing props
- RTL support for non-English languages
