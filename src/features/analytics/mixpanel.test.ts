import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyAcquisitionSource } from './mixpanel';

vi.mock('mixpanel-browser', () => ({
  default: {
    init: vi.fn(),
    track: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    opt_out_tracking: vi.fn(),
  },
}));

describe('classifyAcquisitionSource', () => {
  it('prefers an explicit utm_source, lowercased', () => {
    expect(classifyAcquisitionSource('https://google.com', '?utm_source=Newsletter')).toBe(
      'newsletter'
    );
  });

  it('maps known referrer domains to a clean source', () => {
    expect(classifyAcquisitionSource('https://www.google.com/search', '')).toBe('google');
    expect(classifyAcquisitionSource('https://t.co/abc', '')).toBe('x');
    expect(classifyAcquisitionSource('https://github.com/x/y', '')).toBe('github');
  });

  it('returns direct when there is no referrer', () => {
    expect(classifyAcquisitionSource('', '')).toBe('direct');
  });

  it('keeps an unlisted referrer domain rather than bucketing it', () => {
    expect(classifyAcquisitionSource('https://blog.example.com/post', '')).toBe(
      'blog.example.com'
    );
  });

  it('falls back to direct on a malformed referrer', () => {
    expect(classifyAcquisitionSource('not a url', '')).toBe('direct');
  });
});

describe('createMixpanelProvider', () => {
  const KEY = 'NEXT_PUBLIC_MIXPANEL_TOKEN_CYPHER';
  const original = process.env[KEY];

  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
  });

  it('returns null when the site has no token (stays no-op)', async () => {
    delete process.env[KEY];
    const { createMixpanelProvider } = await import('./mixpanel');
    expect(createMixpanelProvider('cypher')).toBeNull();
  });

  it('inits the SDK and routes track/pageview through it when a token is set', async () => {
    process.env[KEY] = 'test-token';
    const { createMixpanelProvider } = await import('./mixpanel');
    const mixpanel = (await import('mixpanel-browser')).default;

    const provider = createMixpanelProvider('cypher');
    expect(provider).not.toBeNull();
    expect(mixpanel.init).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ persistence: 'localStorage', track_pageview: false })
    );
    expect(mixpanel.register).toHaveBeenCalledWith({ site: 'cypher' });

    provider?.track({ name: 'cta_click', props: { id: 'hero' } });
    expect(mixpanel.track).toHaveBeenCalledWith('cta_click', { id: 'hero' });

    provider?.pageview('/vision');
    expect(mixpanel.track).toHaveBeenCalledWith('page_view', { path: '/vision' });
  });
});
