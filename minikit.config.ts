const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
   "header": "eyJmaWQiOjg1ODkzNiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDRDMWQ1Y0ZmOTg1MjM2NjRkMjI4ZjEyYmEwQWVEQjIxQTA0Qzc5MDYifQ",
    "payload": "eyJkb21haW4iOiJuZnRodWItdGF1LnZlcmNlbC5hcHAifQ",
    "signature": "e+pKgjecmW3ALHtl/VKtR81CIFKb1U8oayGgVpXLGA1NP2SAtz9xTXoOoPBqTbo6vo9LlCWzVaUPkJPKcZ9hexs="
  },
  miniapp: {
    version: "1",
    name: "nft viewer", 
    subtitle: "check your nfts ", 
    description: "utility",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["marketing", "ads", "quickstart", "waitlist"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
  "baseBuilder": {
    "ownerAddress": "0x192a5cbBfb6Ab58dCf4Fe28FB11ADE240c4c8aFa"
  }
} as const;

