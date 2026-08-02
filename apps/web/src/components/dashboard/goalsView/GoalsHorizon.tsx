import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { RootState } from "@beyou/state/rootReducer";
import { goal } from "@beyou/types/goals/goalType";
import { sortGoalsByTime } from "./sortGoalsByTime";
import BeyouIcon from "../../../ui/BeyouIcon";

type HorizonKey = "thisWeek" | "thisMonth" | "thisYear" | "beyond";

const HORIZONS: HorizonKey[] = ["thisWeek", "thisMonth", "thisYear", "beyond"];

const LABELS: Record<HorizonKey, { title: string; chip: string }> = {
    thisWeek: { title: "This Week", chip: "Week" },
    thisMonth: { title: "This Month", chip: "Month" },
    thisYear: { title: "This Year", chip: "Year" },
    beyond: { title: "Future Goals", chip: "Future" },
};

const STORAGE_KEY = "beyou-goal-horizons";

/** Contexto curto ao lado do título do grupo: "até domingo", "agosto", "2026". */
function horizonContext(key: HorizonKey, locale: string, t: (k: string) => string): string {
    const now = new Date();
    if (key === "thisWeek") return t("UntilSunday");
    if (key === "thisMonth") return new Intl.DateTimeFormat(locale, { month: "long" }).format(now);
    if (key === "thisYear") return String(now.getFullYear());
    return t("NoDeadline");
}

/** Prazo curto do cartão: "até dom", "até 31 ago", "até dez". */
function shortDeadline(date: Date, key: HorizonKey, locale: string, t: (k: string) => string): string {
    const end = new Date(date);
    if (Number.isNaN(end.getTime())) return "";
    const format =
        key === "thisWeek"
            ? { weekday: "short" as const }
            : key === "thisMonth"
              ? { day: "numeric" as const, month: "short" as const }
              : { month: "short" as const };
    return `${t("Until")} ${new Intl.DateTimeFormat(locale, format).format(end)}`;
}

function readStoredHorizons(): HorizonKey[] | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as string[];
        const valid = parsed.filter((key): key is HorizonKey => HORIZONS.includes(key as HorizonKey));
        return valid.length > 0 ? valid : null;
    } catch {
        return null;
    }
}

/**
 * "Suas metas" no dashboard: o porquê dos checks do dia, agrupado por horizonte.
 *
 * Os cartões são compactos de propósito — a meta aqui é ver o que está à frente
 * numa olhada; o detalhe (stepper, motivação, período) mora na página de Metas,
 * para onde o clique leva já destacando a meta escolhida.
 *
 * O filtro é um toggle por horizonte com contagem, e a escolha fica salva: quem
 * só se importa com a semana não quer refiltrar todo dia.
 */
export default function GoalsHorizon() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const goals = useSelector((state: RootState) => state.goals.goals);
    const [active, setActive] = useState<HorizonKey[]>(
        () => readStoredHorizons() ?? ["thisWeek", "thisMonth", "thisYear"],
    );

    const grouped = useMemo(() => sortGoalsByTime(goals || []), [goals]);

    const toggle = (key: HorizonKey) => {
        setActive((prev) => {
            const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                /* storage indisponível — a escolha vale só nesta sessão */
            }
            return next;
        });
    };

    // Abre a página de Metas já com a meta em foco (ela rola até lá e destaca).
    const openGoal = (id: string) => navigate(`/goals?goal=${id}`);

    const visible = HORIZONS.filter((key) => active.includes(key) && grouped[key].length > 0);
    const hasAnyGoal = HORIZONS.some((key) => grouped[key].length > 0);

    if (!hasAnyGoal) return null;

    return (
        <section className="rounded-card border border-border bg-surface p-5" data-testid="goals-horizon">
            <header className="flex flex-wrap items-start gap-3">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-[-0.01em] text-text">
                        {t("YourGoals")}
                    </h2>
                    <p className="mt-0.5 text-xs text-text-3">{t("GoalsHorizonSubtitle")}</p>
                </div>

                <div className="ml-auto flex flex-wrap gap-2">
                    {HORIZONS.map((key) => {
                        const count = grouped[key].length;
                        if (count === 0) return null;
                        const isOn = active.includes(key);
                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={isOn}
                                onClick={() => toggle(key)}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                                    isOn
                                        ? "border-accent bg-accent-soft text-accent"
                                        : "border-border text-text-3 hover:text-text-2"
                                }`}
                            >
                                {isOn && <Check size={12} aria-hidden="true" />}
                                {t(LABELS[key].chip)}
                                <span className="font-mono text-[11px] opacity-70">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {visible.length === 0 ? (
                <p className="mt-6 text-center text-sm text-text-3">{t("GoalsHorizonAllHidden")}</p>
            ) : (
                visible.map((key) => (
                    <div key={key} className="mt-5">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[12.5px] font-semibold text-text-2">{t(LABELS[key].title)}</h3>
                            <span className="font-mono text-[11px] text-text-3">
                                {horizonContext(key, i18n.language, t)}
                            </span>
                            <span className="h-px flex-1 bg-border" />
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {grouped[key].map((item: goal) => {
                                const target = item.targetValue > 0 ? item.targetValue : 1;
                                const percent = Math.min(100, Math.round((item.currentValue / target) * 100));
                                const reached = item.currentValue >= item.targetValue;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => openGoal(item.id)}
                                        className={`rounded-control border p-3 text-left transition-colors duration-200 hover:border-text-3/60 ${
                                            reached ? "border-success" : "border-border"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                                                <BeyouIcon id={item.iconId} />
                                            </span>
                                            <b className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-text">
                                                {item.name}
                                            </b>
                                            {reached && (
                                                <span className="shrink-0 rounded-full bg-xp-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-xp">
                                                    +{item.xpReward}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                                            <div
                                                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                                                    reached ? "bg-success" : "bg-accent"
                                                }`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-text-3">
                                            <span>
                                                {item.currentValue}/{item.targetValue} {item.unit}
                                            </span>
                                            <span>{shortDeadline(item.endDate, key, i18n.language, t)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </section>
    );
}
