export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export interface GPSLocation extends GPSCoordinates {
  accuracy: number;
}

export interface GeofenceStatus {
  isInside: boolean;
  distanceFeet: number;
  distanceMiles: number;
  accuracyFeet: number;
  message: string;
}

const EARTH_RADIUS_MILES = 3959;
const FEET_PER_MILE = 5280;
const GEOFENCE_RADIUS_FEET = 500;
const MAX_ACCURACY_FEET = 200;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number;
export function calculateDistance(
  point1: GPSCoordinates,
  point2: GPSCoordinates
): { feet: number; miles: number };
export function calculateDistance(
  lat1OrPoint1: number | GPSCoordinates,
  lng1OrPoint2: number | GPSCoordinates,
  lat2?: number,
  lng2?: number
): number | { feet: number; miles: number } {
  let lat1: number, lng1: number, lat2Value: number, lng2Value: number;

  if (typeof lat1OrPoint1 === 'number' && typeof lng1OrPoint2 === 'number') {
    lat1 = lat1OrPoint1;
    lng1 = lng1OrPoint2;
    lat2Value = lat2!;
    lng2Value = lng2!;
  } else {
    const point1 = lat1OrPoint1 as GPSCoordinates;
    const point2 = lng1OrPoint2 as GPSCoordinates;
    lat1 = point1.latitude;
    lng1 = point1.longitude;
    lat2Value = point2.latitude;
    lng2Value = point2.longitude;
  }

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2Value);
  const deltaLatRad = toRadians(lat2Value - lat1);
  const deltaLonRad = toRadians(lng2Value - lng1);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const miles = EARTH_RADIUS_MILES * c;
  const feet = miles * FEET_PER_MILE;

  if (typeof lat1OrPoint1 === 'number') {
    return feet;
  }

  return { feet, miles };
}

export function checkGeofence(
  currentLocation: GPSLocation,
  targetLocation: GPSCoordinates
): GeofenceStatus {
  const distance = calculateDistance(currentLocation, targetLocation);
  const accuracyFeet = currentLocation.accuracy * 3.28084;

  const isInside = distance.feet <= GEOFENCE_RADIUS_FEET;

  let message: string;
  if (accuracyFeet > MAX_ACCURACY_FEET) {
    message = `Weak GPS signal. Move to open area.`;
  } else if (isInside) {
    message = `✓ At pickup location - GPS confirmed`;
  } else if (distance.miles >= 1) {
    message = `Not at pickup - ${distance.miles.toFixed(1)} miles away`;
  } else {
    message = `Not at pickup - ${Math.round(distance.feet)} ft away`;
  }

  return {
    isInside,
    distanceFeet: distance.feet,
    distanceMiles: distance.miles,
    accuracyFeet,
    message,
  };
}

export function requestLocationPermission(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable location access.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out.'));
            break;
          default:
            reject(new Error('An unknown error occurred.'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export function watchLocation(
  onUpdate: (location: GPSLocation) => void,
  onError: (error: string) => void
): number {
  if (!navigator.geolocation) {
    onError('Geolocation is not supported by your browser');
    return -1;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          onError('Location permission denied');
          break;
        case error.POSITION_UNAVAILABLE:
          onError('Location unavailable');
          break;
        case error.TIMEOUT:
          onError('Location request timed out');
          break;
        default:
          onError('Location error occurred');
          break;
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
}

export function stopWatchingLocation(watchId: number): void {
  if (watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export function formatAccuracy(accuracyMeters: number): string {
  const accuracyFeet = accuracyMeters * 3.28084;
  return `±${Math.round(accuracyFeet)}ft`;
}

export function isAccuracyAcceptable(accuracyMeters: number): boolean {
  const accuracyFeet = accuracyMeters * 3.28084;
  return accuracyFeet <= MAX_ACCURACY_FEET;
}
