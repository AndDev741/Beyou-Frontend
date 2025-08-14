import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../redux/rootReducer";

function Perfil(){
    const {t} = useTranslation();
    const [hour, setHour] = useState("");
    const name = useSelector((state: RootState) => state.perfil.username);
    const photo = useSelector((state: RootState) => state.perfil.photo);
    const phrase = useSelector((state: RootState) => state.perfil.phrase);
    const phrase_author = useSelector((state: RootState) => state.perfil.phrase_author);
    const constance = useSelector((state: RootState) => state.perfil.constance);

    function getHour(){
        const date = new Date();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const fixedMinute = minute < 10 ? `0${minute}` : minute

        setHour(`${hour}:${fixedMinute}`);
    }
   
    useEffect(() => {
        getHour();
        setInterval(() => {
            getHour();
        }, 30000)
    }, [])

    return(
        <div className="flex items-center md:items-center md:justify-between bg-blueMain md:bg-white 
        md:border-solid md:border-blueMain md:border-[1px] 
        w-[100%] md:m-3 md:py-2 md:px-3 h-[75px] sm:h-[90px] md:min-h-[160px] rounded-b-[50px] md:rounded-md">
            <div 
            className="md:flex flex-col">
                {/* Perfil photo and Name */}
                <div className="flex items-center w-[100%] md:w-auto h-[65px] md:h-auto">
                    <img src={photo}
                    alt={t('PerfilPhotoAlt')}
                    className="w-[75px] h-[75px] sm:w-[100px] md:w-[80px] md:h-[80px] sm:h-[100px] bg-blue-200 rounded-full ml-6 md:ml-0 mt-6 md:mt-0 sm:mt-[35px]" />
                    <div className="flex flex-col ml-4 text-white md:text-black">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">{t('GoodMorning')} {name}</h2>
                        <h3 className="text-md md:text-lg font-normal md:text-blueMain">{t('BeYourBestVersion')}</h3>
                    </div>
                </div>
                {/* Perfil phrase: Only in tablet and desktop */}
                <div className={`hidden ${phrase ? "md:block" : "md:hidden"} text-lg`}>
                    <h3 className="mt-1 ">{phrase}</h3>
                    <h4 className="text-blueMain">- {phrase_author}</h4>
                </div>
            </div>
            {/* Constance and hour: Only in tablet and desktop */}
            <div className="hidden md:flex flex-col items-center">
                <div className="w-[120px] h-[75px] border-solid border-[1px] border-blueMain rounded-md text-center font-semibold">
                    <p>{t('Constance')}</p>
                    <p>{constance}</p>
                    <p className="text-blueMain">{t('Days')}</p>
                </div>

                <div className="flex items-center justify-center w-[100px] h-[45px] border-solid border-[1px] border-blueMain rounded-md text-lg font-semibold mt-3">
                    <p>{hour}</p>
                </div>
            </div>
        </div>
    )
}

export default Perfil;