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
- Maintain one validated resume state for the structured editor, contextual preview edits and exports so edits cannot diverge.
- Parse PDF and DOCX in browser event handlers with real parsers; retain original files and source text privately in Cloud so extraction is recoverable.
- Store resumes and versions in owner-scoped Cloud tables; public resume entrypoints offer inline sign-in rather than redirecting during SSR.
- Keep configurable resume AI adapters server-only and require explicit approval before changing canonical resume content.
- Validate resume formatting alongside content and use the shared layout for template previews and PDF exports; translate the same settings into DOCX to prevent divergence.
- Keep application briefs separate from canonical resumes and cache external role research in owner-scoped Cloud rows; only explicit editor approval may change resume facts.
- Retain the legacy chat URL but use contextual company chat and the shared-shell assistant for navigation; saved roles live in owner-scoped Cloud rows.
