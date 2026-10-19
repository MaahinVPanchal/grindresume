import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { ChatPanel } from "@/components/ChatPanel";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat - GrinderResume" },
      { name: "description", content: "Chat with Nebius AI models about careers, companies and applications." },
      { property: "og:title", content: "Chat - GrinderResume" },
      { property: "og:description", content: "Career chat powered by Nebius models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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
