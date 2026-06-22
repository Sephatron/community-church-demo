/**
 * sveltia-cms-auth — Cloudflare Worker
 *
 * Brokers GitHub OAuth for Sveltia CMS (and Decap CMS). The CMS cannot do the
 * OAuth exchange in-browser because GitHub requires a server-side secret; this
 * tiny Worker holds the secret and completes the exchange on behalf of the editor.
 *
 * Based on the reference implementation by the Sveltia team:
 * https://github.com/sveltia/sveltia-cms-auth
 *
 * Security model
 * ──────────────
 * 1. CSRF `state`:  /auth generates a cryptographically random token, stores it
 *    in an HttpOnly Secure SameSite=Lax cookie (10-minute TTL), and includes it
 *    in the GitHub authorise redirect.  /callback rejects any response whose
 *    `state` does not match the cookie value.
 *
 * 2. Origin-pinned postMessage:  the popup never posts the access token to '*'.
 *    Instead it waits for the CMS window to send the 'authorizing:github' ping
 *    (which the Sveltia/Decap CMS always sends), captures the event's `origin`,
 *    and replies exclusively to that origin.  The contentless ping itself is
 *    acknowledged with '*' because it carries no secrets — matching the reference
 *    implementation exactly.
 *
 * 3. Scope:  only `repo` is requested.  The previous implementation also requested
 *    `user`; Sveltia CMS does not require it.
 *
 * REQUIRED secrets — set in the Cloudflare dashboard (Workers → your-worker → Settings → Variables):
 *   GITHUB_CLIENT_ID      — from your GitHub OAuth App (Settings → Developer settings → OAuth Apps)
 *   GITHUB_CLIENT_SECRET  — from the same OAuth App
 *
 * Callback URL pattern (paste this into your GitHub OAuth App's "Authorization callback URL"):
 *   https://sveltia-cms-auth.<YOUR-SUBDOMAIN>.workers.dev/callback
 *
 * Deployment:
 *   1. Install Wrangler: npm install -g wrangler
 *   2. cd sveltia-cms-auth
 *   3. wrangler login
 *   4. wrangler deploy
 *   5. Set secrets: wrangler secret put GITHUB_CLIENT_ID
 *                   wrangler secret put GITHUB_CLIENT_SECRET
 */

/** Cookie name used to persist the CSRF state token between /auth and /callback. */
const CSRF_COOKIE = 'csrf-state';

/** How long the CSRF cookie lives (seconds).  10 minutes is enough for any OAuth round-trip. */
const CSRF_TTL_SECONDS = 600;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -------------------------------------------------------------------------
    // GET /auth  →  generate CSRF state, set HttpOnly cookie, redirect to GitHub.
    // -------------------------------------------------------------------------
    if (url.pathname === '/auth') {
      // Cryptographically random 32-hex-char string — matches the reference implementation.
      const csrfToken = globalThis.crypto.randomUUID().replaceAll('-', '');

      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        scope: 'repo',
        // `state` is echoed back verbatim by GitHub in the /callback redirect.
        // We validate it there against the cookie to block CSRF.
        state: csrfToken,
      });

      return new Response(null, {
        status: 302,
        headers: {
          Location: `https://github.com/login/oauth/authorize?${params}`,
          // HttpOnly: JS cannot read this cookie — it is only visible to the Worker.
          // Secure: only sent over HTTPS (Cloudflare Workers always terminate TLS).
          // SameSite=Lax: cookie is sent on the top-level redirect from GitHub but
          //   not on cross-site sub-resource requests, limiting CSRF exposure.
          'Set-Cookie': `${CSRF_COOKIE}=${csrfToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=${CSRF_TTL_SECONDS}; Path=/`,
        },
      });
    }

    // -------------------------------------------------------------------------
    // GET /callback  →  validate CSRF state, exchange code, post token to opener.
    // -------------------------------------------------------------------------
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      // --- CSRF validation ---------------------------------------------------
      // Extract the stored token from the request's Cookie header.
      const cookieHeader = request.headers.get('Cookie') ?? '';
      const storedState = parseCookie(cookieHeader, CSRF_COOKIE);

      if (!storedState || !returnedState || storedState !== returnedState) {
        return new Response(
          postMessagePage('error', 'CSRF state mismatch — authentication rejected.', /*errorCode=*/ 'CSRF_DETECTED'),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      // --- Code presence check ----------------------------------------------
      if (!code) {
        return new Response(
          postMessagePage('error', 'Missing OAuth code from GitHub.'),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      // --- Token exchange with GitHub ----------------------------------------
      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        }
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return new Response(
          postMessagePage('error', `GitHub OAuth error: ${tokenData.error_description}`),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      // Expire the CSRF cookie immediately now that the flow is complete.
      return new Response(
        postMessagePage('success', tokenData.access_token),
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Set-Cookie': `${CSRF_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`,
          },
        }
      );
    }

    return new Response('Not found', { status: 404 });
  },
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parses a single named value from a Cookie header string.
 *
 * @param {string} cookieHeader  - The raw value of the Cookie request header.
 * @param {string} name          - The cookie name to look up.
 * @returns {string|null}        - The cookie value, or null if not present.
 */
function parseCookie(cookieHeader, name) {
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return rest.join('=') || null;
    }
  }
  return null;
}

/**
 * Returns a minimal HTML page that completes the OAuth handshake with the CMS.
 *
 * Origin-pinning strategy (matching the Sveltia reference implementation):
 *   1. The popup listens for the 'authorizing:github' ping that Sveltia/Decap CMS
 *      always fires after opening the popup.  This message carries no secret.
 *   2. The origin of that ping is captured and used as the target for the token
 *      postMessage — so the access token is ONLY sent to the window that opened
 *      the popup, and only to its exact origin.
 *   3. The initial acknowledgement ping ('authorizing:github') is posted to '*'
 *      because it is a contentless handshake — this matches the reference exactly.
 *
 * @param {string}  status    - 'success' or 'error'
 * @param {string}  content   - Access token on success; error description on failure.
 * @param {string=} errorCode - Optional machine-readable error code (e.g. 'CSRF_DETECTED').
 * @returns {string}          - The full HTML document as a string.
 */
function postMessagePage(status, content, errorCode = '') {
  // Build the payload object that Sveltia/Decap CMS expects.
  const payload =
    status === 'success'
      ? { token: content, provider: 'github' }
      : { error: content, errorCode, provider: 'github' };

  // The wire format is: "authorization:github:STATUS:JSON_PAYLOAD"
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;

  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>Authenticating…</title></head>
<body>
<script>
  (function () {
    if (!window.opener) {
      // Popup was opened without an opener — nothing to talk to.
      window.close();
      return;
    }

    // Step 1: send the contentless handshake ping to '*' so the CMS knows the
    // popup is ready.  This carries no secret, so '*' is acceptable here.
    window.opener.postMessage('authorizing:github', '*');

    // Step 2: wait for the CMS to reply with the 'authorizing:github' ping.
    // Capture the event's origin so we can restrict the token postMessage to
    // exactly that origin — never to an arbitrary third party.
    window.addEventListener('message', function handler(event) {
      if (event.data === 'authorizing:github') {
        var allowedOrigin = event.origin;

        // Remove our listener immediately — we only need to act once.
        window.removeEventListener('message', handler);

        // Step 3: post the token (or error) exclusively to the captured origin.
        window.opener.postMessage(${JSON.stringify(message)}, allowedOrigin);
        window.close();
      }
    });
  })();
<\/script>
<p>Authentication complete. You can close this window.</p>
</body>
</html>`;
}
