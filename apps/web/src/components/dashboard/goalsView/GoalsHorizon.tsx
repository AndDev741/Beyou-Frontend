import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Trophy } from "lucide-react";
import { RootState } from "@beyou/state/rootReducer";
import { goal } from "@beyou/types/goals/goalType";
import { sortGoalsByTime } from "./sortGoalsByTime";
import { formatGoalDeadline, type DeadlineShape } from "@beyou/state";
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

/** Quanto do prazo cabe em cada horizonte: perto, só o dia; longe, só o mês. */
const DEADLINE_SHAPE: Record<HorizonKey, DeadlineShape> = {
    thisWeek: "weekday",
    thisMonth: "dayMonth",
    thisYear: "month",
    beyond: "month",
};

/** Contexto curto ao lado do título do grupo: "até domingo", "agosto", "2026". */
function horizonContext(key: HorizonKey, locale: string, t: (k: string) => string): string {
    const now = new Date();
    if (key === "thisWeek") return t("UntilSunday");
    if (key === "thisMonth") return new Intl.DateTimeFormat(locale, { month: "long" }).format(now);
    if (key === "thisYear") return String(now.getFullYear());
    return t("NoDeadline");
}

/**
 * `null` means "never chose"; `[]` means "chose to hide them all".
 *
 * Collapsing the empty array to `null` made those two indistinguishable, so
 * hiding every horizon came back with the three defaults on the next mount and
 * silently undid the choice.
 */
function readStoredHorizons(): HorizonKey[] | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((key): key is HorizonKey => HORIZONS.includes(key as HorizonKey));
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
    // No mobile os chips não cabem no cabeçalho; viram um dropdown que resume a
    // escolha ("semana · mês") e abre a mesma lista de horizontes.
    const [filterOpen, setFilterOpen] = useState(false);

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

    const chips = HORIZONS.filter((key) => grouped[key].length > 0).map((key) => {
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
                <span className="font-mono text-[11px] opacity-70">{grouped[key].length}</span>
            </button>
        );
    });

    const activeSummary = HORIZONS.filter((key) => active.includes(key) && grouped[key].length > 0)
        .map((key) => t(LABELS[key].chip).toLowerCase())
        .join(" · ");

    return (
        <section className="rounded-card border border-border bg-surface p-4 lg:p-5" data-testid="goals-horizon">
            {/* Mobile: título compacto com o filtro num dropdown à direita. */}
            <div className="flex items-center gap-2 lg:hidden">
                <Trophy size={15} className="shrink-0 text-text-3" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-text">{t("Goals")}</h2>
                <button
                    type="button"
                    onClick={() => setFilterOpen((open) => !open)}
                    aria-expanded={filterOpen}
                    className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-xs text-text-3 active:bg-surface-2"
                >
                    {activeSummary || t("Filter")}
                    <ChevronDown
                        size={13}
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`}
                    />
                </button>
            </div>

            {filterOpen && <div className="mt-3 flex flex-wrap gap-2 lg:hidden">{chips}</div>}

            <header className="hidden flex-wrap items-start gap-3 lg:flex">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-[-0.01em] text-text">
                        {t("YourGoals")}
                    </h2>
                    <p className="mt-0.5 text-xs text-text-3">{t("GoalsHorizonSubtitle")}</p>
                </div>

                <div className="ml-auto flex flex-wrap gap-2">
                    {chips}
                </div>
            </header>

            {visible.length === 0 ? (
                <p className="mt-6 text-center text-sm text-text-3">{t("GoalsHorizonAllHidden")}</p>
            ) : (
                visible.map((key) => (
                    <div key={key} className="mt-3 lg:mt-5">
                        <div className="hidden items-center gap-3 lg:flex">
                            <h3 className="text-[12.5px] font-semibold text-text-2">{t(LABELS[key].title)}</h3>
                            <span className="font-mono text-[11px] text-text-3">
                                {horizonContext(key, i18n.language, t)}
                            </span>
                            <span className="h-px flex-1 bg-border" />
                        </div>

                        <div className="mt-2 grid gap-2 lg:mt-3 lg:gap-3 lg:grid-cols-3">
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
                                            <span>
                                                {t("Until")}{" "}
                                                {formatGoalDeadline(item.endDate, i18n.language, DEADLINE_SHAPE[key])}
                                            </span>
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
