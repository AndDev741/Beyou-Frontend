jest.mock('@beyou/api/user/editUser', () => ({ __esModule: true, default: jest.fn(async () => ({ success: true })) }));
import editUser from '@beyou/api/user/editUser';
import { completeTutorial } from '../src/tutorial/completeTutorial';

test('completeTutorial persists + dispatches on success', async () => {
  const dispatch = jest.fn();
  const ok = await completeTutorial({ dispatch, t: ((k: string) => k) as never });
  expect(ok).toBe(true);
  expect(editUser).toHaveBeenCalledWith({ isTutorialCompleted: true });
  expect(dispatch).toHaveBeenCalled();
});

test('completeTutorial returns false on api error', async () => {
  (editUser as jest.Mock).mockResolvedValueOnce({ error: 'boom' });
  const ok = await completeTutorial({ dispatch: jest.fn(), t: ((k: string) => k) as never });
  expect(ok).toBe(false);
});
