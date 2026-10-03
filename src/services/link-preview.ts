export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string | null;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace('www.', '');
    return {
      title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Resource`,
      description: `Explore linked content on ${domain}`,
      image: `https://picsum.photos/seed/${encodeURIComponent(domain)}/400/250`,
    };
  } catch (e) {
    return {
      title: url,
      description: 'External link',
      image: null,
    };
  }
}
