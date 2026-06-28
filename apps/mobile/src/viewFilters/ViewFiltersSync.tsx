import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { hydrateViewFilters } from '@beyou/state/viewFilters/viewFiltersSlice';
import { loadViewFilters, saveViewFilters } from '../lib/viewFiltersStore';
import type { RootState, AppDispatch } from '../store';

/**
 * Persists the per-list sort choice across launches — mobile redux is in-memory
 * only, so without this the sort resets to "default" every app start (web keeps
 * it via redux-persist). Hydrates from secure storage on boot, then writes on
 * every change. The write is gated until hydration runs so the initial default
 * never overwrites a saved pref.
 */
export default function ViewFiltersSync() {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((s: RootState) => s.viewFilters);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      const saved = await loadViewFilters();
      if (saved) dispatch(hydrateViewFilters(saved));
      hydrated.current = true;
    })();
  }, [dispatch]);

  useEffect(() => {
    if (hydrated.current) saveViewFilters(filters);
  }, [filters]);

  return null;
}
