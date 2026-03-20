import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Monitor } from 'lucide-react';

const DEFAULT_SETTINGS = {
  heading: 'Sign in',
  subtitle: 'Enter your credentials to continue',
  button_text: 'Sign in',
  background_source: 'homepage',
  background_image: '',
  background_video: '',
};

// ── Live preview ─────────────────────────────────────────────────────────────

function LoginPreview({ settings, homepageBg }) {
  const bgImage =
    settings.background_source === 'homepage' ? homepageBg :
    settings.background_source === 'image'    ? settings.background_image :
    null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center">

      {/* Background */}
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.85)' }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20" />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col items-center px-8 py-10 bg-black/25 backdrop-blur-lg"
        style={{ width: 280 }}
      >
        {/* Logo */}
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/af03c100d_storyline-logo.png"
          alt="Storylines"
          className="h-6 object-contain brightness-0 invert opacity-90 mb-6"
        />

        {/* Heading */}
        <div className="text-center mb-5">
          <h2
            className="text-white font-light mb-1"
            style={{ fontFamily: 'Raleway, sans-serif', fontSize: 18, letterSpacing: '0.04em' }}
          >
            {settings.heading || 'Sign in'}
          </h2>
          <p className="text-white/50" style={{ fontFamily: 'Raleway, sans-serif', fontSize: 11 }}>
            {settings.subtitle || 'Enter your credentials to continue'}
          </p>
        </div>

        {/* Fields */}
        <div className="w-full space-y-2.5 mb-4">
          <div>
            <label className="block text-white/50 mb-1" style={{ fontFamily: 'Raleway, sans-serif', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Email
            </label>
            <div className="w-full h-7 bg-white/10 border border-white/20" />
          </div>
          <div>
            <label className="block text-white/50 mb-1" style={{ fontFamily: 'Raleway, sans-serif', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Password
            </label>
            <div className="w-full h-7 bg-white/10 border border-white/20" />
          </div>
        </div>

        {/* Button */}
        <div
          className="w-full h-8 flex items-center justify-center bg-amber-600/80 text-white"
          style={{ fontFamily: 'Raleway, sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          {settings.button_text || 'Sign in'}
        </div>
      </div>
    </div>
  );
}

// ── Editor field helpers ──────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
    />
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export default function LoginEditor() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [homepageBg, setHomepageBg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('login_settings').select('*').eq('id', 1).single(),
      supabase.from('homepage').select('hero_image,hero_video,hero_type').eq('id', 1).single(),
    ]).then(([{ data: ls }, { data: hp }]) => {
      if (ls) {
        setSettings({
          heading:           ls.heading           ?? DEFAULT_SETTINGS.heading,
          subtitle:          ls.subtitle          ?? DEFAULT_SETTINGS.subtitle,
          button_text:       ls.button_text       ?? DEFAULT_SETTINGS.button_text,
          background_source: ls.background_source ?? DEFAULT_SETTINGS.background_source,
          background_image:  ls.background_image  ?? '',
          background_video:  ls.background_video  ?? '',
        });
      }
      if (hp) setHomepageBg(hp.hero_image || null);
    }).finally(() => setIsLoading(false));
  }, []);

  const set = (key) => (value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('login_settings')
      .update({
        heading:           settings.heading,
        subtitle:          settings.subtitle,
        button_text:       settings.button_text,
        background_source: settings.background_source,
        background_image:  settings.background_image || null,
        background_video:  settings.background_video || null,
      })
      .eq('id', 1);

    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Login page saved');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Stories')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Monitor className="w-5 h-5 text-slate-500" />
            <h1 className="text-lg font-semibold text-slate-800">Login Page Editor</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Body — two columns */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-6 gap-6">

        {/* Left — fields */}
        <div className="w-80 flex-shrink-0 space-y-6">

          {/* Text content */}
          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Text Content</h2>

            <div>
              <FieldLabel>Heading</FieldLabel>
              <TextInput value={settings.heading} onChange={set('heading')} placeholder="Sign in" />
            </div>

            <div>
              <FieldLabel>Subtitle</FieldLabel>
              <TextInput value={settings.subtitle} onChange={set('subtitle')} placeholder="Enter your credentials to continue" />
            </div>

            <div>
              <FieldLabel>Button Text</FieldLabel>
              <TextInput value={settings.button_text} onChange={set('button_text')} placeholder="Sign in" />
            </div>
          </div>

          {/* Background */}
          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Background</h2>

            <div>
              <FieldLabel>Source</FieldLabel>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                {[
                  { value: 'homepage', label: 'Homepage hero' },
                  { value: 'image',    label: 'Custom image' },
                  { value: 'video',    label: 'Custom video' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => set('background_source')(opt.value)}
                    className={`flex-1 py-2 px-2 text-center text-xs transition-colors ${
                      settings.background_source === opt.value
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {settings.background_source === 'homepage' && (
                <p className="text-xs text-slate-400 mt-2">
                  Uses your homepage hero image/video automatically.
                </p>
              )}
            </div>

            {settings.background_source === 'image' && (
              <div>
                <FieldLabel>Image URL</FieldLabel>
                <TextInput
                  value={settings.background_image}
                  onChange={set('background_image')}
                  placeholder="https://..."
                />
                {settings.background_image && (
                  <img
                    src={settings.background_image}
                    alt="preview"
                    className="mt-2 w-full h-20 object-cover rounded-lg border"
                    onError={e => e.target.style.display = 'none'}
                  />
                )}
              </div>
            )}

            {settings.background_source === 'video' && (
              <div>
                <FieldLabel>Video URL</FieldLabel>
                <TextInput
                  value={settings.background_video}
                  onChange={set('background_video')}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Right — preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border shadow-sm" style={{ minHeight: 480 }}>
            <LoginPreview settings={settings} homepageBg={homepageBg} />
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Animations are not shown in preview. Changes take effect after saving.
          </p>
        </div>
      </div>
    </div>
  );
}
