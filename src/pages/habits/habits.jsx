import CreateHabit from "../../components/habits/createHabit";
import Header from "../../components/header";
import VerifyAuth from "../../components/verifyAuthentication";


function Habits(){
    return(
        <div className="lg:flex flex-col items-center w-full">
            <VerifyAuth/>
            <Header pageName={"YourHabits"} />
            <div className="lg:flex flex-col justify-center items-center lg:w-[42%]">
                <CreateHabit/>
            </div>
        </div>
    )
}

export default Habits;