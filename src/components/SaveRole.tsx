import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './Button';
export function SaveRole({company,title,url}:{company:string;title:string;url:string}){
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  return <div><Button disabled={busy} className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5" onClick={async()=>{setBusy(true);const {data}=await supabase.auth.getSession();if(!data.session){setStatus('signin');setBusy(false);return;}const {error}=await supabase.from('saved_roles').upsert({user_id:data.session.user.id,company,title,url},{onConflict:'user_id,url',ignoreDuplicates:true});setStatus(error?'Could not save':'Saved');setBusy(false);}}><Bookmark className="h-3.5 w-3.5"/>{status==='Saved'?'Saved':'Save role'}</Button>{status==='signin'?<Link to="/resume" className="block py-1 underline">Sign in to save</Link>:status==='Could not save'?<p role="alert">{status}</p>:null}</div>;
}