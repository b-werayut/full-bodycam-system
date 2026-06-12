import { create } from 'zustand';
import { getDevicesWithFallback, requestCameraStream, type DeviceData } from '../services/deviceService';

interface LiveFeedState {
  deviceList: DeviceData[];
  isLoading: boolean;
  isManualRefresh: boolean;
  lastUpdated: Date | null;
  currentPage: number;
  itemsPerPage: number;
  searchTerm: string;
  selectedDevice: DeviceData | null;
  streamUrl: string | null;
  streamLoading: boolean;
  streamError: string | null;
  cameraIsOffline: boolean;
  setSearchTerm: (searchTerm: string) => void;
  setCurrentPage: (currentPage: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  fetchDevices: (showInitialLoading?: boolean) => Promise<void>;
  manualRefresh: () => Promise<void>;
  fetchCameraStream: (device: DeviceData, offlineMessage: string) => Promise<void>;
  setStreamError: (streamError: string | null) => void;
  closeCameraModal: () => void;
}

const extractStreamUrl = (videoUrl: string) => {
  const urlMatch = videoUrl.match(/\/proxy\/.*/);
  return urlMatch ? urlMatch[0] : videoUrl;
};

export const useLiveFeedStore = create<LiveFeedState>((set) => ({
  deviceList: [],
  isLoading: true,
  isManualRefresh: false,
  lastUpdated: null,
  currentPage: 1,
  itemsPerPage: 10,
  searchTerm: '',
  selectedDevice: null,
  streamUrl: null,
  streamLoading: false,
  streamError: null,
  cameraIsOffline: false,
  setSearchTerm: (searchTerm) => set({ searchTerm, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setItemsPerPage: (itemsPerPage) => set({ itemsPerPage, currentPage: 1 }),
  fetchDevices: async (showInitialLoading = false) => {
    if (showInitialLoading) {
      set({ isLoading: true });
    }

    try {
      set({
        deviceList: await getDevicesWithFallback(),
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      set({ isLoading: false });
    }
  },
  manualRefresh: async () => {
    set({ isManualRefresh: true });

    try {
      set({
        deviceList: await getDevicesWithFallback(),
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      set({ isManualRefresh: false });
    }
  },
  fetchCameraStream: async (device, offlineMessage) => {
    if (!device.active) return;

    set({
      selectedDevice: device,
      streamLoading: true,
      streamError: null,
      streamUrl: null,
      cameraIsOffline: false,
    });

    try {
      const result = await requestCameraStream(device.deviceCode, true);

      if (result.code === 1000 && result.data?.video_url) {
        set({ streamUrl: extractStreamUrl(result.data.video_url) });
      } else if (result.code === 1001 || result.data?.status === 0) {
        set({ cameraIsOffline: true });
        throw new Error(offlineMessage);
      } else {
        throw new Error(result.desc || 'Failed to get stream URL');
      }
    } catch (error) {
      console.error('Failed to fetch camera stream:', error);
      set({ streamError: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ streamLoading: false });
    }
  },
  setStreamError: (streamError) => set({ streamError }),
  closeCameraModal: () => set({ selectedDevice: null, streamUrl: null, streamError: null }),
}));
