import { useTranslation } from "react-i18next";
import { Brain, RefreshCw } from "lucide-react";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { SECOND_BRAIN_VERDICT } from "@beyou/state";
import type { SecondBrainInsight } from "@beyou/types/secondBrain/secondBrain";
import Button from "../Button";
import AiPrivacyNotice from "../agent/AiPrivacyNotice";
import Chip from "../../ui/Chip";
import IconTile from "../../ui/IconTile";
import Block, { Shimmer } from "./Block";

type OverviewBlockProps = {
    insight: SecondBrainInsight;
    aiAvailable: boolean;
    writing: boolean;
    error: ApiErrorPayload | null;
    onWrite: () => void;
};

/**
 * The lead of the page: a few sentences the model wrote about how things are going.
 *
 * It is prose and reads as prose, set larger than anything else here. The numbers it draws on
 * sit in the blocks below, which is why this one carries none.
 */
export default function OverviewBlock({ insight, aiAvailable, writing, error, onWrite }: OverviewBlockProps) {
    const { t, i18n } = useTranslation();

    // A verdict this build does not know is left out instead of drawn as a blank label.
    const verdict = insight.text && insight.verdict ? SECOND_BRAIN_VERDICT[insight.verdict] : undefined;

    const writtenAt = insight.generatedAt
        ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(insight.generatedAt),
          )
        : null;

    return (
        <Block
            title={t("SecondBrainOverviewTitle")}
            testId="second-brain-overview"
            action={
                <div className="flex items-center gap-2">
                    {/* The verdict is the answer the page exists for, so it sits where the eye
                        lands first. Hidden while a new one is being written: the old label
                        would be read as today's. */}
                    {verdict && !writing && (
                        <Chip variant={verdict.tone} className="h-7 px-3 text-[13px]">
                            <span data-testid="second-brain-verdict">{t(verdict.label)}</span>
                        </Chip>
                    )}
                    <IconTile size={32}>
                        <Brain size={17} aria-hidden="true" />
                    </IconTile>
                </div>
            }
        >
            {writing ? (
                <div data-testid="second-brain-overview-writing">
                    <Shimmer
                        label={t("SecondBrainOverviewWriting")}
                        lines={["w-full", "w-[94%]", "w-[88%]", "w-3/5"]}
                    />
                    <p className="mt-4 text-[13px] text-text-3">{t("SecondBrainOverviewWriting")}</p>
                </div>
            ) : insight.text ? (
                <>
                    <p className="max-w-[64ch] whitespace-pre-line text-[17px] leading-[1.65] text-text">
                        {insight.text}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] text-text-3">
                            {writtenAt && t("SecondBrainOverviewUpdated", { when: writtenAt })}
                            {insight.stale && <span className="ml-2 text-text-2">{t("SecondBrainOverviewStale")}</span>}
                        </p>
                        {aiAvailable && (
                            <Button
                                text={t("SecondBrainOverviewRefresh")}
                                mode="ghost"
                                size="small"
                                icon={<RefreshCw size={14} />}
                                onClick={onWrite}
                                testId="second-brain-overview-refresh"
                            />
                        )}
                    </div>
                </>
            ) : aiAvailable ? (
                <div className="flex flex-col items-start gap-4">
                    <p className="max-w-[56ch] text-[15px] leading-relaxed text-text-2">
                        {t("SecondBrainOverviewEmpty")}
                    </p>
                    <Button
                        text={t("SecondBrainOverviewWrite")}
                        mode="primary"
                        size="auto"
                        onClick={onWrite}
                        testId="second-brain-overview-write"
                    />
                    {/* The first overview is asked for, never written unprompted: this button
                        is where the person agrees to their data going to the provider, so the
                        notice sits beside it. The server sends nothing from this page to the
                        model until an overview exists. */}
                    <AiPrivacyNotice messageKey="SecondBrainPrivacyNotice" testId="second-brain-privacy-notice" />
                </div>
            ) : (
                <p className="max-w-[56ch] text-[15px] leading-relaxed text-text-2">{t("SecondBrainAiOff")}</p>
            )}

            {error && !writing && (
                <p role="alert" className="mt-4 text-sm text-danger">
                    {getFriendlyErrorMessage(t, error)}
                </p>
            )}
        </Block>
    );
}
