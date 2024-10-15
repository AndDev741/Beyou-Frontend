import Perfil from "../../components/dashboard/perfil";
import Shortcuts from "../../components/dashboard/shortcuts";
import VerifyAuth from "../../components/verifyAuthentication";

function Dashboard(){
    

    return(
        <>
        <VerifyAuth />
        
        <header className="md:flex md:justify-center lg:justify-start">
            <Perfil/>
        </header>

        <Shortcuts/>
        </>
    )
}

export default Dashboard;