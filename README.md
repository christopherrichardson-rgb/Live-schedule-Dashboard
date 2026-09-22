# Live Schedule Dashboard

## Shared schedule for display devices

The dashboard can publish its normalized schedule to one **public GitHub Gist** so `card_view.html` and `index_display.html` work on other devices without access to the operator's browser.

1. On the dashboard, use **Shared display schedule** to enter a GitHub fine-grained personal access token with **Gists: Read and write**, or a classic token with the **`gist`** scope. The dashboard stores that token only in that browser's `localStorage`; it is never included in generated links.
2. Choose **Create shared Gist** once, or paste an existing public Gist ID or canonical GitHub API URL and choose **Save shared Gist**.
3. Upload CSV files as usual. The dashboard keeps its local schedule behavior and also publishes the normalized merged rows to the configured Gist. A GitHub error is shown if publishing fails.
4. Open the DC or CDC card buttons to get a stable display link. It retains the selected team, search, and role filters and contains only `gist=<public-gist-id>`, for example:

   `card_view.html?team=DC&gist=YOUR_PUBLIC_GIST_ID`

The link has no token and no date, so the same bookmarked link receives later uploads on its normal one-minute refresh. To use the unattended display, append the same public reference:

`index_display.html?gist=YOUR_PUBLIC_GIST_ID`

Do not put a token in a URL, source file, or Gist. Removing the shared source in the dashboard removes its Gist reference and token from that browser only; it does not delete the public Gist.

If the dashboard says that the GitHub API could not be reached, GitHub did not receive the request. Confirm that `https://api.github.com` is allowed by the device network, firewall, proxy, and browser privacy extensions, then try again. GitHub's Gist API supports browser CORS requests, including authenticated create and update calls.
