import Papa from 'papaparse';
import { insertProspect, getProspectByEmail, updateProspectBlurb } from './db';
import { scoreRisk } from './risk';

type Persona = 'CMO' | 'SEO_MANAGER' | 'BRAND_MANAGER' | 'GROWTH' | 'OTHER';

const PERSONA_KEYWORDS: Record<Persona, string[]> = {
  CMO: ['chief marketing', 'cmo', 'vp marketing', 'vp of marketing', 'marketing director', 'director of marketing'],
  SEO_MANAGER: ['seo', 'search engine', 'organic search', 'head of seo'],
  BRAND_MANAGER: ['brand manager', 'brand director', 'brand strategist', 'head of brand'],
  GROWTH: ['growth', 'demand gen', 'demand generation', 'performance marketing', 'acquisition'],
  OTHER: [],
};

export function inferPersona(jobTitle: string): Persona {
  const lower = jobTitle.toLowerCase();
  for (const [persona, keywords] of Object.entries(PERSONA_KEYWORDS) as [Persona, string[]][]) {
    if (persona === 'OTHER') continue;
    if (keywords.some(k => lower.includes(k))) return persona;
  }
  return 'OTHER';
}

function normaliseRow(raw: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    map[k.toLowerCase().replace(/[\s_-]/g, '')] = v;
  }
  const get = (...keys: string[]) => keys.map(k => map[k] ?? '').find(v => v) ?? '';
  return {
    email:      get('email', 'emailaddress'),
    first_name: get('firstname', 'first'),
    last_name:  get('lastname', 'last'),
    company:    get('company', 'companyname', 'organisation', 'organization'),
    job_title:  get('jobtitle', 'title', 'role', 'position'),
    persona:    get('persona'),
  };
}

export interface IngestResult {
  imported: number; skipped: number; errors: string[];
}

export async function ingestCsv(csvText: string): Promise<IngestResult> {
  const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
    header: true, skipEmptyLines: true,
  });

  let imported = 0, skipped = 0;
  const errorMsgs: string[] = errors.map(e => e.message);

  for (const rawRow of data) {
    const row = normaliseRow(rawRow);
    if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      skipped++;
      continue;
    }
    if (await getProspectByEmail(row.email)) { skipped++; continue; }

    const persona = (row.persona as Persona) || inferPersona(row.job_title);

    const prospectId = await insertProspect({
      email: row.email, first_name: row.first_name, last_name: row.last_name,
      company: row.company, job_title: row.job_title, persona,
      source: 'csv_upload', company_blurb: '', status: 'pending', risk_score: 0,
    });

    if (!prospectId) { skipped++; continue; }

    const { score } = scoreRisk(row.email, row.job_title, '');
    await updateProspectBlurb(prospectId, '', score);

    imported++;
  }

  return { imported, skipped, errors: errorMsgs };
}
