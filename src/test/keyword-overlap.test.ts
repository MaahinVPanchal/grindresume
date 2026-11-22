import { describe, expect, it } from 'vitest';
import { atsChecks, keywordOverlap } from '@/lib/ats';
import { blankEntry, blankResume } from '@/lib/resume-model';

describe('ATS skill phrase boundaries', () => {
  it.each([
    ['metadata science', 'data science', 'data'],
    ['data sciences', 'data science', 'science'],
    ['metadata sciences', 'data science', 'data'],
    ['React NativeScript', 'React Native', 'native'],
  ])('does not match "%s" to the full phrase "%s"', (resume, phrase, missingWord) => {
    const overlap = keywordOverlap(resume, phrase);
    expect(overlap.found).not.toContain(phrase.toLowerCase());
    expect(overlap.missing).toContain(missingWord);
  });

  it('does not award keyword coverage for a partial-word phrase match', () => {
    const resume = blankResume();
    resume.sections = [{
      id: 'skills', heading: 'Skills', kind: 'skills',
      entries: [{ ...blankEntry(), details: 'metadata sciences' }],
    }];
    const result = atsChecks(resume, 'data science');
    expect(result.keywords.found).toEqual([]);
    expect(result.keywords.missing).toEqual(['data', 'science']);
    expect(result.checks.find(check => check.id === 'keywords')?.earned).toBe(0);
  });

  it.each([
    'data science',
    'Experienced in data science',
    'Data-Science pipelines',
    'DATA / SCIENCE',
    'data\nscience',
    '(data science)',
  ])('still matches an exact normalized phrase in "%s"', (resume) => {
    const overlap = keywordOverlap(resume, 'data science');
    expect(overlap.found).toContain('data science');
    expect(overlap.missing).toEqual([]);
  });
});
