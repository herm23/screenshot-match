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

- Keep shared shopping data contracts in `src/features/shopping/models.ts`, dictation in its hook, and a single reusable map renderer; both home and shopping-list views share position and nearby-result state to avoid duplicated requests.
- Run AI extraction and Google Maps data requests through authenticated TanStack server functions; browser Maps is rendering-only and server credentials remain private.
- Persist user profiles, shopping lists and bounded per-user Maps caches in Cloud with owner-scoped RLS; browser storage is limited to the explicitly requested last location with provenance, never profiles or lists.
- Keep one root auth subscriber and provider for session/profile state so login, logout and saved-list loading remain consistent across public content.
- Use a single shopping-location hook for IP estimation, explicit location choices and nearby requests; cache IP estimates in an encrypted HTTP-only session cookie and never substitute the server IP when visitor headers are absent, to preserve privacy and avoid false locations.
