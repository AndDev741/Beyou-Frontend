import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Palette, Settings, LayoutGrid } from "lucide-react";
import ConstanceConfiguration from "../../components/configuration/ConstanceConfiguration";
import LanguageSelector from "../../components/configuration/LanguageSelector";
import ProfileConfiguration from "../../components/configuration/ProfileConfiguration";
import RoutineSettings from "../../components/configuration/RoutineSettings";
import ThemeSelector from "../../components/configuration/ThemeSelector";
import TutorialConfiguration from "../../components/configuration/TutorialConfiguration";
import WidgetsConfiguration from "../../components/configuration/WidgetsConfiguration";
import ConfigSection from "../../components/configuration/ConfigSection";
import AccountConfiguration from "../../components/configuration/AccountConfiguration";
import DangerZone from "../../components/configuration/DangerZone";
import PrivacyPolicyLink from "../../components/configuration/PrivacyPolicyLink";
import useAuthGuard from "../../components/useAuthGuard";
import SpotlightTutorial from "../../components/tutorial/SpotlightTutorial";
import { useConfigTutorial } from "../../components/tutorial/hooks/useConfigTutorial";
import PageHeader from "../../ui/PageHeader";
import { RootState } from "@beyou/state/rootReducer";
import { resolvePhotoUrl } from "../../services/photoUrl";

export default function Configuration() {
    useAuthGuard();
    const { configSteps, configStep, setConfigStep, showConfigSpotlight, onComplete, onSkip } = useConfigTutorial();
    const { t } = useTranslation();

    const name = useSelector((state: RootState) => state.perfil.username);
    const photo = useSelector((state: RootState) => state.perfil.photo);
    const level = useSelector((state: RootState) => state.perfil.level);
    const xp = useSelector((state: RootState) => state.perfil.xp);
    const nextLevelXp = useSelector((state: RootState) => state.perfil.nextLevelXp);
    const currentPhoto = resolvePhotoUrl(photo);

    /** On a phone the profile is the identity: avatar, name and the level at a glance. */
    const profileHeader = (
        <span className="flex items-center gap-3">
            {currentPhoto ? (
                <img
                    src={currentPhoto}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                />
            ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent">
                    {(name || "?").charAt(0).toUpperCase()}
                </span>
            )}
            <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-text">{name}</span>
                <span className="block font-mono text-[11px] text-text-3">
                    {t("Level").toLowerCase()} {level} · {xp}/{nextLevelXp} XP
                </span>
            </span>
        </span>
    );

    return (
        <div className="min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-6rem)] w-full bg-bg px-4 py-6 text-text lg:px-7">
            <PageHeader title={t("Configuration")} subtitle={t("ConfigSubtitle")} />
            {showConfigSpotlight && (
                <SpotlightTutorial
                    steps={configSteps}
                    isActive={showConfigSpotlight}
                    currentStep={configStep}
                    onStepChange={setConfigStep}
                    onComplete={onComplete}
                    onSkip={onSkip}
                />
            )}

            {/* Two columns on desktop (profile, widgets and log out on the left;
                appearance, preferences and the danger zone on the right). On a phone
                `contents` undoes the columns and the order classes take over: profile,
                appearance, preferences, danger zone, widgets, log out. */}
            <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
                <div className="contents lg:flex lg:flex-col lg:gap-4">
                    <ConfigSection
                        title={t("ConfigSectionProfile")}
                        mobileHeader={profileHeader}
                        tutorialId="config-profile"
                        className="order-1"
                    >
                        <ProfileConfiguration />
                    </ConfigSection>

                    <ConfigSection
                        title={t("ConfigSectionWidgets")}
                        icon={<LayoutGrid size={16} aria-hidden="true" />}
                        tutorialId="config-dashboard"
                        className="order-5"
                    >
                        <WidgetsConfiguration />
                    </ConfigSection>

                    <AccountConfiguration className="order-6" />
                </div>

                <div className="contents lg:flex lg:flex-col lg:gap-4">
                    <ConfigSection
                        title={t("ConfigSectionAppearance")}
                        icon={<Palette size={16} aria-hidden="true" />}
                        tutorialId="config-appearance"
                        className="order-2"
                    >
                        <ThemeSelector />
                    </ConfigSection>

                    <ConfigSection
                        title={t("ConfigSectionPreferences")}
                        icon={<Settings size={16} aria-hidden="true" />}
                        tutorialId="config-preferences"
                        className="order-3"
                    >
                        <div className="flex flex-col gap-5">
                            <LanguageSelector />
                            <ConstanceConfiguration />
                            <RoutineSettings />
                            <TutorialConfiguration />
                            <PrivacyPolicyLink />
                        </div>
                    </ConfigSection>

                    <DangerZone className="order-4" />
                </div>
            </div>
        </div>
    );
}
