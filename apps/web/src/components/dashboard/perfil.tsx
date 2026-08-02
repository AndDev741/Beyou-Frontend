import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { RootState } from "@beyou/state/rootReducer";
import { calculateLevelProgress } from "@beyou/state";
import { getGreetingKey, GreetingKey } from "./getGreetingKey";
import { ProgressRing } from "../progressRing";
import { resolvePhotoUrl } from "../../services/photoUrl";

function Avatar({ photo, name, alt }: { photo: string; name: string; alt: string }) {
    if (photo) {
        return (
            <img
                src={resolvePhotoUrl(photo)}
                alt={alt}
                aria-label={alt}
                className="w-14 h-14 rounded-full object-cover border-2 border-border bg-white/20"
            />
        );
    }
    const initial = (name.trim()[0] ?? "?").toUpperCase();
    return (
        <div className="w-14 h-14 rounded-full border-2 border-border bg-accent flex items-center justify-center">
            <span className="text-xl font-bold text-on-accent">{initial}</span>
        </div>
    );
}

function Perfil() {
    const { t } = useTranslation();
    const [greetingKey, setGreetingKey] = useState<GreetingKey>(() => getGreetingKey(new Date().getHours()));
    const name = useSelector((state: RootState) => state.perfil.username);
    const photo = useSelector((state: RootState) => state.perfil.photo);
    const phrase = useSelector((state: RootState) => state.perfil.phrase);
    const phrase_author = useSelector((state: RootState) => state.perfil.phrase_author);
    const constance = useSelector((state: RootState) => state.perfil.constance);
    const xp = useSelector((state: RootState) => state.perfil.xp);
    const level = useSelector((state: RootState) => state.perfil.level);
    const actualLevelXp = useSelector((state: RootState) => state.perfil.actualLevelXp);
    const nextLevelXp = useSelector((state: RootState) => state.perfil.nextLevelXp);

    useEffect(() => {
        const update = () => setGreetingKey(getGreetingKey(new Date().getHours()));
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, []);

    const levelProgress = calculateLevelProgress(xp, actualLevelXp, nextLevelXp);

    return (
        <div
            data-tutorial-id="dashboard-profile"
            className="w-full rounded-card border border-border bg-surface p-4 md:m-3 md:max-w-md lg:max-w-none"
        >
            <div className="flex items-center gap-3">
                <Avatar photo={photo} name={name} alt={t('PerfilPhotoAlt')} />

                <div className="flex flex-1 flex-col min-w-0">
                    <h2
                        data-testid="dashboard-greeting"
                        className="truncate text-xl font-semibold leading-tight tracking-[-0.02em] text-text"
                    >
                        {t(greetingKey)}, {name}
                    </h2>
                    <h3 className="text-xs font-medium text-text-3">{t('BeYourBestVersion')}</h3>
                </div>

                {/* Level / XP ring */}
                <div className="relative shrink-0 flex items-center justify-center" title={t('Level')}>
                    <ProgressRing progress={levelProgress} size="md" showText={false} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono text-base font-semibold leading-none text-text">{level}</span>
                        <span className="text-[9px] font-semibold uppercase text-text-3">{t('Level')}</span>
                    </div>
                </div>
            </div>

            {phrase && (
                <div className="mt-2">
                    <p className="line-clamp-1 text-sm italic leading-snug text-text-2">"{phrase}"</p>
                    <p className="text-xs font-semibold text-text-3">— {phrase_author}</p>
                </div>
            )}

            <div className="mt-2 flex items-center gap-1.5" title={t('StreakExplanation')}>
                <Flame size={16} className="text-flame" />
                <span className="font-mono text-sm font-semibold text-flame">{constance}</span>
                <span className="text-xs text-text-3">
                    {t('Days', { count: constance })} · {t('Constance')}
                </span>
            </div>
        </div>
    );
}

export default Perfil;
