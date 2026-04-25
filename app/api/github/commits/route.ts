import { NextResponse } from 'next/server';

const GITHUB_REPO = process.env.GITHUB_REPO || 'bssngss2-design/yates-inc';
const MAX_PAGES = 10;
const PER_PAGE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FormattedCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

let cache: { commits: FormattedCommit[]; timestamp: number } | null = null;
let inflight: Promise<FormattedCommit[]> | null = null;

async function fetchAllCommits(): Promise<FormattedCommit[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const all: FormattedCommit[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=${PER_PAGE}&page=${page}`,
      { headers, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      // If we already grabbed some commits, return what we have instead of nuking everything
      if (all.length > 0) break;
      const remaining = res.headers.get('x-ratelimit-remaining');
      const reset = res.headers.get('x-ratelimit-reset');
      const hasToken = Boolean(process.env.GITHUB_TOKEN);

      let detail = '';
      if (res.status === 404) {
        detail = hasToken
          ? ` — repo "${GITHUB_REPO}" not found or token lacks access`
          : ` — repo "${GITHUB_REPO}" is private or missing. Set GITHUB_TOKEN in .env.local`;
      } else if (res.status === 401 || res.status === 403) {
        detail = remaining === '0'
          ? ` — rate limited${reset ? ` (resets ${new Date(Number(reset) * 1000).toLocaleTimeString()})` : ''}`
          : hasToken
            ? ` — token rejected (check GITHUB_TOKEN scopes)`
            : ` — auth required. Set GITHUB_TOKEN in .env.local`;
      }

      throw new Error(`GitHub API ${res.status}${detail}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const commit of data) {
      all.push({
        sha: commit.sha.substring(0, 7),
        message: (commit.commit?.message ?? '').split('\n')[0],
        author: commit.commit?.author?.name ?? 'unknown',
        date: commit.commit?.author?.date ?? new Date().toISOString(),
        url: commit.html_url,
      });
    }

    if (data.length < PER_PAGE) break;
  }

  return all;
}

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(
      { commits: cache.commits, cached: true, age: now - cache.timestamp },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  }

  try {
    if (!inflight) {
      inflight = fetchAllCommits().finally(() => {
        inflight = null;
      });
    }
    const commits = await inflight;
    cache = { commits, timestamp: now };
    return NextResponse.json(
      { commits, cached: false },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (err: any) {
    // Fall back to stale cache if available
    if (cache) {
      return NextResponse.json(
        {
          commits: cache.commits,
          cached: true,
          stale: true,
          age: now - cache.timestamp,
          error: err?.message ?? 'unknown error',
        },
        { headers: { 'Cache-Control': 'public, max-age=30' } }
      );
    }
    return NextResponse.json(
      { error: err?.message ?? 'Failed to fetch commits' },
      { status: 502 }
    );
  }
}
