import { z } from 'zod';

export function officialWebsite(input: string) {
  const url = new URL(input.includes('://') ? input.trim() : `https://${input.trim()}`);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port || host.length > 240 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) || /(?:^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)) throw new Error('Enter the official public website, such as company.com.');
  if (/(^|\.)(linkedin\.com|facebook\.com|instagram\.com)$/.test(host)) throw new Error('Use the company’s own website, not a social profile.');
  return `https://${host}/`;
}

export const CompanyProfileSchema = z.object({
  key: z.string().min(1).max(100), name: z.string().trim().min(2).max(80),
  website: z.string().transform(officialWebsite),
  oneLiner: z.string().trim().max(300), industry: z.string().trim().max(80), location: z.string().trim().max(100),
});
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;
export type CommunityCompany = { name: string; people: number; website: string; logo_url: string; one_liner: string; industry: string; location: string };
export const companyLogo = (website: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(website).hostname)}&sz=128`;