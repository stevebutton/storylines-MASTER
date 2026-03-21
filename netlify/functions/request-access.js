const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, email, organisation, role, how_heard, message } = body;

  if (!name || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and email are required' }) };
  }

  // Save to Supabase
  const { error: dbError } = await supabase.from('access_requests').insert({
    name,
    email,
    organisation: organisation || null,
    role:         role         || null,
    how_heard:    how_heard    || null,
    message:      message      || null,
  });

  if (dbError) {
    console.error('DB insert error:', dbError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save request' }) };
  }

  // Send email notification via Resend (only if API key is configured)
  if (process.env.RESEND_API_KEY) {
    try {
      // Fetch notification email from login_settings
      const { data: ls } = await supabase
        .from('login_settings')
        .select('welcome_cta_email')
        .eq('id', 1)
        .single();

      const notifyEmail = ls?.welcome_cta_email;

      if (notifyEmail) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from:    fromEmail,
            to:      notifyEmail,
            subject: `New access request from ${name}`,
            html: `
              <h2 style="font-family:sans-serif;margin-bottom:16px">New Access Request</h2>
              <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:6px 16px 6px 0;color:#666">Name</td><td style="padding:6px 0"><strong>${name}</strong></td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${email}">${email}</a></td></tr>
                ${organisation ? `<tr><td style="padding:6px 16px 6px 0;color:#666">Organisation</td><td style="padding:6px 0">${organisation}</td></tr>` : ''}
                ${role         ? `<tr><td style="padding:6px 16px 6px 0;color:#666">Role</td><td style="padding:6px 0">${role}</td></tr>` : ''}
                ${how_heard    ? `<tr><td style="padding:6px 16px 6px 0;color:#666">How they heard</td><td style="padding:6px 0">${how_heard}</td></tr>` : ''}
                ${message      ? `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">Message</td><td style="padding:6px 0">${message.replace(/\n/g, '<br>')}</td></tr>` : ''}
              </table>
            `,
          }),
        });
      }
    } catch (emailErr) {
      // Log but don't fail — the DB insert already succeeded
      console.error('Email notification error:', emailErr);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
