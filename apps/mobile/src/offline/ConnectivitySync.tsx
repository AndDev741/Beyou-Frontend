import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { setOnline } from './connectivitySlice';
import type { RootState, AppDispatch } from '../store';

function isReachable(state: Network.NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Feeds the connectivity slice from expo-network and fires `onOnline` on each
 * offline→online transition (the sync engine flush hook). Mounted once in the
 * root layout, mirrors the ThemeSync/ViewFiltersSync pattern.
 */
export default function ConnectivitySync({ onOnline }: { onOnline?: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const isOnline = useSelector((s: RootState) => s.connectivity.isOnline);
  const prev = useRef<boolean | null>(null);

  useEffect(() => {
    let active = true;
    Network.getNetworkStateAsync().then((s) => {
      if (active) dispatch(setOnline(isReachable(s)));
    });
    const sub = Network.addNetworkStateListener((s) => {
      dispatch(setOnline(isReachable(s)));
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [dispatch]);

  useEffect(() => {
    if (prev.current === false && isOnline === true) onOnline?.();
    prev.current = isOnline;
  }, [isOnline, onOnline]);

  return null;
}
