import React, { useState, useEffect } from 'react';
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
  welcomeOverview = '',
  welcomeCtaText  = 'Request Access',
  welcomeCtaEmail = '',
  // Background
  heroImage = null,
  heroVideo = null,
  heroType  = 'image',
  heroLoop  = true,
  // Timings (seconds)
  bgDelay       = 0.5,
  panelDelay    = 10.0,
  panelDuration = 3.0,
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

  const isPreview = !onSubmit;

  // panelLanded gates element animations — becomes true only after the panel has fully arrived.
  // In preview mode we set it immediately so content is always visible.
  const [panelLanded, setPanelLanded] = useState(isPreview);

  useEffect(() => {
    if (panelLanded) return;
    // Wait until mediaLoaded before starting the clock (media load can add latency).
    if (!mediaLoaded) return;
    const ms = (panelDelay + panelDuration + 0.15) * 1000;
    const t = setTimeout(() => setPanelLanded(true), ms);
    return () => clearTimeout(t);
  }, [mediaLoaded, panelDelay, panelDuration, panelLanded]);

  // Element delays are relative to when children mount (i.e. when panel has landed).
  const logoDelay    = 0;
  const taglineDelay = 0.45;
  const titleDelay   = 0.9;
  const bodyDelay    = 1.35;
  const ctaDelay     = 1.8;
  const dividerDelay = 2.15;
  const headingDelay = 2.6;
  const formDelay    = 3.1;

  return (
    <div className={`${className} flex overflow-hidden bg-slate-900`}>

      {/* ── Background ── */}
      {heroType === 'video' && heroVideo ? (
        <motion.video
          key={heroVideo}
          src={heroVideo}
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay muted loop={heroLoop} playsInline
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

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30 z-[1]" />

      {/* Left spacer — transparent, shows background */}
      <div className="flex-1 relative z-10" />

      {/* ── Right panel — 40% width, slides in from right ── */}
      {mediaLoaded && (
        <motion.div
          className="relative z-10 flex flex-col items-center justify-center py-14 bg-black/40 backdrop-blur-xl overflow-y-auto"
          style={{ width: '50%', paddingLeft: 0, paddingRight: 0 }}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: '0%', opacity: 1 }}
          transition={{ duration: panelDuration, ease: [0.25, 0.46, 0.45, 0.94], delay: panelDelay }}
        >
          <div className="w-full max-w-[500px] flex flex-col items-center text-center">
          {panelLanded && (<>

            {/* Logo — full size 250×100 */}
            <motion.img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
              alt="Storylines"
              width={250}
              height={100}
              className="object-contain brightness-0 invert opacity-90 mb-8"
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: logoDelay }}
            />

            {/* ── Welcome content ── */}
            {welcomeTagline && (
              <motion.p
                className="text-amber-400/90 text-sm font-light mb-4 uppercase tracking-widest"
                style={{ fontFamily: 'Raleway, sans-serif' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: taglineDelay }}
              >
                {welcomeTagline}
              </motion.p>
            )}

            <motion.h2
              className="text-white font-light leading-tight mb-5"
              style={{ fontFamily: 'Raleway, sans-serif', fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)' }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: titleDelay }}
            >
              {welcomeTitle}
            </motion.h2>

            {welcomeBody && (
              <motion.p
                className="text-white/60 leading-relaxed mb-8"
                style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.95rem' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: bodyDelay }}
              >
                {welcomeBody}
              </motion.p>
            )}

            {/* ── Overview (rich text) ── */}
            {welcomeOverview && (
              <motion.div
                className="text-white/75 leading-relaxed mb-8 text-sm login-overview-content"
                style={{ fontFamily: 'Raleway, sans-serif' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: bodyDelay + 0.45 }}
                dangerouslySetInnerHTML={{ __html: welcomeOverview }}
              />
            )}

            {/* Request Access — prominent amber CTA, 50% width */}
            {(welcomeCtaText || welcomeCtaEmail) && (
              <motion.div
                className="mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: ctaDelay }}
              >
                {welcomeCtaEmail ? (
                  <a
                    href={isPreview ? undefined : `mailto:${welcomeCtaEmail}`}
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-white transition-colors uppercase tracking-widest text-sm font-medium rounded-xl whitespace-nowrap"
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                    onClick={isPreview ? e => e.preventDefault() : undefined}
                  >
                    <Mail className="w-4 h-4" />
                    {welcomeCtaText || 'Request Access'}
                  </a>
                ) : (
                  <div
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-amber-500/70 text-white uppercase tracking-widest text-sm font-medium rounded-xl whitespace-nowrap"
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                  >
                    <Mail className="w-4 h-4" />
                    {welcomeCtaText}
                  </div>
                )}
              </motion.div>
            )}

            {/* Divider */}
            <motion.div
              className="w-full h-px bg-white/15 mb-10"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              style={{ originX: 0.5 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: dividerDelay }}
            />

            {/* ── Sign-in heading ── */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: headingDelay }}
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

            {/* ── Form ── */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: formDelay }}
            >
              {isPreview ? (
                <div className="space-y-5">
                  {['Email', 'Password'].map(label => (
                    <div key={label} className="w-full flex flex-col items-center">
                      <p
                        className="text-white/55 text-xs mb-1.5 uppercase tracking-wider"
                        style={{ fontFamily: 'Raleway, sans-serif' }}
                      >
                        {label}
                      </p>
                      <div className="w-3/4 h-10 bg-white/10 border border-white/20 rounded-xl" />
                    </div>
                  ))}
                  <div className="pt-2 flex justify-center w-full">
                    <div
                      className="w-1/2 h-11 flex items-center justify-center bg-amber-600/80 text-white text-xs uppercase tracking-wider rounded-xl"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      {buttonText}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5 w-full">
                  <div className="flex flex-col items-center">
                    <label
                      className="text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      Email
                    </label>
                    <input
                      type="email" autoComplete="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-3/4 px-3 py-2.5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors text-sm text-center"
                      style={{
                        fontFamily: 'Raleway, sans-serif',
                        background: 'rgba(255,255,255,0.08)',
                        WebkitBoxShadow: '0 0 0 1000px rgba(10,10,20,0.6) inset',
                        WebkitTextFillColor: 'rgba(255,255,255,0.9)',
                        caretColor: 'white',
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label
                      className="text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      Password
                    </label>
                    <input
                      type="password" autoComplete="current-password" required
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-3/4 px-3 py-2.5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors text-sm text-center"
                      style={{
                        fontFamily: 'Raleway, sans-serif',
                        background: 'rgba(255,255,255,0.08)',
                        WebkitBoxShadow: '0 0 0 1000px rgba(10,10,20,0.6) inset',
                        WebkitTextFillColor: 'rgba(255,255,255,0.9)',
                        caretColor: 'white',
                      }}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 px-4 py-2.5">
                      {error}
                    </p>
                  )}
                  <div className="pt-2 flex justify-center w-full">
                    <button
                      type="submit" disabled={isLoading}
                      className="w-1/2 py-3 px-4 bg-amber-600/80 hover:bg-amber-600 disabled:bg-amber-600/40 text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider rounded-xl"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {buttonText}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>

          </>)}
          </div>
        </motion.div>
      )}
    </div>
  );
}
