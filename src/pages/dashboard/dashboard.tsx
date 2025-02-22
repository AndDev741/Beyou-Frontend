import Perfil from "../../components/dashboard/perfil";
import Shortcuts from "../../components/dashboard/shortcuts";
import useAuthGuard from "../../components/useAuthGuard";

function Dashboard(){
    useAuthGuard();

    return(
        <>
        <header className="md:flex md:justify-center lg:justify-start">
            <Perfil/>
        </header>

        <Shortcuts/>
        </>
    )
}

export default Dashboard;