import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { getCompanyConfig } from '@/lib/companies/resolve';
import type { AccentColor } from '@/lib/companies/types';

const SIZE = { width: 32, height: 32 };

const ACCENT_HEX: Record<AccentColor, string> = {
  cyan: '#01f4cb',
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  rose: '#f43f5e',
};

const WILDER_LOGO_PATH =
  'M 32.107 0.482 L 26.206 9.984 L 19.999 0 L 13.799 9.984 L 7.889 0.484 L 0 13.18 L 13.561 35 L 19.996 24.638 L 26.438 35 L 40 13.181 Z M 13.563 30.328 L 2.906 13.181 L 7.887 5.155 L 18.546 22.303 L 13.559 30.328 Z M 37.098 13.181 L 26.44 30.331 L 21.449 22.305 L 32.109 5.155 L 37.098 13.18 Z M 20 19.967 L 15.25 12.321 L 19.998 4.675 L 24.751 12.321 L 19.998 19.967 Z';

export function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('company') ?? req.headers.get('x-company');
  const company = getCompanyConfig(key);
  const accent = ACCENT_HEX[company.accent];
  const initial = company.wordmark.charAt(0).toUpperCase() || 'C';

  if (company.key === 'wilderworld') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            borderRadius: 6,
          }}
        >
          <svg width={22} height={19} viewBox="0 0 40 35" fill="none">
            <path d={WILDER_LOGO_PATH} fill="#FF6434" />
          </svg>
        </div>
      ),
      { ...SIZE },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            lineHeight: 1,
            marginTop: -1,
          }}
        >
          <span
            style={{
              color: accent,
              fontSize: 20,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            /
          </span>
          <span
            style={{
              color: '#fff',
              fontSize: 22,
              fontFamily: 'monospace',
              fontWeight: 700,
              marginLeft: -2,
            }}
          >
            {initial}
          </span>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
