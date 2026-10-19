import { createFileRoute } from '@tanstack/react-router';
import { Shell } from '@/components/Shell';
import { ResumeWorkspace } from '@/components/ResumeWorkspace';
import { z } from 'zod';
import { pageHead } from '@/lib/seo';
export const Route = createFileRoute('/resume')({
  validateSearch: z.object({ job: z.string().max(2000).optional(), target: z.string().max(200).optional() }),
  head: () =>
    pageHead({
      title: 'Resume Workspace — GrinderResume',
      description: 'Upload, edit and refine your resume with a live document preview, researched suggestions and PDF or Word downloads.',
      path: '/resume',
    }),
  component: ResumePage,
});
function ResumePage(){const {job,target}=Route.useSearch();return <Shell><ResumeWorkspace jobURL={job || ''} target={target || ''}/></Shell>;}