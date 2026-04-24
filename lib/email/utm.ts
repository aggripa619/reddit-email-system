// lib/email/utm.ts
// Builds GA4-traceable URLs for every link in outbound emails.
// GA4: Acquisition -> Traffic acquisition -> filter Session source = "email"
//      Secondary dimension "Session manual ad content" separates step performance.

const CAMPAIGN = process.env.UTM_CAMPAIGN ?? 'llm_visibility_2026';
const BASE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://answerinsight.co';

export type SequenceStep = 1 | 2 | 3;

/**
 * Returns a fully-formed, GA4-traceable URL.
 * @param step    Sequence step (1 | 2 | 3).
 * @param persona Prospect persona slug (CMO, SEO_MANAGER, etc.).
 * @param path    Site path — defaults to '/'.
 */
export function utmLink(step: SequenceStep, persona: string, path = '/'): string {
  const params = new URLSearchParams({
    utm_source:   'email',
    utm_medium:   'cold_outreach',
    utm_campaign:  CAMPAIGN,
    utm_content:  `step${step}`,
    utm_term:      persona.toLowerCase(),
  });
  return `${BASE_URL}${path}?${params.toString()}`;
}

/**
 * Replaces every bare answerinsight.co mention in a string with the
 * UTM-tagged URL. Safe to run on both plain text and HTML.
 */
export function injectUtmLinks(text: string, step: SequenceStep, persona: string): string {
  const tagged = utmLink(step, persona);
  return text
    .replace(/\{\{tracking_url\}\}/g, tagged)
    .replace(/https?:\/\/answerinsight\.co(?![^"'\s]*utm_)/g, tagged)
    .replace(/(?<![/"'>])answerinsight\.co(?![^"'\s]*utm_)/g, tagged);
}