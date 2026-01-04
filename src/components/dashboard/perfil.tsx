import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../redux/rootReducer";

function Perfil() {
    const { t } = useTranslation();
    const [hour, setHour] = useState("");
    const name = useSelector((state: RootState) => state.perfil.username);
    const photo = useSelector((state: RootState) => state.perfil.photo);
    const phrase = useSelector((state: RootState) => state.perfil.phrase);
    const phrase_author = useSelector((state: RootState) => state.perfil.phrase_author);
    const constance = useSelector((state: RootState) => state.perfil.constance);

    function getHour() {
        const date = new Date();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const fixedMinute = minute < 10 ? `0${minute}` : minute;
        setHour(`${hour}:${fixedMinute}`);
    }

    useEffect(() => {
        getHour();
        const interval = setInterval(getHour, 30000);
        return () => clearInterval(interval); // Limpeza importante
    }, []);

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between 
        bg-primary md:bg-background md:border-solid md:border-primary md:border-[1px] 
        w-[100%] md:m-3 p-4 md:p-5 md:py-2 md:px-3 min-h-[160px] md:min-h-[180px] 
        rounded-b-[40px] md:rounded-md shadow-lg md:shadow-none">
            
            <div className="flex flex-col flex-1">
                {/* Top Section: Photo, Name and Constance (Mobile Badge) */}
                <div className="flex items-center justify-between md:justify-start w-full">
                    <div className="flex items-center">
                        <img 
                            src={photo}
                            alt={t('PerfilPhotoAlt')}
                            className="w-[80px] h-[80px] md:w-[80px] md:h-[80px] bg-white/20 rounded-full object-cover border-2 border-background md:border-primary" 
                        />
                        <div className="flex flex-col ml-4 text-background md:text-secondary">
                            <h2 className="text-lg md:text-2xl font-bold leading-tight">{t('GoodMorning')}, {name}</h2>
                            <h3 className="text-sm md:text-lg font-medium opacity-90 md:text-primary">{t('BeYourBestVersion')}</h3>
                        </div>
                    </div>

                    {/* Constance Badge: Visible on Mobile only inside this row */}
                    <div className="md:hidden flex flex-col items-center bg-background/20 p-2 rounded-xl text-background min-w-[70px]">
                        <span className="text-xs uppercase font-bold">{t('Constance')}</span>
                        <span className="text-xl font-black">{constance}</span>
                    </div>
                </div>

                {phrase && (
                    <div className="mt-1 lg:mt-4 md:mt-2 italic">
                        <h3 className="text-md md:text-lg text-background/90 md:text-secondary leading-snug line-clamp-1">
                            "{phrase}"
                        </h3>
                        <h4 className="text-sm md:text-base text-background/70 md:text-primary font-semibold">
                            - {phrase_author}
                        </h4>
                    </div>
                )}
            </div>

            {/* Desktop Only Side Info */}
            <div className="hidden md:flex flex-col items-center ml-4">
                <div className="w-[120px] h-[85px] border-solid border-[1px] border-primary rounded-md text-center font-semibold text-secondary flex flex-col justify-center">
                    <p className="text-xs uppercase">{t('Constance')}</p>
                    <p className="text-2xl font-bold">{constance}</p>
                    <p className="text-primary text-xs">{t('Days')}</p>
                </div>

                <div className="flex items-center justify-center w-[100px] h-[40px] border-solid border-[1px] border-primary rounded-md text-lg font-semibold mt-3 text-secondary">
                    <p>{hour}</p>
                </div>
            </div>
        </div>
    );
}

export default Perfil;