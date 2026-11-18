interface VercelRequestLike {
  method?: string;
}

interface VercelResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  end: () => void;
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({
      ok: false,
      error: 'Variablat e Supabase nuk janë konfiguruar në Vercel.',
    });
    return;
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(
      `${cleanUrl}/rest/v1/rollout_phases?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      res.status(503).json({
        ok: false,
        database: 'error',
        status: response.status,
        detail: detail.slice(0, 200),
      });
      return;
    }

    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }

    res.status(200).json({
      ok: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      database: 'unreachable',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
