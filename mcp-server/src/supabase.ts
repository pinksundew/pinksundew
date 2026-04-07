const apiKey = process.env.AGENTPLANNER_API_KEY!;
const baseUrl = process.env.AGENTPLANNER_URL!;

if (!apiKey || !baseUrl) {
  console.error("Missing AGENTPLANNER_API_KEY or AGENTPLANNER_URL environment variables.");
  process.exit(1);
}

export async function bridgeFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/bridge${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bridge API error ${res.status}: ${body}`);
  }

  return res.json();
}
