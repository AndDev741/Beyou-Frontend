import ProfileConfiguration from "../../components/configuration/ProfileConfiguration";
import Header from "../../components/header";

export default function Configuration(){
    return(
        <div className="lg:flex flex-col items-center w-full">
            <Header pageName={"Configuration"} />

            <ProfileConfiguration />

            <div className="border-b-[1px] w-[100%] border-blueMain mt-2"></div>
        </div>
    )
}