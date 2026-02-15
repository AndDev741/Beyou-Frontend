import { useTranslation } from "react-i18next";

const TodoRoutineExample = () => {
    const { t } = useTranslation();
    return (
        <div className="border-2 border-primary rounded-lg p-2 w-full max-w-md bg-background text-placeholder shadow-sm cursor-not-allowed">
            <div className="flex items-center gap-3 mb-4">
                <span className="font-semibold text-center text-lg flex-1 text-placeholder">{t('Routine')}</span>
            </div>
            <div className="space-y-3">
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-primary w-6 h-6" />
                    <span className="flex-1 text-placeholder">{t('Buy groceries')}</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-primary w-6 h-6" />
                    <span className="flex-1 text-placeholder">{t('Call mom')}</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-primary w-6 h-6" />
                    <span className="flex-1 text-placeholder">{t('Read a book')}</span>
                </label>
            </div>
        </div>
    );
};

export default TodoRoutineExample;
