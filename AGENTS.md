<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use the shared Button component for application commands so keyboard focus and button behavior remain consistent.
- Keep the shared Shell responsible for the landscape and navigation so all content pages retain the same visual frame.
- Keep featured Discover companies in FeaturedCompanyCatalog with bounded pagination and shared CompanyMark, so all companies remain browsable without a long unbounded grid.
- Maintain one validated resume state for the structured editor, contextual preview edits and exports so edits cannot diverge.
- Parse PDF and DOCX in browser event handlers with real parsers; retain original files and source text privately in Cloud so extraction is recoverable.
- Store resumes and versions in owner-scoped Cloud tables; public resume entrypoints offer inline sign-in rather than redirecting during SSR.
- Keep configurable resume AI adapters server-only and require explicit approval before changing canonical resume content.
- Validate resume formatting alongside content and use the shared layout for template previews and PDF exports; translate the same settings into DOCX to prevent divergence.
- Define resume template geometry in the shared paginated layout, including independent column cursors and decoration primitives; generate real-text gallery thumbnails and PDF/Word structure from that layout rather than separate mockups.
- Keep application briefs separate from canonical resumes and cache external role research in owner-scoped Cloud rows; only explicit editor approval may change resume facts.
- Retain the legacy chat URL but use contextual company chat and the shared-shell assistant for navigation; saved roles live in owner-scoped Cloud rows.
- Publish community companies only through the confirmed-domain catalog RPC and explicit per-employer approval; keep raw contributions owner-scoped and reuse the same company cards on Discover and YC Explorer.
- Fetch company website metadata only in authenticated server functions with public-host/IP checks, revalidated redirects, bounded responses and deadlines; no private resume content is sent to websites.
