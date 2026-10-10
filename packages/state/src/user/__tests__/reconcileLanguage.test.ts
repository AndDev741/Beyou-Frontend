import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';

vi.mock('@beyou/api/user/editUser', () => ({ default: vi.fn() }));

import editUser from '@beyou/api/user/editUser';
import { setLogger } from '@beyou/api';
import { reconcileLanguage } from '../reconcileLanguage';

const editUserMock = vi.mocked(editUser);

type MockDispatch = Dispatch<UnknownAction> & ReturnType<typeof vi.fn>;

describe('reconcileLanguage', () => {
    let dispatch: MockDispatch;

    beforeEach(() => {
        dispatch = vi.fn() as unknown as MockDispatch;
        editUserMock.mockReset();
        editUserMock.mockResolvedValue({ data: undefined });
        setLogger({ error: () => {} });
    });

    it('saves the language the screen shows on an account that has none', async () => {
        await reconcileLanguage(dispatch, { languageInUse: '' }, 'pt-BR');

        expect(editUserMock).toHaveBeenCalledWith({ language: 'pt' });
        expect(dispatch).toHaveBeenCalledWith({ type: 'perfil/languageInUserEnter', payload: 'pt' });
    });

    it('treats a null language as empty too', async () => {
        await reconcileLanguage(dispatch, { languageInUse: null }, 'en');

        expect(editUserMock).toHaveBeenCalledWith({ language: 'en' });
    });

    it('never overwrites a saved language', async () => {
        await reconcileLanguage(dispatch, { languageInUse: 'en' }, 'pt');

        expect(editUserMock).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('sends nothing for a language the app does not ship', async () => {
        await reconcileLanguage(dispatch, { languageInUse: '' }, 'fr');

        expect(editUserMock).not.toHaveBeenCalled();
    });

    it('leaves the store alone when the server refuses', async () => {
        editUserMock.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

        await reconcileLanguage(dispatch, { languageInUse: '' }, 'pt');

        expect(dispatch).not.toHaveBeenCalled();
    });

    it('swallows a network failure', async () => {
        editUserMock.mockRejectedValue(new Error('offline'));

        await expect(reconcileLanguage(dispatch, { languageInUse: '' }, 'pt')).resolves.toBeUndefined();
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('does nothing without a profile', async () => {
        await reconcileLanguage(dispatch, null, 'pt');

        expect(editUserMock).not.toHaveBeenCalled();
    });
});
