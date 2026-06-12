interface AlertContainer {
  style: {
    setProperty: (property: string, value: string) => void;
  };
}

export const OVERLAP_ALERT_Z_INDEX = 10000;

export const applyOverlapAlertLayer = (container: AlertContainer | null) => {
  container?.style.setProperty('z-index', String(OVERLAP_ALERT_Z_INDEX));
};
