import { makeStore } from './store';
import { logout } from './auth/authSlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { photoEnter } from '@beyou/state/user/perfilSlice';

// Mobile redux is in-memory and the app never reloads on logout, so the store
// MUST reset every slice on logout — otherwise the next account inherits the
// previous user's profile photo, routine, habits, etc.
describe('store logout reset', () => {
  it('resets all domain slices to initial state on logout', () => {
    const fresh = makeStore().getState();
    const s = makeStore();

    s.dispatch(photoEnter('https://old-user/photo.png'));
    s.dispatch(enterHabits([{ id: 'h1', name: 'Old habit' } as never]));
    expect(s.getState().perfil.photo).toBe('https://old-user/photo.png');
    expect(s.getState().habits.habits).toHaveLength(1);

    s.dispatch(logout.fulfilled(undefined, 'req-id', undefined));

    expect(s.getState().perfil).toEqual(fresh.perfil);
    expect(s.getState().habits).toEqual(fresh.habits);
  });
});
