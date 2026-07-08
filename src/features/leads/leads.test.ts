import { describe, expect, it } from 'vitest';
import {
  analyticsProps,
  buildMailtoUrl,
  CRM_FIELDS,
  summarize,
  toCrmRecord,
  validateLead,
} from './leads';

const validBuy = {
  type: 'buy',
  name: 'Jane Doe',
  email: 'jane@acme.com',
  company: 'Acme',
  gpus: '8 - 32 GPUs',
  spend: '$50k - $250k / mo',
  start: 'Immediately',
  workload: 'training a vision model',
};

const validGive = {
  type: 'give',
  name: 'Sam',
  email: 'sam@dc.io',
  company: 'DC Corp',
  hardware: 'NVIDIA H100',
  count: '32 - 128 GPUs',
  availability: 'Within a week',
  setup: 'idle nights',
};

describe('validateLead', () => {
  it('accepts a well-formed buy lead and keeps only known fields', () => {
    const result = validateLead({ ...validBuy, junk: 'ignored' });
    expect(result).toMatchObject({ ok: true, spam: false, type: 'buy' });
    if (result.ok && !result.spam) {
      expect(result.values.name).toBe('Jane Doe');
      expect(result.values).not.toHaveProperty('junk');
    }
  });

  it('accepts a well-formed give lead', () => {
    expect(validateLead(validGive)).toMatchObject({ ok: true, spam: false, type: 'give' });
  });

  it('trims whitespace off values', () => {
    const result = validateLead({ ...validBuy, name: '  Jane  ' });
    if (result.ok && !result.spam) expect(result.values.name).toBe('Jane');
  });

  it('rejects an unknown lead type', () => {
    expect(validateLead({ ...validBuy, type: 'other' })).toMatchObject({ ok: false });
  });

  it('rejects a missing required field', () => {
    const { email: _omit, ...noEmail } = validBuy;
    expect(validateLead(noEmail)).toMatchObject({ ok: false });
  });

  it('allows an omitted optional field', () => {
    const { workload: _omit, ...noWorkload } = validBuy;
    expect(validateLead(noWorkload)).toMatchObject({ ok: true });
  });

  it('rejects a malformed email', () => {
    expect(validateLead({ ...validBuy, email: 'not-an-email' })).toMatchObject({ ok: false });
  });

  it('rejects a select value outside its option list', () => {
    expect(validateLead({ ...validBuy, gpus: '9000 GPUs' })).toMatchObject({ ok: false });
  });

  it('rejects an over-long value', () => {
    expect(validateLead({ ...validBuy, name: 'x'.repeat(201) })).toMatchObject({ ok: false });
  });

  it('flags a tripped honeypot as spam without forwarding', () => {
    const result = validateLead({ ...validBuy, website: 'http://spam.example' });
    expect(result).toEqual({ ok: true, spam: true });
  });

  it('ignores an empty honeypot', () => {
    expect(validateLead({ ...validBuy, website: '' })).toMatchObject({ ok: true, spam: false });
  });

  it('rejects non-object input', () => {
    expect(validateLead(null)).toMatchObject({ ok: false });
    expect(validateLead('nope')).toMatchObject({ ok: false });
  });
});

describe('analyticsProps', () => {
  it('includes coarse select tiers but never PII', () => {
    const props = analyticsProps('buy', validBuy);
    expect(props).toMatchObject({ lead_type: 'buy', gpus: '8 - 32 GPUs', spend: '$50k - $250k / mo' });
    expect(props).not.toHaveProperty('name');
    expect(props).not.toHaveProperty('email');
    expect(props).not.toHaveProperty('workload');
  });
});

describe('toCrmRecord', () => {
  it('maps buy and give onto the same normalized columns', () => {
    const buy = toCrmRecord('buy', validateBuyValues());
    const give = toCrmRecord('give', validateGiveValues());

    // Shared scale/timing columns are filled by both, from different questions.
    expect(buy.gpuScale).toBe('8 - 32 GPUs');
    expect(give.gpuScale).toBe('32 - 128 GPUs');
    expect(buy.timing).toBe('Immediately');
    expect(give.timing).toBe('Within a week');

    // Type-specific columns: buy fills spend, give fills hardware.
    expect(buy.monthlySpend).toBe('$50k - $250k / mo');
    expect(buy.hardware).toBe('');
    expect(give.hardware).toBe('NVIDIA H100');
    expect(give.monthlySpend).toBe('');
  });

  it('always emits every CRM_FIELDS key so the shape is constant', () => {
    const buy = toCrmRecord('buy', validateBuyValues());
    const give = toCrmRecord('give', validateGiveValues());
    for (const key of CRM_FIELDS) {
      expect(buy).toHaveProperty(key);
      expect(give).toHaveProperty(key);
    }
  });
});

// Reuse the validated (trimmed, type-narrowed) values the route would forward.
function validateBuyValues() {
  const r = validateLead(validBuy);
  if (!r.ok || r.spam) throw new Error('fixture invalid');
  return r.values;
}
function validateGiveValues() {
  const r = validateLead(validGive);
  if (!r.ok || r.spam) throw new Error('fixture invalid');
  return r.values;
}

describe('summarize', () => {
  it('leads with company and the headline detail', () => {
    expect(summarize('buy', validBuy)).toBe('Compute request — Acme · 8 - 32 GPUs');
    expect(summarize('give', validGive)).toBe('Compute offer — DC Corp · NVIDIA H100');
  });
});

describe('buildMailtoUrl', () => {
  it('targets the fallback inbox and encodes the details', () => {
    const url = buildMailtoUrl('buy', validBuy);
    expect(url.startsWith('mailto:hello@zode.org?')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Work email: jane@acme.com');
    expect(decodeURIComponent(url)).toContain('training a vision model');
  });
});
