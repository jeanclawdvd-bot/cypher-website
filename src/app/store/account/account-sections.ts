const SECTIONS=['inventory','wallets','listings','purchases','sales','reviews','profile','moderation'] as const;
export type AccountSection=typeof SECTIONS[number];

/** Query values choose a view, never a destination or an account permission. */
export function accountSection(value:unknown,canModerate=false):AccountSection{
  if(typeof value!=='string'||!SECTIONS.includes(value as AccountSection))return 'inventory';
  return value==='moderation'&&!canModerate?'inventory':value as AccountSection;
}
