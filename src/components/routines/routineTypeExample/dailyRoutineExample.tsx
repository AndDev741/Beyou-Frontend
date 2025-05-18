import { useTranslation } from "react-i18next";
import { FaRegSun } from "react-icons/fa";

type dailyRoutineExampleProps = {
    setRoutineType: (value: string) => void
};

const DailyRoutineExample = ({setRoutineType}: dailyRoutineExampleProps) => {
    
    const {t} = useTranslation();
    return (
        <div className="border-2 border-blueMain rounded-lg p-3 w-full max-w-md bg-white shadow-sm cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => setRoutineType("daily")}
        >
            
            <div className="flex items-center gap-3 mb-4">
                <FaRegSun className="text-blueMain text-2xl" />
                <span className="font-semibold text-lg flex-1">{t('Morning')}</span>
                <span className="text-blueMain text-sm">06:00 - 08:00</span>
            </div>
            
            <div className="space-y-3">
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#0082E1] w-6 h-6" />
                    <span className="flex-1">{t('Drink water')}</span>
                    <span className="text-gray-400 text-xs">06:05</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#0082E1] w-6 h-6" />
                    <span className="flex-1">{t('Meditate')}</span>
                    <span className="text-gray-400 text-xs">06:15</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#0082E1] w-6 h-6" />
                    <span className="flex-1">{t('Physical exercise')}</span>
                    <span className="text-gray-400 text-xs">06:30</span>
                </label>
            </div>
        </div>
    );
};

export default DailyRoutineExample;
