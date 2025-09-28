import ProfileConfiguration from "../../components/configuration/ProfileConfiguration";
import Header from "../../components/header";

export default function Configuration(){
    return(
        <div className="lg:flex flex-col items-center lg:items-start w-full">
            <Header pageName={"Configuration"} />

            <div className="flex flex-col lg:flex-row items-center w-full lg:w-[50%]">
                {/* Wrapper com borda direita apenas em lg */}
                <div className="w-full lg:border-r-[1px] lg:border-blueMain lg:pr-4">
                    <ProfileConfiguration />
                </div>

                {/* Divider horizontal só aparece em mobile */}
                <div className="border-b-[1px] w-[100%] border-blueMain mt-2 lg:hidden"></div>
            </div>
        </div>
    )
}