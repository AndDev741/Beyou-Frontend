import { useTranslation } from 'react-i18next';
import DailyRoutineExample from './routineTypeExample/dailyRoutineExample';
import TodoRoutineExample from './routineTypeExample/todoRoutineExample';
import CreateDailyRoutine from './dailyRoutine/CreateDailyRoutine';

type createRoutineProps = {
    setRoutineType: (value: string) => void;
    routineType: string;
    onDailySectionChange?: (hasSection: boolean) => void;
    onSectionModalChange?: (isOpen: boolean) => void;
};

const CreateRoutine = ({
    setRoutineType,
    routineType,
    onDailySectionChange,
    onSectionModalChange
}: createRoutineProps) => {

    const { t } = useTranslation();

    return (
        <div
            className='w-full flex flex-col items-center justify-center text-secondary'
            data-tutorial-id="routine-create-area"
        >
            {!routineType && (
                <div className='w-full flex flex-col items-center justify-center'>
                    <h2 className='text-2xl text-secondary'>{t('Do you want a')}</h2>

                    <div className='w-full flex items-center justify-evenly mt-5'>
                        <div className='flex flex-col items-center justify-center'>
                            <h3 className='text-lg mb-2 text-secondary'>{t('Daily Routine')}</h3>
                            <div>
                                <DailyRoutineExample setRoutineType={setRoutineType} />
                            </div>
                        </div>
                        <div className='flex flex-col items-center justify-center'>
                            <h3 className='text-lg mb-2 text-secondary'>{t('Todo Routine')}</h3>
                            <div>
                                <TodoRoutineExample />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {routineType === "daily" && (
                <div className="mt-2 w-full">
                    <CreateDailyRoutine
                        onSectionChange={onDailySectionChange}
                        onSectionModalChange={onSectionModalChange}
                    />
                </div>
            )}
        </div>
    );
};

export default CreateRoutine;
