interface MissionLocationSelection {
  locationId: number | '';
  locationCode: string;
}

export const buildMissionLocationPayload = ({ locationCode }: MissionLocationSelection) => ({
  locationCode: locationCode || null,
});
