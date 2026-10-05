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

- AI effects and their prompts live in the `effects` table and are resolved server-side in `/api/edit-image`; never hardcode effect prompts in the frontend (spec requires admin-controlled content).
- Image edits stream through the `/api/edit-image` server route, which verifies the user's bearer token itself (server routes bypass route guards).
