const { createClient } = require('@supabase/supabase-js');

const admin = createClient(
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

  const { email, full_name, role } = body;
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
  }

  const validRoles = ['admin', 'user', 'viewer'];
  const userRole = validRoles.includes(role) ? role : 'viewer';

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role: userRole }
  });

  if (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ id: data.user.id })
  };
};
