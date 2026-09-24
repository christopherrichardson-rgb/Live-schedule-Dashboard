# Live Schedule Dashboard

## Shared schedule backend for display devices

The dashboard can publish its normalized schedule to the shared schedule backend so `card_view.html` and `index_display.html` work on other devices without access to the operator's browser.

1. On the dashboard, use **Shared schedule backend** to save the HTTPS API base URL, then sign in with the backend admin username and password. The dashboard stores the base URL and returned JWT only in that browser's `localStorage`; it never stores the password or includes credentials in generated links.
2. Upload CSV files as usual. The dashboard keeps its local schedule behavior and also atomically publishes the normalized merged rows to `PUT {baseUrl}/api/admin/schedule` with the saved JWT. A backend error is shown if publishing fails.
3. Open the DC or CDC card buttons to get a stable display link. It retains the selected team, search, and role filters and contains only `api=<public-base-url>`, for example:

   `card_view.html?team=DC&api=https%3A%2F%2Fschedule.example.com`

The link has no token and no date, so the same bookmarked link receives later uploads from public `GET {baseUrl}/api/schedule` on its normal one-minute refresh. To use the unattended display, append the same public API base:

`index_display.html?api=https%3A%2F%2Fschedule.example.com`

The backend API response is `{ version, updated_at, rows }`. The display pages use the backend first, then an optional public Gist fallback, then `schedule.json`. They do not send authentication headers or credentials.

The backend must allow the GitHub Pages origin and the `Authorization` and `Content-Type` request headers through CORS. Removing the backend connection in the dashboard removes its API base and admin session from that browser only.

## Shared safety badges

Uploading a safety workbook still saves the normalized first-aid, fire-marshal, and working-at-height mappings in the operator browser. When the shared backend is configured and the operator is signed in, the dashboard also atomically publishes `{ badges }` to `PUT {baseUrl}/api/admin/safety-badges`; publish success or failure is shown without discarding the local result. **Clear safety badges** publishes the corresponding empty mapping when signed in and explicitly warns if that shared clear fails.

Card and unattended display links with `api=<public-base-url>` load `GET {baseUrl}/api/safety-badges` alongside the public schedule API and render the same three safety badges. Badge reads are public and never include an admin token; if the badge endpoint is unavailable, each page retains its local/static behavior.

## Optional public Gist fallback

If the backend is not configured, the existing **Public Gist fallback** can publish the normalized schedule to a public GitHub Gist. It requires a fine-grained personal access token with **Gists: Read and write**, or a classic token with the **`gist`** scope; that token remains only in the operator's browser. Display links may include `gist=<public-gist-id>` as a credential-free fallback.
