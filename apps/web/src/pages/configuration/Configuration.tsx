import { useTranslation } from "react-i18next";
import ConstanceConfiguration from "../../components/configuration/ConstanceConfiguration";
import LanguageSelector from "../../components/configuration/LanguageSelector";
import ProfileConfiguration from "../../components/configuration/ProfileConfiguration";
import RoutineSettings from "../../components/configuration/RoutineSettings";
import ThemeSelector from "../../components/configuration/ThemeSelector";
import TutorialConfiguration from "../../components/configuration/TutorialConfiguration";
import WidgetsConfiguration from "../../components/configuration/WidgetsConfiguration";
import ConfigSection from "../../components/configuration/ConfigSection";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import { useConfigTutorial } from "../../components/tutorial/hooks/useConfigTutorial";
import { CgProfile } from "react-icons/cg";
import { IoColorPaletteOutline } from "react-icons/io5";
import { FiSettings, FiGrid } from "react-icons/fi";

export default function Configuration() {
    useAuthGuard();
    useConfigTutorial();
    const { t } = useTranslation();

    return (
        <div className="lg:flex flex-col items-center lg:items-start w-full bg-background text-secondary min-h-screen">
            <Header pageName={"Configuration"} showLogout={true} />

            <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%] px-2 lg:px-6 gap-6">
                <div className="flex flex-col items-center w-full lg:w-[50%] lg:border-r lg:border-primary">
                    <div className="w-full lg:pr-4">
                        <ConfigSection
                            icon={<CgProfile />}
                            title={t("ConfigSectionProfile")}
                            description={t("ConfigSectionProfileDesc")}
                        >
                            <ProfileConfiguration />
                        </ConfigSection>
                    </div>

                    <div className="border-b w-full border-primary mt-2"></div>

                    <div className="w-full lg:pr-4">
                        <ConfigSection
                            icon={<IoColorPaletteOutline />}
                            title={t("ConfigSectionAppearance")}
                            description={t("ConfigSectionAppearanceDesc")}
                        >
                            <ThemeSelector />
                        </ConfigSection>
                    </div>

                    <div className="border-b w-full border-primary mt-2"></div>

                    <div className="w-full lg:pr-4">
                        <ConfigSection
                            icon={<FiSettings />}
                            title={t("ConfigSectionPreferences")}
                            description={t("ConfigSectionPreferencesDesc")}
                        >
                            <LanguageSelector />
                            <ConstanceConfiguration />
                            <RoutineSettings />
                            <TutorialConfiguration />
                        </ConfigSection>
                    </div>

                    {/* Horizontal divider for mobile screens */}
                    <div className="border-b w-full border-primary mt-2 lg:hidden"></div>
                </div>

                <div className="flex flex-col lg:flex-row items-center w-full lg:w-[50%] h-full lg:pl-4">
                    <div className="w-full">
                        <ConfigSection
                            icon={<FiGrid />}
                            title={t("ConfigSectionDashboard")}
                            description={t("ConfigSectionDashboardDesc")}
                        >
                            <WidgetsConfiguration />
                        </ConfigSection>
                    </div>

                    {/* Divider horizontal só aparece em mobile */}
                    <div className="border-b w-full border-primary mt-2 lg:hidden"></div>
                </div>
            </div>

        </div>
    );
}
