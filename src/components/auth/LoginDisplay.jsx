import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mail } from 'lucide-react';
import RequestAccessModal from './RequestAccessModal';

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
  const [mediaLoaded, setMediaLoaded]         = useState(!heroImage && !heroVideo);
  const [showRequestForm, setShowRequestForm] = useState(false);

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
  // Explanation section builds first; sign-in section starts 2 s later as a distinct step.
  const taglineDelay = 0;
  const titleDelay   = 0.45;
  const bodyDelay    = 0.9;
  const ctaDelay     = 1.35;
  const dividerDelay = 3.5;   // pause after explanation, then divider sweeps in
  const headingDelay = 4.0;   // sign-in heading + logo appear together
  const formDelay    = 4.5;

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


      {/* Request Access modal */}
      {!isPreview && (
        <RequestAccessModal
          isOpen={showRequestForm}
          onClose={() => setShowRequestForm(false)}
          ctaText={welcomeCtaText}
        />
      )}

      {/* Left spacer — hidden on mobile, visible on md+ */}
      <div className="hidden md:flex flex-1 relative z-10" />

      {/* ── Right panel — 50% width, slides in from right ── */}
      {mediaLoaded && (
        <motion.div
          className="relative z-10 w-full md:w-1/2 flex flex-col items-center justify-center py-14 bg-black/40 backdrop-blur-xl overflow-y-auto"
          style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 60 }}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: '0%', opacity: 1 }}
          transition={{ duration: panelDuration, ease: [0.25, 0.46, 0.45, 0.94], delay: panelDelay }}
        >
          <div className="w-full max-w-[500px] flex flex-col items-start text-left">
          {panelLanded && (<>

            {/* ── Welcome content ── */}
            {welcomeTagline && (
              <motion.p
                className="text-amber-400/90 font-light mb-2 uppercase tracking-widest"
                style={{ fontFamily: 'Raleway, sans-serif', fontSize: '1rem' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: taglineDelay }}
              >
                {welcomeTagline}
              </motion.p>
            )}

            <motion.h2
              className="text-white font-light leading-tight mb-0"
              style={{ fontFamily: 'Raleway, sans-serif', fontSize: 'clamp(2rem, 3.5vw, 3rem)' }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: titleDelay }}
            >
              {welcomeTitle}
            </motion.h2>

            {welcomeBody && (
              <motion.p
                className="text-white/60 leading-relaxed mb-8"
                style={{ fontFamily: 'Raleway, sans-serif', fontSize: '1.25rem' }}
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

            {/* Request Access — shown whenever button text is configured */}
            {welcomeCtaText && (
              <motion.div
                className="mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: ctaDelay }}
              >
                <button
                  onClick={isPreview ? undefined : () => setShowRequestForm(true)}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-white transition-colors uppercase tracking-widest text-sm font-medium rounded-xl whitespace-nowrap"
                  style={{ fontFamily: 'Raleway, sans-serif', cursor: isPreview ? 'default' : 'pointer' }}
                >
                  <Mail className="w-4 h-4" />
                  {welcomeCtaText}
                </button>
              </motion.div>
            )}

            {/* Divider */}
            <motion.div
              className="w-full h-px bg-white/15 mb-[10px]"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              style={{ originX: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: dividerDelay }}
            />

            {/* ── Sign-in heading + logo inline ── */}
            <motion.div
              className="mb-1 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: headingDelay }}
            >
              <div className="flex items-center gap-0" style={{ marginBottom: 2 }}>
                <img
                  src="https://uevxdwzgkodbkzludrni.supabase.co/storage/v1/object/public/media/755f1936001f45de86c469cc-LogoCenteredWhite.png"
                  alt="Storylines"
                  width={250}
                  height={100}
                  className="object-contain opacity-90 flex-shrink-0"
                />
                <h1
                  className="text-white text-2xl font-light"
                  style={{ fontFamily: 'Raleway, sans-serif', letterSpacing: '0.04em' }}
                >
                  {heading}
                </h1>
              </div>
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
                    <div key={label} className="w-full flex flex-col items-start">
                      <p
                        className="text-white/55 text-xs mb-1.5 uppercase tracking-wider"
                        style={{ fontFamily: 'Raleway, sans-serif' }}
                      >
                        {label}
                      </p>
                      <div className="w-full md:w-3/4 h-10 bg-white/10 border border-white/20 rounded-xl" />
                    </div>
                  ))}
                  <div className="pt-2">
                    <div
                      className="w-full md:w-1/2 h-11 flex items-center justify-center bg-amber-600/80 text-white text-xs uppercase tracking-wider rounded-xl"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      {buttonText}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5 w-full">
                  <div className="flex flex-col items-start">
                    <label
                      className="text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      Email
                    </label>
                    <input
                      type="email" autoComplete="email" required
                      autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full md:w-3/4 px-3 py-2.5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors text-sm text-left"
                      style={{
                        fontFamily: 'Raleway, sans-serif',
                        background: 'rgba(255,255,255,0.08)',
                        WebkitBoxShadow: '0 0 0 1000px rgba(10,10,20,0.6) inset',
                        WebkitTextFillColor: 'rgba(255,255,255,0.9)',
                        caretColor: 'white',
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-start">
                    <label
                      className="text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      Password
                    </label>
                    <input
                      type="password" autoComplete="current-password" required
                      autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full md:w-3/4 px-3 py-2.5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors text-sm text-left"
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
                  <div className="pt-2">
                    <button
                      type="submit" disabled={isLoading}
                      className="w-full md:w-1/2 py-3 px-4 bg-amber-600/80 hover:bg-amber-600 disabled:bg-amber-600/40 text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider rounded-xl"
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
