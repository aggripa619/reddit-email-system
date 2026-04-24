import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { injectUtmLinks, type SequenceStep } from './utm';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function researchCompany(company: string): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Research the company "${company}" and return ONLY a JSON object with this shape:
{"blurb": "2-3 sentence summary of what they do, their market position, and any AI/digital marketing signals"}
No preamble, no markdown. Just the JSON.`,
      }],
    });
    const text = response.content.find(b => b.type === 'text')?.text ?? '';
    const clean = text.replace(/^```json\n?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(clean);
    return parsed.blurb ?? '';
  } catch {
    return '';
  }
}

export async function generateEmail(params: {
  firstName: string; lastName: string; company: string;
  jobTitle: string; persona: string; step: number;
  companyBlurb: string;
}): Promise<{ subject: string; bodyHtml: string }> {
  const templatePath = path.join(process.cwd(), 'templates', 'email', `step${params.step}.md`);
  const template = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf-8') : '';

  const personaGuidance: Record<string, string> = {
    CMO: 'Emphasise ROI and competitive positioning — frame AI visibility as a boardroom metric.',
    SEO_MANAGER: 'Emphasise LLM SEO / GEO and organic traffic impact from AI answer engines.',
    BRAND_MANAGER: 'Emphasise brand perception and share of voice in AI-generated answers.',
    GROWTH: 'Emphasise pipeline and demand gen implications of AI visibility.',
    OTHER: 'Use the template opening as-is.',
  };

  const prompt = `You are writing a cold outreach email on behalf of AnswerInsight (answerinsight.co).
AnswerInsight tracks whether a brand appears in ChatGPT and AI-generated answers.

Prospect: ${params.firstName} ${params.lastName}, ${params.jobTitle} at ${params.company}
Persona: ${params.persona}
Sequence step: ${params.step} of 3
Company context: ${params.companyBlurb || 'No research available — use template opening as-is.'}

Base template:
${template}

Instructions:
- Keep the template structure and core message intact
- Personalise the opening line using company context (1 sentence max)
- ${personaGuidance[params.persona] ?? personaGuidance.OTHER}
- Do not invent facts not in the company context
- Return ONLY valid JSON: { "subject": "string", "bodyHtml": "string" }
- bodyHtml should be simple HTML with <p> tags, no CSS, no markdown
- No preamble, no code blocks`;

  const step = params.step as SequenceStep;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const clean = text.replace(/^```json\n?/i, '').replace(/```$/i, '').trim();
    const result = JSON.parse(clean) as { subject: string; bodyHtml: string };
    return {
      subject:  result.subject,
      bodyHtml: injectUtmLinks(result.bodyHtml, step, params.persona),
    };
  } catch {
    // Fallback: simple substitution
    const sub = (s: string) => s
      .replace(/\[First Name\]/gi, params.firstName)
      .replace(/\[Company\]/gi, params.company);
    const lines = template.split('\n');
    const subjectLine = lines.find(l => l.startsWith('Subject:'))?.replace('Subject:', '').trim() ?? `Quick question for ${params.firstName}`;
    const body = lines.filter(l => !l.startsWith('Subject:')).join('\n').trim();
    const bodyHtml = `<p>${sub(body).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
    return { subject: sub(subjectLine), bodyHtml: injectUtmLinks(bodyHtml, step, params.persona) };
  }
}
