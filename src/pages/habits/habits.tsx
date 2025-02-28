import { useSelector } from "react-redux";
import CreateHabit from "../../components/habits/createHabit";
import EditHabit from "../../components/habits/editHabit";
import RenderHabits from "../../components/habits/renderHabits";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { useState } from "react";
import { habit } from "../../types/habit/habitType";

function Habits(){
    useAuthGuard();

    const isEditMode = useSelector((state: RootState) => state.editHabit.editMode);
    const [habits, setHabits] = useState<habit[]>([]);

    return(
        <div className="lg:flex flex-col items-center w-full">
            <Header pageName={"YourHabits"} />
            <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%]">
                <div className="">
                    <RenderHabits habits={habits} setHabits={setHabits}/>
                </div>
                <div>
                    <div className={`${isEditMode ? "hidden" : "block"}`}>
                        <CreateHabit setHabits={setHabits}/>
                    </div>
                    <div className={`${isEditMode ? "block" : "hidden"}`}>
                        <EditHabit setHabits={setHabits}/>
                    </div>
                    
                </div>
            </div>
        </div>
    )
}

export default Habits;