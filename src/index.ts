import 'dotenv/config';
import { CSGOStatsGGScraper } from 'csgostatsgg-scraper';
import { writeJSONSync } from 'fs-extra';
import { addNewTokens } from './privacy-pass';
import { getLatestProgress, GrabberProgress } from './progress';
import L from './logger';

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
  writeJSONSync('progress.json', progress);
  try {
    const scraper = new CSGOStatsGGScraper();
  } catch (err) {
    L.error(err);
    writeJSONSync('progress.json', progress);
  }
}

main();
