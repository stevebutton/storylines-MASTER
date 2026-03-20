import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mail } from 'lucide-react';

/**
 * LoginDisplay — pure animated login UI, no auth logic.
 * Used by both Login.jsx (live page) and LoginEditor.jsx (preview).
 * Re-mounting via key prop replays all animations.
 */
export default function LoginDisplay({
  // Login form text
  heading     = 'Sign in',
  subtitle    = 'Enter your credentials to continue',
  buttonText  = 'Sign in',
  // Welcome panel (left)
  welcomeTitle    = 'Welcome to Storylines',
  welcomeTagline  = '',
  welcomeBody     = '',
  welcomeCtaText  = 'Request Access',
  welcomeCtaEmail = '',
  // Background
  heroImage = null,
  heroVideo = null,
  heroType  = 'image',
  // Timings (seconds)
  bgDelay         = 0.5,
  panelDelay      = 1.0,
  panelDuration   = 2.4,
  contentDelay    = 2.2,
  // Form (omit in preview mode)
  email, setEmail,
  password, setPassword,
  error,
  isLoading,
  onSubmit,
  // Layout
  className = 'fixed inset-0',
}) {
  const [mediaLoaded, setMediaLoaded] = useState(!heroImage && !heroVideo);

  const isPreview    = !onSubmit;
  const logoDelay    = contentDelay;
  const headingDelay = contentDelay + 0.3;
  const formDelay    = contentDelay + 0.6;
  const leftDelay    = contentDelay;

  return (
    <div className={`${className} flex items-center justify-center overflow-hidden bg-slate-900`}>

      {/* ── Background ── */}
      {heroType === 'video' && heroVideo ? (
        <motion.video
          key={heroVideo}
          src={heroVideo}
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay muted loop playsInline
          onLoadedData={() => setMediaLoaded(true)}
          onError={() => setMediaLoaded(true)}
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            scale:   { duration: 5, ease: 'easeOut', delay: bgDelay },
            opacity: { duration: 1.5, delay: bgDelay },
          }}
        />
      ) : heroImage ? (
        <motion.img
          key={heroImage}
          src={heroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          onLoad={() => setMediaLoaded(true)}
          onError={() => setMediaLoaded(true)}
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            scale:   { duration: 5, ease: 'easeOut', delay: bgDelay },
            opacity: { duration: 1.5, delay: bgDelay },
          }}
        />
      ) : null}

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30 z-[1]" />

      {/* ── Split panel ── */}
      {mediaLoaded && (
        <motion.div
          className="relative z-10 flex max-w-[960px] w-full mx-6"
          initial={{ translateY: '-100%', opacity: 0 }}
          animate={{ translateY: '0', opacity: 1 }}
          transition={{ duration: panelDuration, ease: [0.42, 0, 1, 1], delay: panelDelay }}
        >
          {/* ── Left: welcome content ── */}
          <div className="flex-1 min-w-0 flex flex-col justify-center px-12 py-14 bg-black/20 backdrop-blur-lg">

            {/* Tagline */}
            {welcomeTagline && (
              <motion.p
                className="text-amber-400/90 text-sm font-light mb-4 uppercase tracking-widest"
                style={{ fontFamily: 'Raleway, sans-serif' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: leftDelay }}
              >
                {welcomeTagline}
              </motion.p>
            )}

            {/* Title */}
            <motion.h2
              className="text-white font-light leading-tight mb-5"
              style={{ fontFamily: 'Raleway, sans-serif', fontSize: 'clamp(1.75rem, 3vw, 2.75rem)' }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, delay: leftDelay + 0.15 }}
            >
              {welcomeTitle}
            </motion.h2>

            {/* Body */}
            {welcomeBody && (
              <motion.p
                className="text-white/60 leading-relaxed mb-8"
                style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.95rem', maxWidth: '38ch' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: leftDelay + 0.35 }}
              >
                {welcomeBody}
              </motion.p>
            )}

            {/* Request access CTA */}
            {(welcomeCtaText || welcomeCtaEmail) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: leftDelay + 0.55 }}
              >
                {welcomeCtaEmail ? (
                  <a
                    href={isPreview ? undefined : `mailto:${welcomeCtaEmail}`}
                    className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-5 py-2.5 transition-colors"
                    style={{ fontFamily: 'Raleway, sans-serif', letterSpacing: '0.05em' }}
                    onClick={isPreview ? e => e.preventDefault() : undefined}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {welcomeCtaText || 'Request Access'}
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-2 text-sm text-white/60"
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {welcomeCtaText}
                  </span>
                )}
              </motion.div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px bg-white/15 flex-shrink-0" />

          {/* ── Right: login form ── */}
          <div className="w-[360px] flex-shrink-0 flex flex-col items-center px-10 py-14 bg-black/30 backdrop-blur-lg">

            {/* Logo */}
            <motion.img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/af03c100d_storyline-logo.png"
              alt="Storylines"
              className="h-9 object-contain brightness-0 invert opacity-90 mb-10"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: logoDelay }}
            />

            {/* Heading */}
            <motion.div
              className="text-center mb-8 w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: headingDelay }}
            >
              <h1
                className="text-white text-2xl font-light mb-1.5"
                style={{ fontFamily: 'Raleway, sans-serif', letterSpacing: '0.04em' }}
              >
                {heading}
              </h1>
              <p className="text-white/45 text-sm" style={{ fontFamily: 'Raleway, sans-serif' }}>
                {subtitle}
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: formDelay }}
            >
              {isPreview ? (
                <div className="space-y-4">
                  {['Email', 'Password'].map(label => (
                    <div key={label}>
                      <p
                        className="text-white/55 text-xs mb-1.5 uppercase tracking-wider"
                        style={{ fontFamily: 'Raleway, sans-serif' }}
                      >
                        {label}
                      </p>
                      <div className="w-full h-11 bg-white/10 border border-white/20" />
                    </div>
                  ))}
                  <div
                    className="w-full h-11 mt-2 flex items-center justify-center bg-amber-600/80 text-white text-xs uppercase tracking-wider"
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                  >
                    {buttonText}
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label
                      className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      Email
                    </label>
                    <input
                      type="email" autoComplete="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/25 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-colors text-sm"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      Password
                    </label>
                    <input
                      type="password" autoComplete="current-password" required
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/25 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-colors text-sm"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 px-4 py-2.5">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit" disabled={isLoading}
                    className="w-full py-3 px-4 mt-1 bg-amber-600/80 hover:bg-amber-600 disabled:bg-amber-600/40 text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {buttonText}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
