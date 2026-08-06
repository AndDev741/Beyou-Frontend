import { useTranslation } from "react-i18next";
import ConstanceConfiguration from "../../components/configuration/ConstanceConfiguration";
import LanguageSelector from "../../components/configuration/LanguageSelector";
import ProfileConfiguration from "../../components/configuration/ProfileConfiguration";
import RoutineSettings from "../../components/configuration/RoutineSettings";
import ThemeSelector from "../../components/configuration/ThemeSelector";
import TutorialConfiguration from "../../components/configuration/TutorialConfiguration";
import WidgetsConfiguration from "../../components/configuration/WidgetsConfiguration";
import ConfigSection from "../../components/configuration/ConfigSection";
import useAuthGuard from "../../components/useAuthGuard";
import SpotlightTutorial from "../../components/tutorial/SpotlightTutorial";
import { useConfigTutorial } from "../../components/tutorial/hooks/useConfigTutorial";
import PageHeader from "../../ui/PageHeader";

export default function Configuration() {
    useAuthGuard();
    const { configSteps, configStep, setConfigStep, showConfigSpotlight, onComplete, onSkip } = useConfigTutorial();
    const { t } = useTranslation();

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

            {/* Duas colunas no desktop, uma no telefone. Perfil e preferências
                de um lado; aparência e widgets do outro, como no mockup. */}
            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <div className="flex w-full flex-col gap-4">
                    <ConfigSection title={t("ConfigSectionProfile")} tutorialId="config-profile">
                        <ProfileConfiguration />
                    </ConfigSection>

                    <ConfigSection title={t("ConfigSectionPreferences")} tutorialId="config-preferences">
                        <div className="flex flex-col gap-5">
                            <LanguageSelector />
                            <ConstanceConfiguration />
                            <RoutineSettings />
                            <TutorialConfiguration />
                        </div>
                    </ConfigSection>
                </div>

                <div className="flex w-full flex-col gap-4">
                    <ConfigSection title={t("ConfigSectionAppearance")} tutorialId="config-appearance">
                        <ThemeSelector />
                    </ConfigSection>

                    <ConfigSection title={t("ConfigSectionWidgets")} tutorialId="config-dashboard">
                        <WidgetsConfiguration />
                    </ConfigSection>
                </div>
            </div>
        </div>
    );
}
