import { Angry, Frown, Meh, Smile, Laugh } from 'lucide-react-native';
import type { Theme } from '@beyou/theme';
import type { MoodLevel } from '@beyou/types/mood/mood';

type Face = {
    Icon: typeof Smile;
    /** NativeWind class for the filled dot in the week strip. */
    fill: string;
    /** Which theme token the icon is painted with. Lucide RN takes a colour, not a class. */
    color: (theme: Theme) => string;
};

/**
 * The five faces, and the colour each one wears. Mirror of the web's `moodScale.tsx`.
 *
 * Existing semantic tokens rather than a new palette: danger, flame, a muted neutral, accent and
 * success already exist in every theme and already mean roughly what these levels mean. The two
 * platforms have to agree on this, so a level's face and colour are decided the same way twice
 * rather than eyeballed per client.
 */
export const MOOD_FACES: Record<MoodLevel, Face> = {
    1: { Icon: Angry, fill: 'bg-danger', color: (theme) => theme.danger },
    2: { Icon: Frown, fill: 'bg-flame', color: (theme) => theme.flame },
    3: { Icon: Meh, fill: 'bg-text-3', color: (theme) => theme.text3 },
    4: { Icon: Smile, fill: 'bg-accent', color: (theme) => theme.accent },
    5: { Icon: Laugh, fill: 'bg-success', color: (theme) => theme.success },
};
