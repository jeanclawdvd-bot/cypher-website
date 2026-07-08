/**
 * Client-side lead submission: POST to `/api/leads`, fire the funnel events,
 * and tell the form whether it should fall back to `mailto:`.
 *
 * The contract with the form: a `success` result shows the thank-you state; a
 * `fallback` result means the lead could not be captured server-side, so the
 * form opens the pre-filled `mailto:` so the lead still reaches a human.
 */
import { track } from '@/features/analytics';
import {
  analyticsProps,
  buildMailtoUrl,
  type LeadType,
  type LeadValues,
} from './leads';

export type SubmitResult = 'success' | 'fallback';

export async function submitLead(type: LeadType, values: LeadValues): Promise<SubmitResult> {
  const props = analyticsProps(type, values);

  let ok = false;
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, ...values }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }

  if (ok) {
    track('compute_lead_submitted', props);
    return 'success';
  }

  // Capture failed — record the funnel drop and hand the lead to email so it
  // is never lost, then report the fallback to the form for its UI.
  track('compute_lead_fallback', props);
  if (typeof window !== 'undefined') {
    window.location.href = buildMailtoUrl(type, values);
  }
  return 'fallback';
}
