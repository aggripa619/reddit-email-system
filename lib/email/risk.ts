const ROLE_PREFIXES = ['info', 'hello', 'contact', 'marketing', 'sales', 'support', 'admin', 'team', 'enquiries', 'enquiry', 'noreply', 'no-reply'];
const FREE_DOMAINS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'live.com'];
const JUNIOR_KEYWORDS = ['intern', 'junior', 'assistant', 'trainee', 'coordinator', 'associate'];

export interface RiskResult { score: number; reasons: string[]; }

export function scoreRisk(email: string, jobTitle: string, companyBlurb: string): RiskResult {
  const reasons: string[] = [];
  let score = 0;

  const [localPart, domain] = email.toLowerCase().split('@');
  if (ROLE_PREFIXES.some(p => localPart === p || localPart.startsWith(p + '.'))) {
    reasons.push('Role address (e.g. info@, marketing@)');
    score += 4;
  }
  if (FREE_DOMAINS.includes(domain ?? '')) {
    reasons.push('Free email provider');
    score += 4;
  }
  if (!companyBlurb || companyBlurb.length < 30) {
    reasons.push('Thin or missing company research');
    score += 2;
  }
  const titleLower = (jobTitle ?? '').toLowerCase();
  if (JUNIOR_KEYWORDS.some(k => titleLower.includes(k))) {
    reasons.push('Junior/non-decision-maker title');
    score += 2;
  }

  return { score: Math.min(score, 10), reasons };
}
