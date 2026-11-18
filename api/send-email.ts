import nodemailer from 'nodemailer';

interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
}

interface EmailConfig {
  enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  email_user: string;
  email_pass: string;
  from_name: string;
}

interface SendEmailPayload {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  testConfig?: EmailConfig;
}

async function fetchEmailConfigFromSupabase(): Promise<EmailConfig | null> {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const cleanUrl = supabaseUrl.replace(/\/+$/, '');
  const res = await fetch(
    `${cleanUrl}/rest/v1/email_settings?id=eq.default&limit=1`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as EmailConfig[];
  return rows[0] ?? null;
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  let body: SendEmailPayload;
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as SendEmailPayload)
        : ((req.body || {}) as SendEmailPayload);
  } catch {
    res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    return;
  }

  const recipients = (Array.isArray(body.to) ? body.to : [body.to])
    .map((e) => (typeof e === 'string' ? e.trim() : ''))
    .filter((e) => e.includes('@'));

  if (recipients.length === 0 || !body.subject || !body.text) {
    res.status(400).json({
      ok: false,
      error: 'Mungojnë marrësit (email), subjekti ose teksti.',
    });
    return;
  }

  const config = body.testConfig ?? (await fetchEmailConfigFromSupabase());
  if (!config) {
    res.status(400).json({
      ok: false,
      error: 'Konfigurimi i email-it nuk u gjet në databazë.',
    });
    return;
  }

  if (!body.testConfig && !config.enabled) {
    res.status(200).json({ ok: true, skipped: true, reason: 'disabled' });
    return;
  }

  if (!config.smtp_host || !config.email_user || !config.email_pass) {
    res.status(400).json({
      ok: false,
      error: 'Plotësoni SMTP Host, Email dhe Fjalëkalimin.',
    });
    return;
  }

  try {
    const port = Number(config.smtp_port) || 587;
    const transporter = nodemailer.createTransport({
      host: config.smtp_host.trim(),
      port,
      secure: Boolean(config.smtp_secure) || port === 465,
      auth: {
        user: config.email_user.trim(),
        pass: config.email_pass,
      },
    });

    const fromName = (config.from_name || 'ERP Migrim & Gjurmues').trim();
    await transporter.sendMail({
      from: `"${fromName.replace(/"/g, '')}" <${config.email_user.trim()}>`,
      to: recipients.join(', '),
      subject: body.subject,
      text: body.text,
      html: body.html,
    });

    res.status(200).json({ ok: true, sentTo: recipients });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Gabim gjatë dërgimit të email-it.',
    });
  }
}
