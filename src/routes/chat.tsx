import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { ChatPanel } from "@/components/ChatPanel";

import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/chat")({
  head: () =>
    pageHead({
      title: "Career Chat — GrinderResume",
      description: "Chat with Nebius AI models about careers, companies, and grounded job applications.",
      path: "/chat",
    }),
  component: () => (
    <Shell>
      <ChatPanel
        className="mx-auto h-[calc(100vh-8rem)] max-w-3xl"
        title="Career chat"
        suggestions={[
          "How should I approach researching a company before applying?",
          "What makes a strong resume bullet point?",
          "Help me plan a job search for product design roles.",
        ]}
      />
    </Shell>
  ),
});
