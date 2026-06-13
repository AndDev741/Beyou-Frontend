import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { UserType } from "@beyou/types/user/UserType";
import { themes } from "../../components/utils/listOfThemes";
import {
    nameEnter,
    emailEnter,
    phraseEnter,
    phraseAuthorEnter,
    constanceEnter,
    photoEnter,
    isGoogleAccountEnter,
    widgetsIdInUseEnter,
    themeInUseEnter,
    xpEnter,
    levelEnter,
    nextLevelXpEnter,
    actualLevelXpEnter,
    alreadyIncreaseConstanceTodayEnter,
    maxConstanceEnter,
    languageInUserEnter,
    tutorialCompletedEnter,
    timezoneEnter,
    xpDecayStrategyEnter
} from "../../redux/user/perfilSlice";

/**
 * Populate the `perfil` redux slice from a user profile payload.
 *
 * Shared by every path that loads the user: UI login, Google login, and the
 * silent refresh on app boot. The `perfil` slice is intentionally NOT persisted
 * (it holds PII), so it must be re-hydrated from the backend on every fresh
 * page load — see `useSilentRefresh`.
 */
export function hydratePerfil(dispatch: Dispatch<UnknownAction>, data: UserType): void {
    dispatch(nameEnter(data.name));
    dispatch(emailEnter(data.email));
    dispatch(phraseEnter(data.phrase));
    dispatch(phraseAuthorEnter(data.phrase_author));
    dispatch(constanceEnter(data.constance));
    dispatch(photoEnter(data.photo));
    dispatch(isGoogleAccountEnter(data.isGoogleAccount));
    dispatch(widgetsIdInUseEnter(data.widgetsId));
    dispatch(themeInUseEnter(themes.find((theme) => theme.mode === data?.themeInUse) || null));
    dispatch(xpEnter(data.xp));
    dispatch(levelEnter(data.level));
    dispatch(nextLevelXpEnter(data.nextLevelXp));
    dispatch(actualLevelXpEnter(data.actualLevelXp));
    dispatch(alreadyIncreaseConstanceTodayEnter(data.constanceIncreaseToday));
    dispatch(maxConstanceEnter(data.maxConstance));
    dispatch(languageInUserEnter(data.languageInUse));
    dispatch(tutorialCompletedEnter(Boolean(data?.isTutorialCompleted)));
    dispatch(timezoneEnter(data.timezone));
    dispatch(xpDecayStrategyEnter(data.xpDecayStrategy));
}
