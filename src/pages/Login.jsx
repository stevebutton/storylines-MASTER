import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [heroImage, setHeroImage] = useState(null);
  const [heroVideo, setHeroVideo] = useState(null);
  const [heroType, setHeroType] = useState('image');
  const [mediaLoaded, setMediaLoaded] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(createPageUrl('Stories'), { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  useEffect(() => {
    supabase.from('homepage').select('hero_image,hero_video,hero_type').eq('id', 1).single()
      .then(({ data }) => {
        if (data) {
          setHeroImage(data.hero_image || null);
          setHeroVideo(data.hero_video || null);
          setHeroType(data.hero_type || 'image');
        }
        // If no hero media, show panel immediately
        if (!data?.hero_image && !data?.hero_video) setMediaLoaded(true);
      })
      .catch(() => setMediaLoaded(true));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    } else {
      navigate(createPageUrl('Stories'), { replace: true });
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-900">

      {/* Hero background */}
      {heroType === 'video' && heroVideo ? (
        <motion.video
          src={heroVideo}
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay muted loop playsInline
          onLoadedData={() => setMediaLoaded(true)}
          onError={() => setMediaLoaded(true)}
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ scale: { duration: 5, ease: 'easeOut', delay: 0.5 }, opacity: { duration: 1.5, delay: 0.5 } }}
        />
      ) : heroImage ? (
        <motion.img
          src={heroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          onLoad={() => setMediaLoaded(true)}
          onError={() => setMediaLoaded(true)}
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ scale: { duration: 5, ease: 'easeOut', delay: 0.5 }, opacity: { duration: 1.5, delay: 0.5 } }}
        />
      ) : null}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20 z-[1]" />

      {/* Login panel — slides in from top, same as StoryHeader content panel */}
      {mediaLoaded && (
        <motion.div
          className="relative z-10 w-[460px] max-w-[90vw] flex flex-col items-center px-10 py-12 bg-black/25 backdrop-blur-lg"
          initial={{ translateY: '-100%', opacity: 0 }}
          animate={{ translateY: '0', opacity: 1 }}
          transition={{ duration: 2.4, ease: [0.42, 0, 1, 1], delay: 1 }}
        >
          {/* Logo */}
          <motion.img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/af03c100d_storyline-logo.png"
            alt="Storylines"
            className="h-10 object-contain brightness-0 invert opacity-90 mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 2.2 }}
          />

          {/* Heading */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2.5 }}
          >
            <h1
              className="text-white text-3xl font-light mb-2"
              style={{ fontFamily: 'Raleway, sans-serif', letterSpacing: '0.04em' }}
            >
              Sign in
            </h1>
            <p className="text-white/50 text-sm" style={{ fontFamily: 'Raleway, sans-serif' }}>
              Enter your credentials to continue
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="w-full space-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2.8 }}
          >
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider" style={{ fontFamily: 'Raleway, sans-serif' }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-colors text-sm"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider" style={{ fontFamily: 'Raleway, sans-serif' }}>
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-colors text-sm"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 mt-2 bg-amber-600/80 hover:bg-amber-600 disabled:bg-amber-600/40 text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              style={{ fontFamily: 'Raleway, sans-serif' }}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </motion.form>
        </motion.div>
      )}
    </div>
  );
}
