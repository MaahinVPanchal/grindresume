import { describe, it, expect } from 'vitest';
import { officialWebsite, CompanyProfileSchema } from '@/lib/company-profile';
import { employersFrom } from '@/lib/community';
import { blankResume, blankEntry } from '@/lib/resume-model';
describe('Company website approval', () => {
  it('normalizes the official domain', () => { expect(officialWebsite('OpenAI.com/careers')).toBe('https://openai.com/'); });
  it('rejects private hosts, social URLs and unsupported protocols', () => {
    for (const value of ['http://company.com', 'https://127.0.0.1', 'localhost', 'https://[::1]', 'https://company.com:444', 'https://user:pass@company.com', 'linkedin.com/company/openai', 'https://company.internal']) expect(() => officialWebsite(value)).toThrow();
  });
  it('requires bounded card details', () => { expect(CompanyProfileSchema.safeParse({key:'acme',name:'Acme',website:'acme.com',oneLiner:'x'.repeat(301),industry:'',location:''}).success).toBe(false); });
  it('collects only employer names from work experience', () => {
    const resume=blankResume(); resume.sections=[{id:'work',heading:'Experience',kind:'experience',entries:[{...blankEntry(),title:'Engineer',subtitle:'Acme Ltd · London'},{...blankEntry(),subtitle:'Freelance'}]}];
    expect(employersFrom(resume)).toEqual([{key:'acme',name:'Acme Ltd'}]);
  });
});