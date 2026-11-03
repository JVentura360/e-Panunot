import { useSyncExternalStore } from 'react';
import { getOfflineState, subscribeOffline } from './runtime.js';

export const useOffline = () => useSyncExternalStore(subscribeOffline, getOfflineState, getOfflineState);
