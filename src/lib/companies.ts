export const FEATURED = [
  ["OpenAI", "openai.com"],
  ["Anthropic", "anthropic.com"],
  ["NVIDIA", "nvidia.com"],
  ["SpaceX", "spacex.com"],
  ["DeepSeek", "deepseek.com"],
  ["Mistral AI", "mistral.ai"],
  ["Tavily", "tavily.com"],
  ["Neuralink", "neuralink.com"],
  ["AMD", "amd.com"],
  ["Visa", "visa.com"],
  ["Mastercard", "mastercard.com"],
  ["Clay", "clay.com"],
  ["Stripe", "stripe.com"],
  ["Shopify", "shopify.com"],
  ["Notion", "notion.so"],
  ["Tesla", "tesla.com"],
  ["Airbnb", "airbnb.com"],
  ["Slack", "slack.com"],
  ["Spotify", "spotify.com"],
  ["Microsoft", "microsoft.com"],
  ["Apple", "apple.com"],
  ["Amazon", "amazon.com"],
  ["Google", "google.com"],
  ["Netflix", "netflix.com"],
  ["Meta", "meta.com"],
  ["Adobe", "adobe.com"],
  ["Figma", "figma.com"],
  ["Zoom", "zoom.us"],
  ["Salesforce", "salesforce.com"],
  ["Uber", "uber.com"],
  ["Coinbase", "coinbase.com"],
  ["Datadog", "datadoghq.com"],
  ["Snowflake", "snowflake.com"],
  ["Canva", "canva.com"],
  ["Atlassian", "atlassian.com"],
] as const;

export const logoFor = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

export const cleanDomain = (url?: string) =>
  (url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
