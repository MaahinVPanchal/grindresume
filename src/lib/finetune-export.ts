import { supabase } from "@/integrations/supabase/client";

const SYSTEM = "You are Grinder's career copilot. Ground every claim in the candidate's resume and the provided job/company context. Never invent experience; flag gaps honestly.";
type M = { role: string; content: string };

// Builds a Nebius Token Factory chat-format JSONL file from everything the signed-in user has stored.
export async function exportFineTuneDataset() {
  const lines: string[] = [];
  const push = (messages: M[]) => {
    if (messages.some((m) => m.role === "assistant" && m.content.trim())) lines.push(JSON.stringify({ messages }));
  };
  const { data: chats } = await supabase.from("chat_interactions").select("context,messages").order("created_at");
  for (const c of chats ?? []) {
    const msgs = (c.messages as M[]).filter((m) => m.content?.trim());
    push([{ role: "system", content: c.context ? `${SYSTEM}\n\nContext:\n${c.context}` : SYSTEM }, ...msgs]);
  }
  const { data: quizzes } = await supabase.from("role_assessments").select("company,role,questions,answers,score,feedback").not("submitted_at", "is", null);
  for (const q of quizzes ?? []) {
    const fb = q.feedback as { job?: string; summary?: string; perQuestion?: { score: number; strengths: string; gaps: string }[] };
    const qs = q.questions as { question: string }[];
    const ans = q.answers as string[];
    const user = `Score these screening answers for ${q.role} at ${q.company}.\n\nJob:\n${fb.job ?? ""}\n\n${qs.map((x, i) => `Q${i + 1}: ${x.question}\nA: ${ans[i] ?? ""}`).join("\n\n")}`;
    const assistant = `Overall: ${q.score}/100\n${(fb.perQuestion ?? []).map((p, i) => `Q${i + 1} ${p.score}/100 — Strengths: ${p.strengths} Gaps: ${p.gaps}`).join("\n")}\n\n${fb.summary ?? ""}`;
    push([{ role: "system", content: SYSTEM }, { role: "user", content: user }, { role: "assistant", content: assistant }]);
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n") + (lines.length ? "\n" : "")], { type: "application/jsonl" }));
  a.download = `grinder-finetune-${new Date().toISOString().slice(0, 10)}.jsonl`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return lines.length;
}
