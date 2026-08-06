export function getSiteUrl() {
    const configuredUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim();
  
    if (configuredUrl) {
      return configuredUrl.replace(/\/$/, "");
    }
  
    return "http://localhost:3000";
  }