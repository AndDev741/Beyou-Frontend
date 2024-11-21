import CreateHabit from "../../components/habits/createHabit";
import RenderHabits from "../../components/habits/renderHabits";
import Header from "../../components/header";
import VerifyAuth from "../../components/verifyAuthentication";


function Habits(){
    return(
        <div className="lg:flex flex-col items-center w-full">
            <VerifyAuth/>
            <Header pageName={"YourHabits"} />
            <div className="lg:flex flex-col justify-center items-center lg:w-[42%]">
                <RenderHabits/>
                <CreateHabit/>
            </div>
        </div>
    )
}

export default Habits;