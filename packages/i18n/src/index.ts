import en from './en/translation.json';
import pt from './pt/translation.json';

export const resources = {
  en: { translation: en },
  pt: { translation: pt },
} as const;

/**
 * Where the privacy policy lives, in the reader's language.
 *
 * One place because three screens link to it — configuration, the signup form and
 * the assistant — across two apps, and a policy reachable at a URL that has quietly
 * moved is worse than one nobody linked at all.
 *
 * `language` is whatever i18next currently holds, which can be a regional tag like
 * `pt-BR` or `en-GB`, so only the prefix is read. Anything that is not Portuguese
 * gets English, matching how the app itself falls back.
 */
export function privacyPolicyUrl(language?: string): string {
  return language?.toLowerCase().startsWith('pt')
    ? 'https://beyouweb.com/pt/privacidade/'
    : 'https://beyouweb.com/privacy/';
}

/**
 * The section of the policy describing what the AI assistant sends where. Linked
 * from the assistant itself, so "an external AI provider" is one tap from being a
 * named list of them.
 */
export function aiPrivacyUrl(language?: string): string {
  return `${privacyPolicyUrl(language)}#ai`;
}
