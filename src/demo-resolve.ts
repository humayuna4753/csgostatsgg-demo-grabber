import { PrivacyPassToken, getRedemptionHeader } from 'privacy-pass-redeemer';
import axios, { AxiosError } from 'axios';
import { useTokenFromFile } from './privacy-pass';

const BATCH_SIZE = 25;

interface ResolvedMatch {
  id: number;
  demoLaunchUrl: string;
}
interface UnresolvedMatch {
  id: number;
  watchUrl: string;
}
type ResolveUrlResp = ResolvedMatch | UnresolvedMatch;

// const matchOutputs: UnresolvedMatch[] = readJSONSync('match-output.json');

const resolveWatchUrl = async (
  id: number,
  watchUrl: string,
  token: PrivacyPassToken
): Promise<ResolveUrlResp> => {
  const headers = getRedemptionHeader(token, watchUrl, 'GET');
  try {
    await axios.get(watchUrl, { headers, maxRedirects: 0 });
    return { id, watchUrl };
  } catch (err) {
    const axiosError: AxiosError = err;
    if (axiosError?.response?.status === 302) {
      const demoLaunchUrl = axiosError?.response?.headers.location;
      if (demoLaunchUrl) return { id, demoLaunchUrl };
    }
    return { id, watchUrl };
  }
};

/**
 * Resolves a large batch of Cloudflare protected redirects by abusing a parallel PrivacyPass token reuse exploit
 * @returns A list of resolved and potentially unresolved URLs in the case we ran out of tokens
 */
export const resolveDemoUrls = async (
  matchOutputs: UnresolvedMatch[],
  tokens: PrivacyPassToken[]
): Promise<ResolveUrlResp[]> => {
  let matches = matchOutputs.splice(0, BATCH_SIZE);
  const resolvedMatches: ResolvedMatch[] = [];
  do {
    const token = useTokenFromFile(); // TODO: Use passed in token
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(
      matches.map((matchOutput) => resolveWatchUrl(matchOutput.id, matchOutput.watchUrl, token))
    );
    const unresolvedMatches: UnresolvedMatch[] = [];
    results.forEach((result) => {
      if ('demoLaunchUrl' in result) resolvedMatches.push(result);
      if ('watchUrl' in result) unresolvedMatches.push(result);
    });

    const additionalMatches = matchOutputs.splice(0, BATCH_SIZE - unresolvedMatches.length);
    matches = unresolvedMatches.concat(additionalMatches);
  } while (matches.length > 0);

  return resolvedMatches; // TODO: Expect to run out of tokens and output unresolved matches as well
};
