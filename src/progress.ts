import type { PrivacyPassToken } from 'privacy-pass-redeemer';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import AdmZip from 'adm-zip';
import L from './logger';

export interface GrabberProgress {
  goalId: number;
  currentId: number;
  remainingTokens: PrivacyPassToken[];
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'missing').split('/');

const githubToken = process.env.GITHUB_TOKEN || 'missing';

const octokit = new Octokit({ auth: githubToken });

export const getLatestProgress = async (): Promise<GrabberProgress | null> => {
  // Algorithm from: https://stackoverflow.com/a/65163515/5037239
  const runs = await octokit.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: 'run.yml',
    per_page: 1,
  });
  const latestRun = runs.data.workflow_runs[0];
  if (!latestRun) {
    L.warn('No latest runs found');
    return null;
  }
  const latestRunArtifacts = await octokit.actions.listWorkflowRunArtifacts({
    owner,
    repo,
    run_id: latestRun.id,
  });
  const latestArtifactMetadata = latestRunArtifacts.data.artifacts[0];
  if (!latestArtifactMetadata) {
    L.warn('Latest run did not have an artifact');
    return null;
  }
  const downloadArtifactResp = await octokit.actions.downloadArtifact({
    owner,
    repo,
    artifact_id: latestArtifactMetadata.id,
    archive_format: 'zip',
  });
  const downloadUrl = downloadArtifactResp.headers.location;
  if (!downloadUrl) throw new Error('Did not receive a download URL');
  const downloadResp = await axios.get<ArrayBuffer>(downloadUrl, { responseType: 'arraybuffer' });
  const artifactZip = Buffer.from(downloadResp.data);
  const zipArchive = new AdmZip(artifactZip);
  const progressEntry = zipArchive.getEntry('progress.json');
  if (!progressEntry) {
    L.warn('Could not find progress.json in archive');
    return null;
  }
  const progress: GrabberProgress = JSON.parse(progressEntry.getData().toString());
  return progress;
};
