import { getAdminFineTuneDataset } from './allowances.functions';

const SYSTEM = "You are GrinderResume's career copilot. Ground every claim in the candidate's resume and the provided job/company context. Never invent experience; flag gaps honestly.";
type M = { role: string; content: string };
export type ChatRow = { context: string; messages: unknown };
export type QuizRow = { company: string; role: string; questions: unknown; answers: unknown; score: number | null; feedback: unknown };

/** Nebius Data Lab upload limit per .jsonl file. */
export const NEBIUS_MAX_BYTES = 50 * 1024 ** 3;

// Builds Nebius Conversational-format lines ({"messages":[...]}) from chats and submitted quizzes.
export function buildLines(chats: ChatRow[], quizzes: QuizRow[]) {
  const lines: string[] = [];
  const push = (messages: M[]) => {
    if (messages.some((m) => m.role === "assistant" && m.content.trim())) lines.push(JSON.stringify({ messages }));
  };
  for (const c of chats) {
    const msgs = ((c.messages as M[]) ?? []).filter((m) => m?.content?.trim());
    push([{ role: "system", content: c.context ? `${SYSTEM}\n\nContext:\n${c.context}` : SYSTEM }, ...msgs]);
  }
  for (const q of quizzes) {
    const fb = (q.feedback ?? {}) as { job?: string; summary?: string; perQuestion?: { score: number; strengths: string; gaps: string }[] };
    const qs = (q.questions as { question: string }[]) ?? [];
    const ans = (q.answers as string[]) ?? [];
    const user = `Score these screening answers for ${q.role} at ${q.company}.\n\nJob:\n${fb.job ?? ""}\n\n${qs.map((x, i) => `Q${i + 1}: ${x.question}\nA: ${ans[i] ?? ""}`).join("\n\n")}`;
    const assistant = `Overall: ${q.score}/100\n${(fb.perQuestion ?? []).map((p, i) => `Q${i + 1} ${p.score}/100 — Strengths: ${p.strengths} Gaps: ${p.gaps}`).join("\n")}\n\n${fb.summary ?? ""}`;
    push([{ role: "system", content: SYSTEM }, { role: "user", content: user }, { role: "assistant", content: assistant }]);
  }
  return lines;
}

export type Issue = { line: number; message: string };
const ROLES = new Set(["system", "user", "assistant", "tool"]);
// Checks every line against the Nebius Conversational format.
export function validateLines(lines: string[]) {
  const issues: Issue[] = [];
  lines.forEach((l, i) => {
    const n = i + 1;
    let o: unknown;
    try { o = JSON.parse(l); } catch { issues.push({ line: n, message: "Not valid JSON" }); return; }
    const msgs = (o as { messages?: unknown }).messages;
    if (!Array.isArray(msgs) || !msgs.length) { issues.push({ line: n, message: 'Missing "messages" array' }); return; }
    msgs.forEach((m, j) => {
      const r = (m as M)?.role, c = (m as M)?.content;
      if (!ROLES.has(r)) issues.push({ line: n, message: `Message ${j + 1}: invalid role "${String(r)}"` });
      if (typeof c !== "string") issues.push({ line: n, message: `Message ${j + 1}: content must be text` });
    });
    if (!msgs.some((m) => (m as M).role === "assistant")) issues.push({ line: n, message: "No assistant reply to learn from" });
  });
  return issues;
}

// Splits lines into files that each stay under maxBytes.
export function splitLines(lines: string[], maxBytes = NEBIUS_MAX_BYTES) {
  const enc = new TextEncoder();
  const parts: string[][] = [[]];
  let size = 0;
  for (const l of lines) {
    const b = enc.encode(l).length + 1;
    if (size + b > maxBytes && parts.at(-1)?.length) { parts.push([]); size = 0; }
    parts.at(-1)?.push(l); size += b;
  }
  return parts.filter((p) => p.length);
}

export function downloadParts(lines: string[], base: string) {
  const parts = splitLines(lines);
  parts.forEach((p, i) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([p.join("\n") + "\n"], { type: "application/jsonl" }));
    a.download = parts.length > 1 ? `${base}-part${i + 1}.jsonl` : `${base}.jsonl`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  return parts.length;
}

export function formatBytes(n: number) {
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 2 : 0)} ${u[i]}`;
}

// The server verifies the admin role before returning any export data.
export async function exportFineTuneDataset() {
  const dataset = await getAdminFineTuneDataset() as { chats: ChatRow[]; quizzes: QuizRow[] };
  const lines = buildLines(dataset.chats ?? [], dataset.quizzes ?? []);
  if (lines.length) downloadParts(lines, `grinder-finetune-${new Date().toISOString().slice(0, 10)}`);
  return lines.length;
}
