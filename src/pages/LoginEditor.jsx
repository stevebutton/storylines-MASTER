import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Upload, X, RotateCcw } from 'lucide-react';
import LoginDisplay from '@/components/auth/LoginDisplay';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const DEFAULT = {
  heading:             'Sign in',
  subtitle:            'Enter your credentials to continue',
  button_text:         'Sign in',
  background_source:   'homepage',
  background_image:    '',
  background_video:    '',
  anim_bg_delay:       0.5,
  anim_panel_delay:    10.0,
  anim_panel_duration: 3.0,
  welcome_title:       'Welcome to Storylines',
  welcome_tagline:     '',
  welcome_body:        '',
  welcome_overview:    '',
  welcome_cta_text:    'Request Access',
  welcome_cta_email:   '',
  video_loop:          true,
};

// ── Upload ────────────────────────────────────────────────────────────────────

async function uploadToStorage(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}-${safeName}`;
  const { error } = await supabase.storage
    .from('media')
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
  return publicUrl;
}

// ── Field components ──────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{children}</h2>;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value} placeholder={placeholder} rows={rows}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
    />
  );
}

function TimingSlider({ label, value, onChange, min = 0, max, step = 0.1, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-mono text-amber-600">{Number(value).toFixed(1)}s</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-600"
      />
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function UploadButton({ label, accept, isUploading, fileRef, onFileChange }) {
  return (
    <>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-lg transition-colors w-full justify-center"
      >
        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {isUploading ? 'Uploading…' : label}
      </button>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LoginEditor() {
  const [s, setS]                   = useState(DEFAULT);
  const [homepageBg, setHomepageBg] = useState(null);
  const [homepageVideo, setHomepageVideo] = useState(null);
  const [homepageType, setHomepageType]   = useState('image');
  const [isSaving, setIsSaving]     = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isUploadingVid, setIsUploadingVid] = useState(false);
  const [replayKey, setReplayKey]   = useState(0);
  const imgRef = useRef(null);
  const vidRef = useRef(null);

  useEffect(() => {
    Promise.all([
      supabase.from('login_settings').select('*').eq('id', 1).single(),
      supabase.from('homepage').select('hero_image,hero_video,hero_type').eq('id', 1).single(),
    ]).then(([{ data: ls }, { data: hp }]) => {
      if (ls) {
        setS(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.keys(DEFAULT).map(k => [k, ls[k] ?? DEFAULT[k]])
          ),
          background_image: ls.background_image ?? '',
          background_video: ls.background_video ?? '',
        }));
      }
      if (hp) {
        setHomepageBg(hp.hero_image || null);
        setHomepageVideo(hp.hero_video || null);
        setHomepageType(hp.hero_type || 'image');
      }
    }).finally(() => setIsLoading(false));
  }, []);

  const set = useCallback((key) => (value) => setS(prev => ({ ...prev, [key]: value })), []);

  // Resolve preview background
  const previewImage = s.background_source === 'image'    ? (s.background_image || null)
                     : s.background_source === 'homepage' ? homepageBg
                     : null;
  const previewVideo = s.background_source === 'video'    ? (s.background_video || null)
                     : s.background_source === 'homepage' ? homepageVideo
                     : null;
  const previewType  = s.background_source === 'video'    ? 'video'
                     : s.background_source === 'homepage' ? homepageType
                     : 'image';

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingImg(true);
    try {
      const url = await uploadToStorage(file);
      setS(prev => ({ ...prev, background_image: url, background_source: 'image' }));
      toast.success('Image uploaded');
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setIsUploadingImg(false); e.target.value = ''; }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingVid(true);
    try {
      const url = await uploadToStorage(file);
      setS(prev => ({ ...prev, background_video: url, background_source: 'video' }));
      toast.success('Video uploaded');
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setIsUploadingVid(false); e.target.value = ''; }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('login_settings').update({
      heading: s.heading, subtitle: s.subtitle, button_text: s.button_text,
      background_source: s.background_source,
      background_image: s.background_image || null,
      background_video: s.background_video || null,
      anim_bg_delay: s.anim_bg_delay, anim_panel_delay: s.anim_panel_delay,
      anim_panel_duration: s.anim_panel_duration,
      welcome_title: s.welcome_title, welcome_tagline: s.welcome_tagline,
      welcome_body: s.welcome_body, welcome_overview: s.welcome_overview || null,
      welcome_cta_text: s.welcome_cta_text, welcome_cta_email: s.welcome_cta_email,
      video_loop: s.video_loop,
    }).eq('id', 1);
    if (error) toast.error('Failed to save: ' + error.message);
    else       toast.success('Login page saved');
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
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Stories')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-base font-semibold text-slate-800">Login Page Editor</h1>
          </div>
          <button
            onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: settings ── */}
        <div className="w-72 flex-shrink-0 border-r bg-white overflow-y-auto">
          <div className="p-4 space-y-5">

            {/* Welcome panel */}
            <section>
              <SectionTitle>Welcome Panel</SectionTitle>
              <div className="space-y-3">
                <Field label="Tagline (small, above title)">
                  <TextInput value={s.welcome_tagline} onChange={set('welcome_tagline')} placeholder="e.g. a Storylines platform" />
                </Field>
                <Field label="Title">
                  <TextInput value={s.welcome_title} onChange={set('welcome_title')} placeholder="Welcome to Storylines" />
                </Field>
                <Field label="Description">
                  <Textarea value={s.welcome_body} onChange={set('welcome_body')} placeholder="Short description of the app and who it's for…" rows={4} />
                </Field>
                <Field label="Overview (rich text)">
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <ReactQuill
                      value={s.welcome_overview || ''}
                      onChange={set('welcome_overview')}
                      theme="snow"
                      modules={{ toolbar: [['bold', 'italic'], [{ list: 'bullet' }, { list: 'ordered' }], ['link'], ['clean']] }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Appears between description and Request Access button</p>
                </Field>
                <Field label="Request access button text">
                  <TextInput value={s.welcome_cta_text} onChange={set('welcome_cta_text')} placeholder="Request Access" />
                </Field>
                <Field label="Request access email">
                  <TextInput value={s.welcome_cta_email} onChange={set('welcome_cta_email')} placeholder="hello@yourorg.com" />
                  <p className="text-xs text-slate-400 mt-1">Leave blank to hide the button</p>
                </Field>
              </div>
            </section>

            <div className="border-t" />

            {/* Login form text */}
            <section>
              <SectionTitle>Login Form</SectionTitle>
              <div className="space-y-3">
                <Field label="Heading"><TextInput value={s.heading} onChange={set('heading')} placeholder="Sign in" /></Field>
                <Field label="Subtitle"><TextInput value={s.subtitle} onChange={set('subtitle')} placeholder="Enter your credentials to continue" /></Field>
                <Field label="Button text"><TextInput value={s.button_text} onChange={set('button_text')} placeholder="Sign in" /></Field>
              </div>
            </section>

            <div className="border-t" />

            {/* Background */}
            <section>
              <SectionTitle>Background</SectionTitle>
              <div className="space-y-3">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                  {[
                    { value: 'homepage', label: 'Homepage' },
                    { value: 'image',    label: 'Image' },
                    { value: 'video',    label: 'Video' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => set('background_source')(opt.value)}
                      className={`flex-1 py-2 text-center transition-colors ${
                        s.background_source === opt.value
                          ? 'bg-amber-600 text-white font-medium'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {s.background_source === 'homepage' && (
                  <p className="text-xs text-slate-400">Uses your homepage hero automatically.</p>
                )}

                {s.background_source === 'image' && (
                  <div className="space-y-2">
                    <UploadButton label="Upload Image" accept="image/*" isUploading={isUploadingImg} fileRef={imgRef} onFileChange={handleImageUpload} />
                    {s.background_image && (
                      <div className="relative rounded-lg overflow-hidden border">
                        <img src={s.background_image} alt="" className="w-full h-24 object-cover" />
                        <button onClick={() => set('background_image')('')} className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                    <input type="text" value={s.background_image} onChange={e => set('background_image')(e.target.value)} placeholder="Or paste URL…"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                )}

                {s.background_source === 'video' && (
                  <div className="space-y-2">
                    <UploadButton label="Upload Video" accept="video/*" isUploading={isUploadingVid} fileRef={vidRef} onFileChange={handleVideoUpload} />
                    {s.background_video && (
                      <div className="relative rounded-lg overflow-hidden border bg-black">
                        <video src={s.background_video} className="w-full h-24 object-cover" muted playsInline preload="metadata" />
                        <button onClick={() => set('background_video')('')} className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                    <input type="text" value={s.background_video} onChange={e => set('background_video')(e.target.value)} placeholder="Or paste URL…"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!s.video_loop}
                        onChange={e => set('video_loop')(e.target.checked)}
                        className="rounded accent-amber-600"
                      />
                      <span className="text-xs text-slate-600">Loop video</span>
                    </label>
                  </div>
                )}
              </div>
            </section>

            <div className="border-t" />

            {/* Timing */}
            <section>
              <SectionTitle>Animation Timing</SectionTitle>
              <div className="space-y-4">
                <TimingSlider label="Background fade" value={s.anim_bg_delay} onChange={set('anim_bg_delay')} min={0} max={5} hint="Delay before background appears" />
                <TimingSlider label="Panel slide delay" value={s.anim_panel_delay} onChange={set('anim_panel_delay')} min={0} max={20} hint="Wait before panel slides in" />
                <TimingSlider label="Panel slide duration" value={s.anim_panel_duration} onChange={set('anim_panel_duration')} min={0.3} max={5} hint="How long the slide takes" />
              </div>
            </section>

            <div className="pb-4" />
          </div>
        </div>

        {/* ── Right: live preview ── */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0">
            <LoginDisplay
              key={replayKey}
              heading={s.heading}       subtitle={s.subtitle}       buttonText={s.button_text}
              welcomeTitle={s.welcome_title}   welcomeTagline={s.welcome_tagline}
              welcomeBody={s.welcome_body}     welcomeOverview={s.welcome_overview}
              welcomeCtaText={s.welcome_cta_text} welcomeCtaEmail={s.welcome_cta_email}
              heroImage={previewImage}  heroVideo={previewVideo}    heroType={previewType}
              heroLoop={s.video_loop}
              bgDelay={s.anim_bg_delay}         panelDelay={s.anim_panel_delay}
              panelDuration={s.anim_panel_duration}
              className="absolute inset-0"
            />
          </div>
          {/* Replay button */}
          <button
            onClick={() => setReplayKey(k => k + 1)}
            className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>
        </div>

      </div>
    </div>
  );
}
