import { PrivacyPassToken } from 'privacy-pass-redeemer';

const { PRIVACY_PASS_TOKENS } = process.env;

export const addNewTokens = (existingTokens: PrivacyPassToken[]): PrivacyPassToken[] => {
  if (!PRIVACY_PASS_TOKENS) return existingTokens;
  return JSON.parse(PRIVACY_PASS_TOKENS).concat(existingTokens);
};
