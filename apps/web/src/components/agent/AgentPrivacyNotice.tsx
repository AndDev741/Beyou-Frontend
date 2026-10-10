import AiPrivacyNotice from "./AiPrivacyNotice";

/**
 * Says where the conversation goes, before it goes anywhere.
 *
 * The assistant hands what a person wrote to a company that is not Beyou, along with
 * the habits and goals it read to answer them. The privacy policy has said so for a
 * while; the app said nothing at all, and there was no string anywhere in
 * `packages/i18n` that so much as mentioned an external provider. Disclosure that
 * lives only in a document nobody opened is not disclosure.
 *
 * It sits on the empty state rather than above the composer: it belongs to the
 * decision to start talking, and repeating it over every message would turn into
 * furniture nobody reads.
 */
export default function AgentPrivacyNotice() {
    return (
        <AiPrivacyNotice
            messageKey="AgentPrivacyNotice"
            testId="agent-privacy-notice"
            className="mt-2 max-w-md"
        />
    );
}
