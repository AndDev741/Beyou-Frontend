import { useSelector } from "react-redux";
import CreateHabit from "../../components/habits/createHabit";
import EditHabit from "../../components/habits/editHabit";
import RenderHabits from "../../components/habits/renderHabits";
import Header from "../../components/header";
import VerifyAuth from "../../components/verifyAuthentication";


function Habits(){

    const isEditMode = useSelector(state => state.editHabit.editMode);

    return(
        <div className="lg:flex flex-col items-center w-full">
            <VerifyAuth/>
            <Header pageName={"YourHabits"} />
            <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%]">
                <div className="">
                    <RenderHabits/>
                </div>
                <div>
                    <div className={`${isEditMode ? "hidden" : "block"}`}>
                        <CreateHabit/>
                    </div>
                    <div className={`${isEditMode ? "block" : "hidden"}`}>
                        <EditHabit/>
                    </div>
                    
                </div>
            </div>
        </div>
    )
}

export default Habits;