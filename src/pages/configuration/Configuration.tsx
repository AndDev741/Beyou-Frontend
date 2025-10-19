import ProfileConfiguration from "../../components/configuration/ProfileConfiguration";
import WidgetsConfiguration from "../../components/configuration/WidgetsConfiguration";
import Header from "../../components/header";

export default function Configuration() {
    return (
        <div className="lg:flex flex-col items-center lg:items-start w-full bg-background text-secondary min-h-screen">
            <Header pageName={"Configuration"} />

            <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%] px-2 lg:px-6 py-4 gap-6">
                <div className="flex flex-col lg:flex-row items-center w-full lg:w-[50%]">
                    <div className="w-full lg:pr-4">
                        <ProfileConfiguration />
                    </div>

                    {/* Divider horizontal só aparece em mobile */}
                    <div className="border-b w-full border-primary/20 mt-2 lg:hidden"></div>
                </div>

                <div className="flex flex-col lg:flex-row items-center w-full lg:w-[50%] lg:border-l lg:border-primary/30 lg:pl-4">
                    <div className="w-full">
                        <WidgetsConfiguration />
                    </div>

                    {/* Divider horizontal só aparece em mobile */}
                    <div className="border-b w-full border-primary/20 mt-2 lg:hidden"></div>
                </div>
            </div>

        </div>
    )
}
