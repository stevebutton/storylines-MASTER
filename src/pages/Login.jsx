import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';
import LoginDisplay from '@/components/auth/LoginDisplay';

export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings]   = useState(null);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(createPageUrl('Stories'), { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  useEffect(() => {
    const load = async () => {
      const [{ data: ls }, { data: hp }] = await Promise.all([
        supabase.from('login_settings').select('*').eq('id', 1).single(),
        supabase.from('homepage').select('hero_image,hero_video,hero_type').eq('id', 1).single(),
      ]);

      let heroImage = null, heroVideo = null, heroType = 'image';
      if (ls?.background_source === 'image' && ls?.background_image) {
        heroImage = ls.background_image; heroType = 'image';
      } else if (ls?.background_source === 'video' && ls?.background_video) {
        heroVideo = ls.background_video; heroType = 'video';
      } else if (hp) {
        heroImage = hp.hero_image || null;
        heroVideo = hp.hero_video || null;
        heroType  = hp.hero_type  || 'image';
      }

      setSettings({
        heading:        ls?.heading          || 'Sign in',
        subtitle:       ls?.subtitle         || 'Enter your credentials to continue',
        buttonText:     ls?.button_text      || 'Sign in',
        welcomeTitle:   ls?.welcome_title    || 'Welcome to Storylines',
        welcomeTagline: ls?.welcome_tagline  || '',
        welcomeBody:    ls?.welcome_body     || '',
        welcomeOverview:ls?.welcome_overview  || '',
        welcomeCtaText: ls?.welcome_cta_text  || 'Request Access',
        welcomeCtaEmail:ls?.welcome_cta_email || '',
        heroImage, heroVideo, heroType,
        heroLoop:      ls?.video_loop ?? true,
        bgDelay:       ls?.anim_bg_delay       ?? 0.5,
        panelDelay:    ls?.anim_panel_delay     ?? 10.0,
        panelDuration: ls?.anim_panel_duration  ?? 3.0,
      });
    };
    load().catch(() => setSettings({}));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setIsLoading(false); }
    else navigate(createPageUrl('Stories'), { replace: true });
  };

  if (isLoadingAuth || !settings) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <LoginDisplay
      {...settings}
      email={email}       setEmail={setEmail}
      password={password} setPassword={setPassword}
      error={error}
      isLoading={isLoading}
      onSubmit={handleSubmit}
    />
  );
}
