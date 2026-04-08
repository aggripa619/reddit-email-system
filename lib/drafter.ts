import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface DraftParams {
  username: string; subreddit: string; postTitle: string;
  commentBody: string; templateSubject: string; templateBody: string;
}

export interface DraftResult { subject: string; body: string; }

export async function draftDM(params: DraftParams): Promise<DraftResult> {
  const prompt = `You are drafting a personalised Reddit DM for AnswerInsight (answerinsight.co), a SaaS that helps brands monitor their visibility in AI-generated answers.

Template subject: ${params.templateSubject}
Template body:
${params.templateBody}

Personalise based on:
- Reddit username: u/${params.username}
- Subreddit: r/${params.subreddit}
- Post they commented on: "${params.postTitle}"
- Their comment: "${params.commentBody.slice(0, 200)}"

Rules:
- Keep it natural and conversational, not salesy
- Replace {{username}}, {{subreddit}}, {{post_title}}, {{comment_excerpt}} with real values
- Body under 200 words, no markdown formatting
- Return ONLY valid JSON: { "subject": "string", "body": "string" }
- No preamble, no code blocks`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const clean = text.replace(/^```json\n?/i, '').replace(/```$/i, '').trim();
    return JSON.parse(clean) as DraftResult;
  } catch (err) {
    console.error('[Drafter] Falling back to template:', err);
    const sub = (s: string) => s
      .replace(/\{\{username\}\}/g, `u/${params.username}`)
      .replace(/\{\{subreddit\}\}/g, `r/${params.subreddit}`)
      .replace(/\{\{post_title\}\}/g, params.postTitle)
      .replace(/\{\{comment_excerpt\}\}/g, params.commentBody.slice(0, 100));
    return { subject: sub(params.templateSubject), body: sub(params.templateBody) };
  }
}
