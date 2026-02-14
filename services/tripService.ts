import { collection, getDocs, query, orderBy, doc, getDoc, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trip, TripStatus } from '@/types/trip';

export class TripService {
  private static COLLECTION = 'trips';

  /**
   * Fetch all trips from Firestore
   */
  static async getAllTrips(limitCount?: number): Promise<Trip[]> {
    try {
      const tripsRef = collection(db, this.COLLECTION);
      let q = query(tripsRef, orderBy('startTime', 'desc'));
      
      if (limitCount) {
        q = query(tripsRef, orderBy('startTime', 'desc'), limit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.mapDocToTrip(doc.data(), doc.id));
    } catch (error) {
      console.error('Error fetching trips:', error);
      throw error;
    }
  }

  /**
   * Fetch a single trip by ID
   */
  static async getTripById(tripId: string): Promise<Trip | null> {
    try {
      const tripRef = doc(db, this.COLLECTION, tripId);
      const tripDoc = await getDoc(tripRef);
      
      if (!tripDoc.exists()) {
        return null;
      }

      return this.mapDocToTrip(tripDoc.data(), tripDoc.id);
    } catch (error) {
      console.error('Error fetching trip:', error);
      throw error;
    }
  }

  /**
   * Fetch trips by driver ID
   */
  static async getTripsByDriver(driverId: string): Promise<Trip[]> {
    try {
      const tripsRef = collection(db, this.COLLECTION);
      const q = query(
        tripsRef,
        where('driverId', '==', driverId),
        orderBy('startTime', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.mapDocToTrip(doc.data(), doc.id));
    } catch (error) {
      console.error('Error fetching driver trips:', error);
      throw error;
    }
  }

  /**
   * Map Firestore document to Trip object
   */
  private static mapDocToTrip(data: any, id: string): Trip {
    return {
      id: data.id || id,
      driverId: data.driverId || '',
      driverEmail: data.driverEmail || '',
      driverName: data.driverName || '',
      startTime: data.startTime || 0,
      startTimeString: data.startTimeString || '',
      endTime: data.endTime || null,
      endTimeString: data.endTimeString || '',
      routePoints: data.routePoints || [],
      totalDistance: data.totalDistance || 0,
      status: (data.status as TripStatus) || TripStatus.COMPLETED,
    };
  }

  /**
   * Get trip statistics
   */
  static async getTripStats(): Promise<{
    totalTrips: number;
    totalDistance: number;
    averageDistance: number;
  }> {
    try {
      const trips = await this.getAllTrips();
      const totalTrips = trips.length;
      const totalDistance = trips.reduce((sum, trip) => sum + trip.totalDistance, 0);
      const averageDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

      return {
        totalTrips,
        totalDistance,
        averageDistance,
      };
    } catch (error) {
      console.error('Error fetching trip stats:', error);
      throw error;
    }
  }
}
