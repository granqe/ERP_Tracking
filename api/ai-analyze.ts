interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
}

interface TicketSnapshot {
  code: string;
  title: string;
  description: string;
  module: string;
  type: string;
  priority: string;
  status: string;
  department?: string;
  assignee?: string;
  deadline?: string | null;
  blocker_reason?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
}

interface AnalyzePayload {
  mode: 'overview' | 'technical' | 'blockers' | 'single_ticket';
  userRole: string;
  customQuestion?: string;
  apiKey?: string;
  stats: {
    total: number;
    open: number;
    blocked: number;
    critical: number;
    readyForUat: number;
    closed: number;
  };
  tickets: TicketSnapshot[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; thought?: boolean }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
}

function buildSystemInstruction(mode: AnalyzePayload['mode'], userRole: string) {
  const roleContext =
    userRole === 'Programer'
      ? 'Përdoruesi është Programer. Jep udhëzime teknike të qarta, praktike dhe hapa konkretë për zgjidhje.'
      : 'Përdoruesi është Menaxher Projekti (Superadmin). Fokusoju te ecuria, rreziqet, prioritetet dhe koordinimi i ekipit.';

  const modeFocus =
    mode === 'technical'
      ? 'Fokusohu në zgjidhjen teknike të problemeve, shkaqet e mundshme rrënjësore dhe hapat më të thjeshtë për implementim e testim.'
      : mode === 'blockers'
      ? 'Fokusohu ekskluzivisht te tiketat e bllokuara dhe kritike: pse po vonojnë, çfarë rrezikojnë dhe si të zhbllokohen menjëherë.'
      : mode === 'single_ticket'
      ? 'Analizo në detaj tiketën e zgjedhur: shpjego problemin thjesht, jep hapat konkretë të zgjidhjes dhe listën e verifikimit për testim (UAT).'
      : 'Jep një pasqyrë të plotë të ecurisë së migrimit ERP, problemeve kryesore, moduleve me më shumë ngarkesë dhe një plan veprimi të thjeshtë hap-pas-hapi.';

  return [
    'Je një ekspert senior i sistemeve ERP, menaxhimit të projekteve dhe zhvillimit software.',
    'Përgjigju GJITHMONË në gjuhën SHQIPE, me stil të pastër, profesional, të shkurtër dhe praktik.',
    roleContext,
    modeFocus,
    'Strukturo përgjigjen me seksione të qarta duke përdorur tituj (##), pika (-) dhe kode tiketash (p.sh. ERP-101) aty ku ka kuptim.',
    'Jep rekomandime sa më të thjeshta, të drejtpërdrejta dhe të zbatueshme menjëherë.',
  ].join('\n');
}

async function callGeminiEndpoint(
  url: string,
  systemText: string,
  userText: string
): Promise<{ ok: boolean; text?: string; error?: string; status?: number }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemText }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 4096,
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: data.error?.message || `Gabim HTTP ${response.status}`,
    };
  }

  const parts = data.candidates?.[0]?.content?.parts || [];
  const visibleParts = parts.filter((p) => !p.thought && p.text);
  const text = (visibleParts.length > 0 ? visibleParts : parts)
    .map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) {
    return { ok: false, error: 'Gemini ktheu përgjigje boshe.' };
  }

  return { ok: true, text };
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

  let body: AnalyzePayload;
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as AnalyzePayload)
        : ((req.body || {}) as AnalyzePayload);
  } catch {
    res.status(400).json({ ok: false, error: 'Kërkesë JSON e pavlefshme.' });
    return;
  }

  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    body.apiKey ||
    ''
  ).trim();

  if (!apiKey) {
    res.status(400).json({
      ok: false,
      error:
        'Mungon Gemini API Key. Vendoseni GEMINI_API_KEY në Vercel Environment Variables ose ruajeni te konfigurimi në këtë faqe.',
    });
    return;
  }

  const tickets = Array.isArray(body.tickets) ? body.tickets.slice(0, 60) : [];
  const stats = body.stats || {
    total: tickets.length,
    open: 0,
    blocked: 0,
    critical: 0,
    readyForUat: 0,
    closed: 0,
  };

  const systemText = buildSystemInstruction(
    body.mode || 'overview',
    body.userRole || 'Menaxher'
  );

  const ticketsSummary =
    tickets.length === 0
      ? 'Nuk ka tiketa për analizë.'
      : tickets
          .map((t) =>
            [
              `- [${t.code}] "${t.title}"`,
              `  Moduli: ${t.module} | Lloji: ${t.type} | Prioriteti: ${t.priority} | Statusi: ${t.status}`,
              t.department ? `  Departamenti: ${t.department}` : '',
              t.assignee ? `  Programeri: ${t.assignee}` : '  Programeri: Pa caktuar',
              t.deadline ? `  Afati: ${t.deadline}` : '',
              t.blocker_reason ? `  Arsyeja e bllokimit: ${t.blocker_reason}` : '',
              t.resolution_note ? `  Shënimi i zgjidhjes: ${t.resolution_note}` : '',
              `  Përshkrimi: ${(t.description || '').slice(0, 350)}`,
            ]
              .filter(Boolean)
              .join('\n')
          )
          .join('\n\n');

  const userPrompt = [
    `Statistikat aktuale: Gjithsej=${stats.total}, Aktive=${stats.open}, Bllokuar=${stats.blocked}, Kritike=${stats.critical}, Gati për Testim=${stats.readyForUat}, Mbyllur=${stats.closed}.`,
    body.customQuestion?.trim()
      ? `\nPyetja specifike e përdoruesit: ${body.customQuestion.trim()}`
      : '',
    '\nLista e tiketave:',
    ticketsSummary,
  ]
    .filter(Boolean)
    .join('\n');

  const primaryModel = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
  const isVertexExpressKey = apiKey.startsWith('AQ.');
  const encodedKey = encodeURIComponent(apiKey);
  const endpoints = isVertexExpressKey
    ? [
        `https://aiplatform.googleapis.com/v1/publishers/google/models/${primaryModel}:generateContent?key=${encodedKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${encodedKey}`,
        `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${encodedKey}`,
      ]
    : [
        `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${encodedKey}`,
        `https://aiplatform.googleapis.com/v1/publishers/google/models/${primaryModel}:generateContent?key=${encodedKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodedKey}`,
      ];

  let lastError = 'Nuk u arrit komunikimi me Gemini API.';
  for (const url of endpoints) {
    try {
      const result = await callGeminiEndpoint(url, systemText, userPrompt);
      if (result.ok && result.text) {
        res.status(200).json({ ok: true, analysis: result.text });
        return;
      }
      if (result.error) {
        lastError = result.error;
      }
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : 'Gabim rrjeti gjatë thirrjes së AI.';
    }
  }

  res.status(502).json({ ok: false, error: lastError });
}
