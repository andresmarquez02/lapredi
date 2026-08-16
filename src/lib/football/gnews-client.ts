// News source. Free tier: 100 requests/day, ~12h data delay, non-commercial
// use only - fits this project's single-user personal-use scope. Confirmed
// live 2026-08-16.

const BASE_URL = "https://gnews.io/api/v4";

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  sourceName: string;
}

export class GNewsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GNewsApiError";
  }
}

function getApiKey(): string {
  const key = process.env.GNEWS_API_KEY;
  if (!key) throw new Error("GNEWS_API_KEY is not set");
  return key;
}

/** Recent news articles mentioning a team, newest first. */
export async function fetchTeamNews(teamName: string, max = 5): Promise<NewsArticle[]> {
  const url = new URL(BASE_URL + "/search");
  url.searchParams.set("q", `"${teamName}"`);
  url.searchParams.set("lang", "en");
  url.searchParams.set("max", String(max));
  url.searchParams.set("apikey", getApiKey());

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GNewsApiError(`GNews search failed (${response.status}): ${body}`, response.status);
  }

  const body = (await response.json()) as {
    articles: Array<{
      title: string;
      description: string | null;
      url: string;
      image: string | null;
      publishedAt: string;
      source: { name: string };
    }>;
  };

  return body.articles.map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    image: a.image ?? null,
    publishedAt: a.publishedAt,
    sourceName: a.source.name,
  }));
}
