import { readJSONSync, writeJSONSync } from 'fs-extra';
import { PrivacyPassToken } from 'privacy-pass-redeemer';

const { PRIVACY_PASS_TOKENS } = process.env;

export const addNewTokens = (existingTokens: PrivacyPassToken[]): PrivacyPassToken[] => {
  if (!PRIVACY_PASS_TOKENS) return existingTokens;
  const tokenStringList: string[] = JSON.parse(PRIVACY_PASS_TOKENS);
  const fullyParsedtokens = tokenStringList.map(
    (strToken): PrivacyPassToken => JSON.parse(strToken)
  );
  return fullyParsedtokens.concat(existingTokens);
};

export const useTokenFromFile = (): PrivacyPassToken => {
  const tokenStringList: string[] = readJSONSync('tokens.json');
  const poppedToken = tokenStringList.pop();
  writeJSONSync('tokens.json', tokenStringList, { spaces: 2 });
  if (!poppedToken) throw new Error('Could not pop token');
  const fullyParsedToken = JSON.parse(poppedToken);
  return fullyParsedToken;
};
