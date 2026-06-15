import { Eye, X, Calendar, Clock, MapPin, User, Video, Edit, AlertTriangle, Trash2, CheckCircle, PlayCircle, StopCircle, XCircle, Check, Copy, Plus, Save, ChevronDown, FileText } from 'lucide-react';
import type { SpotCheckItem } from '../../features/spot-check/types';
import type { SpotCheckTranslationData, SpotCheckLanguage } from '../../locales/spotCheckTranslations';
import type { MissionSqlFormData } from '../../pages/SpotCheck';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from "uuid";
import { getLocations, getOfficers, getReports } from '../../services/missionService';
import { isMissionEndTimeBeforeStartTime, isMissionStartDateInPast, getMinMissionStartDateTime } from '../../features/spot-check/missionTimeValidation';

interface LocationFields {
  locationId?: number | string;
  LocationId?: number | string;
  location_id?: number | string;
  locationCode?: string | number | null;
  locationcode?: string | number | null;
  LocationCode?: string | number | null;
  location_code?: string | number | null;
  locationName?: string | null;
  LocationName?: string | null;
  latitude?: string | number | null;
  Latitude?: string | number | null;
  longitude?: string | number | null;
  Longitude?: string | number | null;
  recordedAt?: string;
  RecordedAt?: string;
}

interface DeviceFields {
  deviceCode?: string | number | null;
  DeviceCode?: string | number | null;
  deviceName?: string | null;
  DeviceName?: string | null;
  deviceType?: string | null;
  DeviceType?: string | null;
  serialNo?: string | null;
  SerialNo?: string | null;
  active?: boolean | string | number;
  Active?: boolean | string | number;
  busy?: boolean | string | number;
  Busy?: boolean | string | number;
  inUse?: boolean | string | number;
  InUse?: boolean | string | number;
  isInUse?: boolean | string | number;
  IsInUse?: boolean | string | number;
}

interface LocationItem extends LocationFields, DeviceFields {
  Locations?: LocationFields[];
  devices?: DeviceFields[];
  Devices?: DeviceFields[] | DeviceFields;
}

interface OfficerItem {
  officerId: number;
  officerName: string;
  createdAt: string;
}

interface CommonModalProps {
  show: boolean;
  onClose: () => void;
  translations: SpotCheckTranslationData;
  language: SpotCheckLanguage;
  darkMode: boolean;
}

interface FormModalProps extends CommonModalProps {
  isEdit: boolean;
  formData: MissionSqlFormData;
  setFormData: React.Dispatch<React.SetStateAction<MissionSqlFormData>>;
  onSubmit: (e: React.SyntheticEvent) => void;
}

interface ViewModalProps extends CommonModalProps {
  item: SpotCheckItem | null;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  copySuccess: boolean;
  copyToClipboard: (text: string) => void;
  handleAction: (type: 'accept' | 'start' | 'complete' | 'reject') => void;
  canUseActions: boolean;
}

interface DeleteModalProps extends CommonModalProps {
  item: SpotCheckItem | null;
  onConfirm: () => void;
}

interface ActionModalProps extends CommonModalProps {
  item: SpotCheckItem | null;
  actionType: 'accept' | 'start' | 'complete' | 'reject' | null;
  onConfirm: () => void;
}

interface SuccessModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  reportId: string;
  missionName: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const generateReportId = () => {
  return `INT-${uuidv4().slice(0, 6).toUpperCase()}`;
};

const modalBackdropClass = (darkMode: boolean) =>
  `fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${
    darkMode ? 'bg-slate-950/80' : 'bg-slate-900/50'
  }`;

const modalSurfaceClass = (darkMode: boolean, widthClass = 'max-w-4xl') =>
  `flex max-h-[92vh] w-full ${widthClass} flex-col overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 ${
    darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
  }`;

const modalHeaderClass = (darkMode: boolean) =>
  `shrink-0 border-b px-6 py-5 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`;

const modalBodyClass = (darkMode: boolean) =>
  `flex-1 overflow-y-auto px-6 py-5 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`;

const modalFooterClass = (darkMode: boolean) =>
  `shrink-0 border-t px-6 py-3.5 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`;

const modalCloseButtonClass = (darkMode: boolean) =>
  `flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${
    darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
  }`;

const sectionClass = (darkMode: boolean) =>
  `rounded-xl border p-4 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`;

const fieldClass = (darkMode: boolean) =>
  `h-11 w-full rounded-md border px-3.5 text-sm outline-none transition-all focus:ring-2 ${
    darkMode
      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
      : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500/20'
  }`;

const readOnlyFieldClass = (darkMode: boolean) =>
  `h-11 w-full rounded-md border px-3.5 text-sm outline-none ${
    darkMode ? 'border-slate-700 bg-slate-800/70 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'
  }`;

const mutedPanelClass = (darkMode: boolean) =>
  `rounded-md border ${darkMode ? 'border-slate-800 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`;

const MISSION_NAME_MAX_LENGTH = 300;
const NOTE_MAX_LENGTH = 500;

const toFormText = (value: string | number | null | undefined) => value == null ? '' : String(value);

const toLocationId = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const getLocationId = (location: LocationItem) =>
  toLocationId(
    location.locationId ??
    location.LocationId ??
    location.location_id ??
    location.Locations?.[0]?.locationId ??
    location.Locations?.[0]?.LocationId ??
    location.Locations?.[0]?.location_id
  );

const getLocationCode = (location: LocationItem) =>
  toFormText(
    location.locationCode ??
    location.locationcode ??
    location.LocationCode ??
    location.location_code ??
    location.Locations?.[0]?.locationCode ??
    location.Locations?.[0]?.locationcode ??
    location.Locations?.[0]?.LocationCode ??
    location.Locations?.[0]?.location_code ??
    getLocationId(location)
  );

const getLocationName = (location: LocationItem) =>
  toFormText(location.locationName ?? location.LocationName ?? location.Locations?.[0]?.locationName ?? location.Locations?.[0]?.LocationName);

const getLocationLatitude = (location: LocationItem) =>
  toFormText(location.latitude ?? location.Latitude ?? location.Locations?.[0]?.latitude ?? location.Locations?.[0]?.Latitude);

const getLocationLongitude = (location: LocationItem) =>
  toFormText(location.longitude ?? location.Longitude ?? location.Locations?.[0]?.longitude ?? location.Locations?.[0]?.Longitude);

const getDeviceCode = (location: LocationItem) =>
  toFormText(location.deviceCode ?? location.DeviceCode);

const getDeviceName = (location: LocationItem) =>
  toFormText(location.deviceName ?? location.DeviceName ?? getDeviceCode(location));

const getNestedDevices = (item: LocationItem) => {
  if (Array.isArray(item.devices)) return item.devices;
  if (Array.isArray(item.Devices)) return item.Devices;
  return [];
};

const flattenLocationItems = (items: LocationItem[]) => items.flatMap((item) => {
  const devices = getNestedDevices(item);
  if (devices.length === 0) return [item];

  return devices.map((device) => ({
    ...item,
    deviceCode: device.deviceCode ?? device.DeviceCode,
    DeviceCode: device.DeviceCode ?? device.deviceCode,
    deviceName: device.deviceName ?? device.DeviceName,
    DeviceName: device.DeviceName ?? device.deviceName,
    deviceType: device.deviceType ?? device.DeviceType,
    DeviceType: device.DeviceType ?? device.deviceType,
    serialNo: device.serialNo ?? device.SerialNo,
    SerialNo: device.SerialNo ?? device.serialNo,
    active: device.active ?? device.Active,
    Active: device.Active ?? device.active,
    busy: device.busy ?? device.Busy,
    Busy: device.Busy ?? device.busy,
    inUse: device.inUse ?? device.InUse,
    InUse: device.InUse ?? device.inUse,
    isInUse: device.isInUse ?? device.IsInUse,
    IsInUse: device.IsInUse ?? device.isInUse,
    devices: undefined,
    Devices: undefined,
  }));
});

const isTruthyFlag = (value: boolean | string | number | null | undefined) =>
  value === true || value === 'true' || value === 1 || value === '1';

const isLocationCameraInUse = (location: LocationItem) =>
  isTruthyFlag(
    location.inUse ??
    location.InUse ??
    location.isInUse ??
    location.IsInUse ??
    location.busy ??
    location.Busy ??
    location.active ??
    location.Active
  );

const isLocationCameraUnavailable = (location: LocationItem) => isLocationCameraInUse(location);

const getCameraUnavailableLabel = (location: LocationItem, language: SpotCheckLanguage) => {
  if (isLocationCameraInUse(location)) return language === 'th' ? 'ใช้งานอยู่' : 'In use';
  return language === 'th' ? 'ไม่พร้อมใช้งาน' : 'Unavailable';
};

// ==========================================
// Form Modal (เพิ่ม/แก้ไข ภารกิจ)
// ==========================================
export function SpotCheckFormModal({ show, isEdit, onClose, translations, language, darkMode, formData, setFormData, onSubmit }: FormModalProps) {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [officers, setOfficers] = useState<OfficerItem[]>([]);
  const [copiedCoordinates, setCopiedCoordinates] = useState('');
  const matchesFormLocation = (location: LocationItem) => (
    (formData.locationCode !== '' && getLocationCode(location) === formData.locationCode) ||
    (formData.locationId !== '' && getLocationId(location) === formData.locationId)
  );
  const selectedCamera = locations.find((location) => (
    matchesFormLocation(location) &&
    getDeviceCode(location) === formData.deviceCode
  ));
  const isSelectedCameraUnavailable = selectedCamera ? isLocationCameraUnavailable(selectedCamera) : false;
  const selectedLocation = locations.find(matchesFormLocation);
  const selectedLocationId = formData.locationId !== ''
    ? formData.locationId
    : selectedLocation
      ? getLocationId(selectedLocation) ?? ''
      : '';
  const selectedLocationCode = formData.locationCode || (selectedLocation ? getLocationCode(selectedLocation) : '');
  const hasSelectedLocation = selectedLocationCode !== '' || selectedLocationId !== '';
  const locationOptions = locations.filter((location, index, list) => (
    list.findIndex((item) => getLocationCode(item) === getLocationCode(location)) === index
  ));
  const locationCameras = hasSelectedLocation
    ? locations.filter((location) => (
      (selectedLocationCode !== '' && getLocationCode(location) === selectedLocationCode) ||
      (selectedLocationId !== '' && getLocationId(location) === selectedLocationId)
    )).filter((location, index, list) => {
      const deviceCode = getDeviceCode(location);
      return deviceCode !== '' && list.findIndex((item) => getDeviceCode(item) === deviceCode) === index;
    })
    : [];
  const coordinatesValue = formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : '';
  const coordinateCopySuccess = Boolean(coordinatesValue) && copiedCoordinates === coordinatesValue;
  const inputClassName = fieldClass(darkMode);
  const selectClassName = `${inputClassName} appearance-none pr-10`;
  const readOnlyInputClassName = readOnlyFieldClass(darkMode);
  const timeRangeOrderErrorMessage = language === 'th'
    ? 'เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น'
    : 'End time cannot be earlier than start time';
  const missionTimeRangeInvalid = isMissionEndTimeBeforeStartTime(formData);
  const missionStartTimeMissing = !formData.startTime;
  // New work orders can't be backdated: the start day must be today or later.
  // Editing an existing mission is exempt so saved past start times still load.
  const minMissionStartDateTime = getMinMissionStartDateTime();
  const missionStartDateInPast = !isEdit && isMissionStartDateInPast(formData.startTime);
  const startTimeRequiredMessage = language === 'th'
    ? 'กรุณาระบุเวลาเริ่มต้น'
    : 'Please specify a start time';
  const startDateInPastMessage = language === 'th'
    ? 'ไม่สามารถสร้างใบงานย้อนหลังได้ กรุณาเลือกวันที่เริ่มเป็นวันปัจจุบันหรือหลังจากนี้'
    : 'Work orders cannot be backdated. Choose a start date of today or later.';
  const requiredInputMessage = language === 'th'
    ? 'กรุณากรอกข้อมูลในช่องนี้'
    : 'Please fill out this field';
  const requiredSelectMessage = language === 'th'
    ? 'กรุณาเลือกรายการ'
    : 'Please select an item';
  const requiredValidity = (message: string) => {
    // Keep the localized message while empty; clear it once filled so the
    // browser stops treating the field as invalid (and never falls back to
    // its English default on hover/submit).
    const apply = (el: HTMLInputElement | HTMLSelectElement | null) => {
      if (el) el.setCustomValidity(el.value ? '' : message);
    };
    const onEvent = (event: React.FormEvent<HTMLInputElement | HTMLSelectElement>) => apply(event.currentTarget);
    // ref runs on mount and every render, so the message is localized from the
    // first paint and updates immediately when the language changes.
    return { ref: apply, onInvalid: onEvent, onInput: onEvent };
  };
  const missionNameTooLong = formData.missionName.length > MISSION_NAME_MAX_LENGTH;
  const noteTooLong = formData.note.length > NOTE_MAX_LENGTH;
  const textLengthInvalid = missionNameTooLong || noteTooLong;
  const submitDisabled = isSelectedCameraUnavailable || missionStartTimeMissing || missionStartDateInPast || missionTimeRangeInvalid || textLengthInvalid;
  const formatCharacterCount = (length: number, maxLength?: number) => (
    maxLength == null
      ? `${length} ${language === 'th' ? 'ตัวอักษร' : 'characters'}`
      : `${length}/${maxLength}`
  );
  const characterCounterClass = (isOverLimit: boolean) =>
    `mt-1.5 text-right text-xs ${isOverLimit ? 'font-medium text-red-500' : darkMode ? 'text-slate-500' : 'text-slate-400'}`;
  const disabledSelectClassName = `h-11 w-full appearance-none rounded-md border px-3.5 pr-10 text-sm outline-none transition-colors cursor-not-allowed opacity-60 ${
    darkMode
      ? 'border-slate-800 bg-slate-900 text-slate-500'
      : 'border-slate-200 bg-slate-100 text-slate-400'
  }`;
  const selectChevronClassName = `pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`;

  useEffect(() => {
    if (!show) return;
    Promise.allSettled([
      getLocations<LocationItem>(),
      getReports<LocationItem>(),
    ])
      .then(([locationResult, reportResult]) => {
        if (locationResult.status === 'rejected') {
          console.error('Failed to fetch locations:', locationResult.reason);
        }
        if (reportResult.status === 'rejected') {
          console.error('Failed to fetch reports for location cameras:', reportResult.reason);
        }

        const items = flattenLocationItems([
          ...(locationResult.status === 'fulfilled' ? locationResult.value : []),
          ...(reportResult.status === 'fulfilled' ? reportResult.value : []),
        ]);

        setLocations(items);
        setFormData((current) => {
          if (current.locationCode || !current.locationId) return current;
          const selected = items.find((item) => getLocationId(item) === current.locationId);
          return selected
            ? {
              ...current,
              locationCode: getLocationCode(selected),
              locationName: current.locationName || getLocationName(selected),
              latitude: current.latitude || getLocationLatitude(selected),
              longitude: current.longitude || getLocationLongitude(selected),
            }
            : current;
        });
      })
      .catch(err => console.error('Failed to prepare location cameras:', err));
    getOfficers<OfficerItem>()
      .then(setOfficers)
      .catch(err => console.error('Failed to fetch officers:', err));
  }, [show, setFormData]);

  const copyCoordinates = () => {
    if (!coordinatesValue) return;

    const setSuccess = () => {
      setCopiedCoordinates(coordinatesValue);
      window.setTimeout(() => {
        setCopiedCoordinates((current) => current === coordinatesValue ? '' : current);
      }, 1800);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(coordinatesValue).then(setSuccess).catch((err) => {
        console.error('Failed to copy coordinates:', err);
      });
      return;
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = coordinatesValue;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setSuccess();
    } catch (err) {
      console.error('Failed to copy coordinates:', err);
    }
  };

  if (!show) return null;

  return (
    // No backdrop onClick here on purpose: clicking outside must NOT close the
    // add/edit form, so a stray click can't discard everything the user typed.
    // Use the header X or the Cancel button to close instead.
    <div className={modalBackdropClass(darkMode)}>
      <div className={modalSurfaceClass(darkMode, 'max-w-6xl')}>
        <div className={`${modalHeaderClass(darkMode)} flex items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isEdit ? darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600' : darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
              {isEdit ? <Edit className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>{isEdit ? translations.editRecord : translations.addNewSpotCheck}</h2>
              <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{isEdit ? `แก้ไขรหัส ${formData.reportId}` : 'กรอกข้อมูลภารกิจใหม่'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={modalCloseButtonClass(darkMode)}
            aria-label={translations.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={modalBodyClass(darkMode)}>
          <div>
            <form
              onSubmit={(event) => {
                if (isSelectedCameraUnavailable) {
                  event.preventDefault();
                  return;
                }
                if (missionStartTimeMissing) {
                  event.preventDefault();
                  return;
                }
                if (missionTimeRangeInvalid) {
                  event.preventDefault();
                  return;
                }
                if (textLengthInvalid) {
                  event.preventDefault();
                  return;
                }
                onSubmit(event);
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className={`self-start overflow-hidden rounded-lg border shadow-sm lg:sticky lg:top-0 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                  <div className={`border-b px-4 py-5 ${darkMode ? 'border-slate-800 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
                    <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isEdit ? translations.editRecord : translations.addNewSpotCheck}
                    </p>
                    <p className={`mt-1 truncate font-mono text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formData.reportId || '-'}
                    </p>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <div className="flex items-center gap-2">
                        <User className={`h-4 w-4 ${darkMode ? 'text-amber-300' : 'text-amber-600'}`} />
                        <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ผู้รับผิดชอบ</p>
                      </div>
                      <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formData.officerName || '-'}</p>
                    </div>
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-4 w-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                        <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.location}</p>
                      </div>
                      <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formData.locationName || '-'}</p>
                    </div>
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <div className="flex items-center gap-2">
                        <Video className={`h-4 w-4 ${darkMode ? 'text-sky-300' : 'text-sky-600'}`} />
                        <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.camera}</p>
                      </div>
                      <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{selectedCamera ? getDeviceName(selectedCamera) : formData.deviceCode || '-'}</p>
                    </div>
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
                        <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.durationHours}</p>
                      </div>
                      <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {formData.duration > 0 ? `${Math.floor(formData.duration / 60)} ชม. ${formData.duration % 60} นาที` : '-'}
                      </p>
                    </div>
                    <div className={`rounded-md border px-3 py-2 text-xs ${isSelectedCameraUnavailable
                      ? darkMode
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                      : darkMode
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {isSelectedCameraUnavailable
                        ? (selectedCamera
                          ? (language === 'th'
                            ? `กล้อง${getCameraUnavailableLabel(selectedCamera, language)}`
                            : `Camera ${getCameraUnavailableLabel(selectedCamera, language).toLowerCase()}`)
                          : (language === 'th' ? 'กล้องไม่พร้อมใช้งาน' : 'Camera unavailable'))
                        : (language === 'th' ? 'พร้อมบันทึกเมื่อกรอกครบ' : 'Ready when required fields are complete')}
                    </div>
                  </div>
                </aside>

                <div className="space-y-5">
                {/* Section: ข้อมูลภารกิจ */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    <Edit className="w-4 h-4" /> ข้อมูลภารกิจ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{translations.taskCode} <span className="text-red-500">*</span></label>
                      <input type="text" required value={formData.reportId} readOnly className={`${readOnlyInputClassName} font-mono`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{translations.taskPriority} <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })} className={`${selectClassName} cursor-pointer`}>
                          <option value="low">{translations.priorityLow}</option>
                          <option value="medium">{translations.priorityMedium}</option>
                          <option value="high">{translations.priorityHigh}</option>
                        </select>
                        <ChevronDown className={selectChevronClassName} />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>ผู้รับผิดชอบ <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select required {...requiredValidity(requiredSelectMessage)} value={formData.officerId} onChange={(e) => { const selected = officers.find(o => o.officerId === Number(e.target.value)); setFormData({ ...formData, officerId: e.target.value ? Number(e.target.value) : '', officerName: selected?.officerName || '' }); }} className={`${selectClassName} cursor-pointer`}>
                          <option value="">{translations.selectOfficer}</option>
                          {officers.map(o => <option key={o.officerId} value={o.officerId}>{o.officerName}</option>)}
                        </select>
                        <ChevronDown className={selectChevronClassName} />
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{translations.taskTitleDesc} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        {...requiredValidity(requiredInputMessage)}
                        maxLength={MISSION_NAME_MAX_LENGTH}
                        value={formData.missionName}
                        aria-invalid={missionNameTooLong}
                        onChange={(e) => setFormData({ ...formData, missionName: e.target.value })}
                        placeholder={translations.enterTaskDesc}
                        className={`${inputClassName} ${missionNameTooLong ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      />
                      <p className={characterCounterClass(missionNameTooLong)}>
                        {formatCharacterCount(formData.missionName.length, MISSION_NAME_MAX_LENGTH)}
                      </p>
                    </div>
                    <div className="md:col-span-3">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{translations.taskDesc} <span className="text-red-500">*</span></label>
                      <input type="text" required {...requiredValidity(requiredInputMessage)} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={translations.enterDesc} className={inputClassName} />
                      <p className={characterCounterClass(false)}>
                        {formatCharacterCount(formData.description.length)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: สถานที่และกล้อง */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <MapPin className="w-4 h-4" /> สถานที่และกล้อง
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{translations.location} <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select required {...requiredValidity(requiredSelectMessage)} value={selectedLocationCode} onChange={(e) => {
                          const selected = locations.find(l => getLocationCode(l) === e.target.value);
                          const locationId = selected ? getLocationId(selected) : undefined;
                          setFormData({
                            ...formData,
                            locationId: locationId ?? '',
                            locationCode: selected ? getLocationCode(selected) : '',
                            locationName: selected ? getLocationName(selected) : '',
                            latitude: selected ? getLocationLatitude(selected) : '',
                            longitude: selected ? getLocationLongitude(selected) : '',
                            deviceCode: '',
                          });
                        }} className={`${selectClassName} cursor-pointer`}>
                          <option value="">{translations.locationName}</option>
                          {locationOptions.map(l => <option key={getLocationCode(l)} value={getLocationCode(l)}>{getLocationName(l) || getLocationCode(l)}</option>)}
                        </select>
                        <ChevronDown className={selectChevronClassName} />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}><Video className="w-4 h-4 inline mr-1" />{translations.camera} <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                          required
                          {...requiredValidity(requiredSelectMessage)}
                          disabled={!hasSelectedLocation}
                          value={formData.deviceCode}
                          onChange={(e) => {
                            const selected = locationCameras.find((location) => getDeviceCode(location) === e.target.value);
                            if (selected && isLocationCameraUnavailable(selected)) {
                              setFormData({ ...formData, deviceCode: '' });
                              return;
                            }
                            setFormData({ ...formData, deviceCode: e.target.value });
                          }}
                          className={hasSelectedLocation ? `${selectClassName} cursor-pointer` : disabledSelectClassName}
                        >
                          <option value="">{translations.camera}</option>

                          {locationCameras
                            .map((l) => {
                              const deviceCode = getDeviceCode(l);
                              if (!deviceCode) return null;
                              const unavailable = isLocationCameraUnavailable(l);
                              return (
                                <option
                                  key={`${getLocationCode(l)}-${deviceCode}`}
                                  value={deviceCode}
                                  disabled={unavailable}
                                >
                                  {unavailable ? `${getDeviceName(l)} - ${getCameraUnavailableLabel(l, language)}` : getDeviceName(l)}
                                </option>
                              );
                            })}
                        </select>
                        <ChevronDown className={selectChevronClassName} />
                      </div>
                      {isSelectedCameraUnavailable && (
                        <div className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs font-medium ${darkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{language === 'th' ? 'กล้องนี้ไม่พร้อมใช้งาน ไม่สามารถบันทึกงานใหม่ได้' : 'This camera is unavailable. Saving is disabled.'}</span>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {language === 'th' ? 'พิกัด' : 'Coordinates'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={coordinatesValue}
                          placeholder="—"
                          className={`${readOnlyInputClassName} min-w-0 flex-1 font-mono`}
                        />
                        <button
                          type="button"
                          onClick={copyCoordinates}
                          disabled={!coordinatesValue}
                          className={`inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-3 transition-all ${
                            !coordinatesValue
                              ? darkMode
                                ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                              : coordinateCopySuccess
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : darkMode
                                  ? 'cursor-pointer border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                                  : 'cursor-pointer border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                          title={translations.copyCoordinates}
                          aria-label={translations.copyCoordinates}
                        >
                          {coordinateCopySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className={`mt-1.5 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {coordinateCopySuccess
                          ? (language === 'th' ? 'คัดลอกพิกัดแล้ว' : 'Coordinates copied')
                          : (language === 'th' ? 'รูปแบบ: latitude, longitude' : 'Format: latitude, longitude')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: ระยะเวลา */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                    <Clock className="w-4 h-4" /> ระยะเวลา
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>เวลาเริ่ม <span className="text-red-500">*</span></label>
                      <input type="datetime-local" required {...requiredValidity(startTimeRequiredMessage)} aria-invalid={missionStartTimeMissing || missionStartDateInPast} min={!isEdit ? minMissionStartDateTime : undefined} value={formData.startTime} onChange={(e) => {
                        const newStartTime = e.target.value;
                        let duration = 0;
                        if (newStartTime && formData.endTime) {
                          const start = new Date(newStartTime);
                          const end = new Date(formData.endTime);
                          duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
                        }
                        setFormData({ ...formData, startTime: newStartTime, duration });
                      }} className={`${inputClassName} ${missionStartTimeMissing || missionStartDateInPast ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${darkMode ? 'scheme-dark' : ''}`} />
                      {missionStartTimeMissing && (
                        <p className="mt-1.5 text-xs font-medium text-red-500">
                          {startTimeRequiredMessage}
                        </p>
                      )}
                      {missionStartDateInPast && (
                        <p className="mt-1.5 text-xs font-medium text-red-500">
                          {startDateInPastMessage}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>เวลาสิ้นสุด</label>
                      <input
                        type="datetime-local"
                        value={formData.endTime}
                        min={formData.startTime || undefined}
                        aria-invalid={missionTimeRangeInvalid}
                        onChange={(e) => {
                          const newEndTime = e.target.value;
                          let duration = 0;
                          if (formData.startTime && newEndTime) {
                            const start = new Date(formData.startTime);
                            const end = new Date(newEndTime);
                            duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
                          }
                          setFormData({ ...formData, endTime: newEndTime, duration });
                        }}
                        className={`${inputClassName} ${missionTimeRangeInvalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${darkMode ? 'scheme-dark' : ''}`}
                      />
                      {missionTimeRangeInvalid && (
                        <p className="mt-1.5 text-xs font-medium text-red-500">
                          {timeRangeOrderErrorMessage}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{translations.durationHours}</label>
                      <div className={`${readOnlyInputClassName} flex items-center justify-center`}>
                        <span className={`text-sm font-medium ${formData.duration > 0 ? (darkMode ? 'text-white' : 'text-slate-700') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                          {formData.duration > 0 ? `${Math.floor(formData.duration / 60)} ชั่วโมง ${formData.duration % 60} นาที` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: หมายเหตุ */}
                <div className={sectionClass(darkMode)}>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{translations.additionalNotes}</label>
                  <textarea
                    value={formData.note}
                    maxLength={NOTE_MAX_LENGTH}
                    aria-invalid={noteTooLong}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder={translations.enterAdditionalNotes}
                    rows={3}
                    className={`${inputClassName} h-auto resize-none py-2.5 ${noteTooLong ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <p className={characterCounterClass(noteTooLong)}>
                    {formatCharacterCount(formData.note.length, NOTE_MAX_LENGTH)}
                  </p>
                </div>
                </div>
              </div>

              <div className={`${modalFooterClass(darkMode)} -mx-6 -mb-5 flex flex-wrap items-center gap-2 justify-end`}>
                <button type="button" onClick={onClose} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  <X className="h-4 w-4" /> <span>{translations.cancel}</span>
                </button>
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors ${submitDisabled
                    ? 'cursor-not-allowed bg-slate-400 opacity-70'
                    : `cursor-pointer ${isEdit ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'}`
                    }`}
                >
                  {isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>{translations.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// View Modal (ดูรายละเอียด)
// ==========================================
export function ViewModal({ show, item, onClose, translations, language, darkMode, getStatusColor, getPriorityColor, copyToClipboard, copySuccess, handleAction, canUseActions }: ViewModalProps) {
  if (!show || !item) return null;
  
  const formatDateTime = (dateStr: string) => {
    if (!dateStr?.includes('T')) return { date: dateStr, time: dateStr };
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const startDateTime = formatDateTime(item.startTime);
  const endDateTime = item.endTime ? formatDateTime(item.endTime) : null;
  const priorityLabel = item.priority === 'high'
    ? translations.priorityHigh
    : item.priority === 'medium'
      ? translations.priorityMedium
      : translations.priorityLow;
  const priorityDotClass = item.priority === 'high'
    ? 'bg-rose-500'
    : item.priority === 'medium'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className={modalBackdropClass(darkMode)}>
      <div className={modalSurfaceClass(darkMode, 'max-w-6xl')}>
        {/* Header */}
        <div className={`${modalHeaderClass(darkMode)} flex items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${darkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>
              <Eye className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>{translations.viewDetails}</h2>
              <p className={`mt-1 font-mono text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.reportId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={modalCloseButtonClass(darkMode)}
            aria-label={translations.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={modalBodyClass(darkMode)}>
          <div>
            {/* Status Hero */}
            <div className={`mb-5 overflow-hidden rounded-xl border shadow-sm ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <div className={`h-1.5 ${priorityDotClass}`} />
              <div className="p-5">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.tableTitle}</p>
                    <h3 className={`mt-1 text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>{item.missionName}</h3>
                    <p className={`mt-2 max-w-3xl text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.description || item.location || item.reportId}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.tableStatus}</p>
                      <span className={`mt-2 inline-flex rounded-md border px-3 py-1.5 text-sm font-bold ${getStatusColor(item.status)}`}>
                        {item.statusText}
                      </span>
                    </div>
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.priority}</p>
                      <span className={`mt-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold ${getPriorityColor(item.priority)}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${priorityDotClass}`} />
                        {priorityLabel}
                      </span>
                    </div>
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.tableOfficer}</p>
                      <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.officerName || '-'}</p>
                    </div>
                    <div className={`p-3 ${mutedPanelClass(darkMode)}`}>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.camera}</p>
                      <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.deviceName || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              {/* Left Column - Time & Location */}
              <div className="space-y-4">
                {/* Date & Time Card */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`mb-4 flex items-center gap-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                    <Calendar className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} /> {translations.date} & {translations.time}
                  </h4>
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 ${mutedPanelClass(darkMode)}`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <Clock className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>เริ่มงาน</p>
                        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{startDateTime.date}</p>
                        <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{startDateTime.time}</p>
                      </div>
                    </div>
                    {endDateTime && (
                      <div className={`flex items-center gap-3 p-3 ${mutedPanelClass(darkMode)}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <Clock className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>สิ้นสุด</p>
                          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{endDateTime.date}</p>
                          <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{endDateTime.time}</p>
                        </div>
                      </div>
                    )}
                    {item.duration != null && item.duration > 0 && (
                      <div className={`flex items-center gap-3 p-3 ${mutedPanelClass(darkMode)}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <Clock className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>ระยะเวลา</p>
                          <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {Math.floor(item.duration / 60) > 0 ? `${Math.floor(item.duration / 60)} ชั่วโมง ` : ''}{item.duration % 60} นาที
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Card */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`mb-4 flex items-center gap-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                    <MapPin className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} /> {translations.location}
                  </h4>
                  <div className={`p-4 ${mutedPanelClass(darkMode)}`}>
                    <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.location || '-'}</p>
                    {item.address && <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.address}</p>}
                  </div>
                </div>
              </div>

              {/* Right Column - Officer, Camera, GPS */}
              <div className="space-y-4">
                {/* Officer & Camera Card */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`mb-4 flex items-center gap-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                    <User className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} /> ผู้รับผิดชอบ & อุปกรณ์
                  </h4>
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 ${mutedPanelClass(darkMode)}`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <User className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.tableOfficer}</p>
                        <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.officerName || '-'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 ${mutedPanelClass(darkMode)}`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <Video className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.camera}</p>
                        <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.deviceName || '-'}</p>
                        {item.deviceCode && (
                          <p className={`mt-0.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>รหัส: {item.deviceCode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates Card */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`mb-4 flex items-center gap-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                    <MapPin className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} /> {translations.gpsCoordinates}
                  </h4>
                  <div className={`p-4 ${mutedPanelClass(darkMode)}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        {item.coordinates ? (
                          <>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Latitude</p>
                                <p className={`font-mono text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {item.coordinates.split(',')[0]?.trim() || '-'}
                                </p>
                              </div>
                              <div>
                                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Longitude</p>
                                <p className={`font-mono text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {item.coordinates.split(',')[1]?.trim() || '-'}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>ไม่มีข้อมูลพิกัด</p>
                        )}
                      </div>
                      {item.coordinates && (
                        <div className="relative">
                          <button 
                            onClick={() => copyToClipboard(item.coordinates)} 
                            className={`flex h-11 w-11 items-center justify-center rounded-md transition-all cursor-pointer ${copySuccess ? 'bg-emerald-600 text-white' : darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`} 
                            title={translations.copyCoordinates}
                            aria-label={translations.copyCoordinates}
                          >
                            {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          {copySuccess && (
                            <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap shadow-lg z-50 ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'}`}>
                              {translations.copied}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description Card */}
                {item.description && (
                  <div className={sectionClass(darkMode)}>
                    <h4 className={`mb-3 flex items-center gap-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                      <FileText className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} /> รายละเอียดเพิ่มเติม
                    </h4>
                    <p className={`text-sm leading-6 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{item.description}</p>
                  </div>
                )}

                {/* Note Card */}
                <div className={sectionClass(darkMode)}>
                  <h4 className={`mb-3 flex items-center gap-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                    <FileText className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} /> หมายเหตุ
                  </h4>
                  <div className={`p-4 ${mutedPanelClass(darkMode)}`}>
                    <p className={`text-sm leading-6 ${item.note ? (darkMode ? 'text-slate-200' : 'text-slate-700') : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                      {item.note || 'ไม่มีหมายเหตุ'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`${modalFooterClass(darkMode)} -mx-6 -mb-5 mt-5`}>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {canUseActions && (item.status === 'waiting' || item.status === 'emergency') && (
                  <>
                    <button onClick={() => handleAction('accept')} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors ${item.status === 'emergency' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                      <CheckCircle className="h-4 w-4" /><span>{item.status === 'emergency' ? 'รับงานฉุกเฉิน' : translations.acceptJob}</span>
                    </button>
                    <button onClick={() => handleAction('reject')} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      <XCircle className="h-4 w-4" /><span>{translations.rejectJob}</span>
                    </button>
                  </>
                )}
                {canUseActions && item.status === 'accepted' && (
                  <>
                    <button onClick={() => handleAction('start')} className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
                      <PlayCircle className="h-4 w-4" /><span>{translations.startJob}</span>
                    </button>
                    <button onClick={() => handleAction('reject')} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      <XCircle className="h-4 w-4" /><span>{translations.rejectJob}</span>
                    </button>
                  </>
                )}
                {canUseActions && (item.status === 'in-progress' || item.status === 'emergency-in-progress') && (
                  <>
                    <button onClick={() => handleAction('complete')} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors ${item.status === 'emergency-in-progress' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-violet-600 hover:bg-violet-500'}`}>
                      <StopCircle className="h-4 w-4" /><span>{translations.completeJob}</span>
                    </button>
                    <button onClick={() => handleAction('reject')} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      <XCircle className="h-4 w-4" /><span>{translations.rejectJob}</span>
                    </button>
                  </>
                )}
                <button onClick={onClose} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  <X className="h-4 w-4" /><span>{translations.close}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Delete Modal (ยืนยันการลบ)
// ==========================================
export function DeleteModal({ show, item, onClose, onConfirm, translations, darkMode }: DeleteModalProps) {
  if (!show || !item) return null;
  return (
    <div className={modalBackdropClass(darkMode)}>
      <div className={modalSurfaceClass(darkMode, 'max-w-md')}>
        <div className={`${modalHeaderClass(darkMode)} flex items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>{translations.deleteConfirm}</h2>
          </div>
          <button onClick={onClose} className={modalCloseButtonClass(darkMode)} aria-label={translations.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={modalBodyClass(darkMode)}>
          <div className={sectionClass(darkMode)}>
            <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{translations.deleteMessage}</p>
            <p className={`text-sm mt-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.recordLabel} <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{item.reportId}</span></p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.inspectionLabel} <span className={`font-normal ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.missionName}</span></p>
          </div>
        </div>
        <div className={`${modalFooterClass(darkMode)} flex items-center justify-end gap-2`}>
          <button onClick={onClose} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><X className="h-4 w-4" /><span>{translations.cancel}</span></button>
          <button onClick={onConfirm} className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-500"><Trash2 className="h-4 w-4" /><span>{translations.confirm}</span></button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Action Modal (กดรับงาน/เริ่ม/เสร็จสิ้น)
// ==========================================
export function ActionModal({ show, item, actionType, onClose, onConfirm, translations, darkMode }: ActionModalProps) {
  if (!show || !item || !actionType) return null;
  return (
    <div className={modalBackdropClass(darkMode)}>
      <div className={modalSurfaceClass(darkMode, 'max-w-md')}>
        <div className={`${modalHeaderClass(darkMode)} flex items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              actionType === 'accept'
                ? darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'
                : actionType === 'start'
                  ? darkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'
                  : actionType === 'complete'
                    ? darkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'
                    : darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'
            }`}>
              {actionType === 'accept' && <CheckCircle className="h-6 w-6" />}
              {actionType === 'start' && <PlayCircle className="h-6 w-6" />}
              {actionType === 'complete' && <StopCircle className="h-6 w-6" />}
              {actionType === 'reject' && <XCircle className="h-6 w-6" />}
            </div>
            <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>
              {actionType === 'accept' && translations.acceptJobConfirm}
              {actionType === 'start' && translations.startJobConfirm}
              {actionType === 'complete' && translations.completeJobConfirm}
              {actionType === 'reject' && translations.rejectJobConfirm}
            </h2>
          </div>
          <button onClick={onClose} className={modalCloseButtonClass(darkMode)} aria-label={translations.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={modalBodyClass(darkMode)}>
          <div className={sectionClass(darkMode)}>
            <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {actionType === 'accept' && translations.acceptJobMessage}
              {actionType === 'start' && translations.startJobMessage}
              {actionType === 'complete' && translations.completeJobMessage}
              {actionType === 'reject' && translations.rejectJobMessage}
            </p>
            <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.recordLabel} <span className="font-semibold">{item.reportId}</span></p>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.missionName}</p>
          </div>
        </div>
        <div className={`${modalFooterClass(darkMode)} flex items-center justify-end gap-2`}>
          <button onClick={onClose} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><X className="h-4 w-4" /><span>{translations.cancel}</span></button>
          <button onClick={onConfirm} className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors ${actionType === 'accept' ? 'bg-emerald-600 hover:bg-emerald-500' : actionType === 'start' ? 'bg-blue-600 hover:bg-blue-500' : actionType === 'complete' ? 'bg-violet-600 hover:bg-violet-500' : 'bg-rose-600 hover:bg-rose-500'}`}>
            {actionType === 'accept' && <CheckCircle className="h-4 w-4" />}
            {actionType === 'start' && <PlayCircle className="h-4 w-4" />}
            {actionType === 'complete' && <StopCircle className="h-4 w-4" />}
            {actionType === 'reject' && <XCircle className="h-4 w-4" />}
            <span>{translations.confirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Success Modal (แจ้งเตือนสร้างสำเร็จ)
// ==========================================
export function SuccessModal({ show, onClose, darkMode, reportId, missionName }: SuccessModalProps) {
  if (!show) return null;
  return (
    <div className={modalBackdropClass(darkMode)}>
      <div className={modalSurfaceClass(darkMode, 'max-w-md')}>
        <div className={`${modalHeaderClass(darkMode)} flex items-center justify-center`}>
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
            <CheckCircle className="h-8 w-8" />
          </div>
        </div>
        <div className={`${modalBodyClass(darkMode)} text-center`}>
          <h2 className={`mb-2 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
            สร้างใบงานสำเร็จ
          </h2>
          <p className={`mb-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ใบงานถูกสร้างเรียบร้อยแล้ว
          </p>
          <div className={sectionClass(darkMode)}>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>รหัสงาน</p>
            <p className={`font-mono text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{reportId}</p>
            <p className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{missionName}</p>
          </div>
        </div>
        <div className={modalFooterClass(darkMode)}>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <CheckCircle className="h-4 w-4" />
            <span>ตกลง</span>
          </button>
        </div>
      </div>
    </div>
  );
}
