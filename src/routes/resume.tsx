import { createFileRoute } from '@tanstack/react-router';
import { Shell } from '@/components/Shell';
import { ResumeWorkspace } from '@/components/ResumeWorkspace';
import { z } from 'zod';
export const Route = createFileRoute('/resume')({
  validateSearch: z.object({ job: z.string().max(2000).optional(), target: z.string().max(200).optional() }),
  head:()=>({meta:[{title:'Resume workspace - GrinderResume'},{name:'description',content:'Upload, edit and refine your resume with a live document preview and researched guidance.'},{property:'og:title',content:'Resume workspace - GrinderResume'},{property:'og:description',content:'Your private resume editor with live preview, researched suggestions and PDF or Word downloads.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:ResumePage,
});
function ResumePage(){const {job,target}=Route.useSearch();return <Shell><ResumeWorkspace jobURL={job || ''} target={target || ''}/></Shell>;}