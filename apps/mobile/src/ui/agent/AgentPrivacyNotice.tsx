import AiPrivacyNotice from './AiPrivacyNotice';

/**
 * Says where the conversation goes, before it goes anywhere.
 *
 * The assistant hands what a person wrote to a company that is not Beyou, along with the
 * habits and goals it read to answer them. The privacy policy has said so for a while;
 * the app said nothing, and no string in `packages/i18n` so much as mentioned an external
 * provider. Disclosure nobody can reach from inside the app is not disclosure.
 *
 * On the empty state rather than above the composer: it belongs to the decision to
 * start talking, and over every message it would become furniture.
 */
export default function AgentPrivacyNotice() {
  return <AiPrivacyNotice messageKey="AgentPrivacyNotice" testID="agent-privacy-notice" className="mt-2 max-w-[320px]" />;
}
