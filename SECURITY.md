# Security Policy

## Reporting a vulnerability

If you've found a security issue in Latent, please **do not open a public
GitHub issue**. Email the details to:

- **admin@formray.io**

You should expect an acknowledgement within 72 hours and a status update
within 7 days. We aim to ship a fix within 30 days for high-severity
issues; lower-severity fixes ship on the normal release cadence.

If you'd like to encrypt your report, request a PGP key in your initial
email and we'll respond with one before you send the details.

## What counts as a security issue

In rough order of priority:

1. **Camera state corruption** — anything that could cause the app to
   write recipes to a camera in a way the user didn't authorize, or that
   could leave the camera in a state that requires factory reset
2. **Credential / data leakage** — anything that exposes API keys,
   prompts, recipe contents, or user identifiers beyond the user's
   intended audience
3. **WebUSB scope escape** — the app should never claim USB devices
   outside the Fuji vendor filter; report any path that bypasses this
4. **Supply chain** — typosquatting on `@latent/*`, dependency
   confusion, or compromised transitive dependencies
5. **AI agent injection** — paths where untrusted recipe text or image
   metadata can override the agent's system prompt or exfiltrate context

If you're unsure whether something qualifies, send it anyway. We'll
triage.

## Disclosure

Once a fix is shipped, we'll publish a brief advisory (GHSA on GitHub
plus a note in `CHANGELOG.md`) crediting the reporter unless they
request otherwise.

## Out of scope

- Vulnerabilities that require pre-installed malware on the user's
  machine
- Issues in third-party services we integrate with (Anthropic API,
  Vercel hosting) — please report those upstream
- Theoretical attacks against AGPL compliance (legal, not security)
- Self-XSS scenarios that require the user to paste attacker-controlled
  code into the browser console
