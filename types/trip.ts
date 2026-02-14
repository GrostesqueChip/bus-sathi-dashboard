export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
}

export enum TripStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface Trip {
  id: string;
  driverId: string;
  driverEmail: string;
  driverName: string;
  startTime: number;
  startTimeString: string;
  endTime: number | null;
  endTimeString: string;
  routePoints: LocationPoint[];
  totalDistance: number;
  status: TripStatus;
}
