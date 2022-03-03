import 'dotenv/config';
import { CSGOStatsGGScraper } from 'csgostatsgg-scraper';
import { writeJSONSync } from 'fs-extra';
import asyncBatch from 'async-batch';
import { addNewTokens } from './privacy-pass';
import { getLatestProgress, GrabberProgress } from './progress';
import L from './logger';
import { range } from './util';

export interface MatchOutput {
  id: number;
  watchUrl: string;
}

const { START_ID_OVERRIDE, GOAL_ID_OVERRIDE, CONCURRENCY } = process.env;

async function main() {
  const previousProgress = await getLatestProgress();
  let progress: GrabberProgress;
  if (previousProgress) {
    progress = {
      ...previousProgress,
      remainingTokens: addNewTokens(previousProgress.remainingTokens),
    };
  } else {
    progress = {
      currentId: 0,
      goalId: 0,
      remainingTokens: addNewTokens([]),
    };
  }
  const startIdOverride: number | undefined = START_ID_OVERRIDE
    ? parseInt(START_ID_OVERRIDE, 10)
    : undefined;
  const goalIdOverride: number | undefined = GOAL_ID_OVERRIDE
    ? parseInt(GOAL_ID_OVERRIDE, 10)
    : undefined;
  progress.currentId = startIdOverride || progress.currentId;
  writeJSONSync('progress.json', progress);

  const concurrency: number = CONCURRENCY ? parseInt(CONCURRENCY, 10) : 5;
  try {
    const scraper = new CSGOStatsGGScraper({
      handlerOverrides: {
        maxConcurrency: concurrency,
      },
    });
    const latestMatches = await scraper.listLatestMatches();
    const [latestMatch] = latestMatches;
    progress.goalId = goalIdOverride || latestMatch.matchId;

    L.info(`Checking matches from ${progress.currentId} to ${progress.goalId}`);

    const desiredMatchIds = range(progress.currentId, progress.goalId);

    const parseMatch = async (id: number): Promise<MatchOutput | null> => {
      progress.currentId = id;
      try {
        const matchSummary = await scraper.getMatch(id);
        L.debug(`Progress: ${progress.goalId - id}/${desiredMatchIds.length}`);
        L.trace({ id, matchSummary }, 'Finished scraping match');
        if (matchSummary.hasBannedPlayer && matchSummary.watchUrl) {
          L.info({ id }, 'found demo with banned player');
          return {
            id,
            watchUrl: matchSummary.watchUrl,
          };
        }
        return null;
      } catch (err) {
        L.warn({ id, err });
        return null;
      }
    };

    const rawScrapeResults = await asyncBatch(desiredMatchIds, parseMatch, concurrency);
    L.info(`Finished scraping ${rawScrapeResults.length} matches`);

    const prunedScrapeResults = rawScrapeResults.filter(
      (elem): elem is MatchOutput => elem !== null
    );
    writeJSONSync('match-output.json', prunedScrapeResults);
    await scraper.close();
  } catch (err) {
    L.error(err);
    writeJSONSync('progress.json', progress);
  }
}

main();
