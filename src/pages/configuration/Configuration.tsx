import ProfileConfiguration from "../../components/configuration/ProfileConfiguration";
import WidgetsConfiguration from "../../components/configuration/WidgetsConfiguration";
import Header from "../../components/header";

export default function Configuration() {
    return (
        <div className="lg:flex flex-col items-center lg:items-start w-full">
            <Header pageName={"Configuration"} />

            <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%]">
                <div className="flex flex-col lg:flex-row items-center w-full lg:w-[50%]">
                    <div className="w-full lg:border-blueMain lg:pr-4">
                        <ProfileConfiguration />
                    </div>

                    {/* Divider horizontal só aparece em mobile */}
                    <div className="border-b-[1px] w-[100%] border-blueMain mt-2 lg:hidden"></div>
                </div>

                <div className="flex flex-col lg:flex-row items-center w-full lg:w-[50%] lg:border-l-[1px] border-blueMain">
                    <div className="w-full lg:border-blueMain lg:pr-4">
                        <WidgetsConfiguration />
                    </div>

                    {/* Divider horizontal só aparece em mobile */}
                    <div className="border-b-[1px] w-[100%] border-blueMain mt-2 lg:hidden"></div>
                </div>
            </div>

        </div>
    )
}