import { RoutineSection } from '@beyou/types/routine/routineSection';
import { isOvernightRange } from '@beyou/validation';

const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

const fromMinutes = (minutes: number) => {
    const total = ((minutes % 1440) + 1440) % 1440;
    return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
};

/**
 * Horários sugeridos em sequência dentro da janela da seção.
 *
 * O formulário antigo pedia início e fim ANTES de escolher o item, e só deixava
 * adicionar um por vez. Aqui a seção já define a janela: os itens escolhidos
 * dividem o que sobra dela, em ordem, e cada linha continua editável depois —
 * é mais rápido corrigir um horário sugerido do que digitar dois do zero.
 */
export function suggestSlots(
    section: RoutineSection,
    count: number
): { startTime: string; endTime?: string }[] {
    if (count <= 0 || !section.startTime) return [];

    const overnight = isOvernightRange(section.startTime, section.endTime);
    const sectionStart = toMinutes(section.startTime);
    const sectionEnd = section.endTime
        ? toMinutes(section.endTime) + (overnight ? 1440 : 0)
        : undefined;

    // Retoma de onde os itens já existentes pararam.
    const existingEnds = [...(section.habitGroup ?? []), ...(section.taskGroup ?? [])].map((item) => {
        const end = item.endTime || item.startTime;
        if (!end) return sectionStart;
        const value = toMinutes(end);
        return overnight && value < sectionStart ? value + 1440 : value;
    });
    const cursor = existingEnds.length > 0 ? Math.max(sectionStart, ...existingEnds) : sectionStart;

    // Sem hora de término na seção, cada item ganha 15 minutos em fila.
    const DEFAULT_SLOT = 15;
    const remaining = sectionEnd !== undefined ? Math.max(sectionEnd - cursor, 0) : undefined;
    // Dividir o que sobra só faz sentido quando se sabe QUANTOS itens entram
    // juntos. Pedindo um de cada vez (é assim que as duas telas escolhem hoje),
    // dividir por 1 daria a janela inteira ao primeiro e sobraria zero para o
    // próximo — então o item avulso leva a fatia padrão, no teto do que resta.
    const slot =
        remaining === undefined
            ? DEFAULT_SLOT
            : count > 1
              ? Math.max(Math.floor(remaining / count), 1)
              : Math.max(Math.min(DEFAULT_SLOT, remaining), 1);

    return Array.from({ length: count }, (_, i) => {
        const start = cursor + slot * i;
        const end = sectionEnd !== undefined ? Math.min(start + slot, sectionEnd) : start + slot;
        return { startTime: fromMinutes(start), endTime: fromMinutes(end) };
    });
}
