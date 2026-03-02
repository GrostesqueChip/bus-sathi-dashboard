const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper function to safely clean text for CSVs
const cleanText = (text) => {
  if (!text) return 'Unknown';
  return String(text).replace(/,/g, ' ').trim();
};

async function exportData() {
  console.log("Fetching Drivers...");
  const driversSnap = await db.collection('drivers').get();
  
  const driversMap = {};
  driversSnap.forEach(doc => {
    driversMap[doc.id] = doc.data();
  });

  console.log("Fetching Trips...");
  const tripsSnap = await db.collection('trips').get();

  let csvContent = "tripId,driverId,driverName,region,vehicle,vehicleCapacity,date,timestamp,latitude,longitude,speed\n";
  let pointCount = 0;

  tripsSnap.forEach(doc => {
    const trip = doc.data();
    const tripId = doc.id;
    const driverId = trip.driverId || 'Unknown_ID';
    const driverInfo = driversMap[driverId] || {};

    // 1. NAME CHECK (If name is blank, check if the ID is an email we can use)
    let rawName = trip.driverName || driverInfo.name || driverInfo.fullName || trip.driverEmail || driverInfo.email;
    if (!rawName) {
       rawName = driverId.includes('@') ? driverId : 'Unknown Driver';
    }
    
    // 2. SMART VEHICLE EXTRACTION (Pulls JK02... straight from the Trip ID!)
    let rawVehicle = trip.vehicleNo || driverInfo.vehicle || driverInfo.vehicleNo || driverInfo.busNumber;
    if (!rawVehicle) {
        if (tripId.includes('_')) {
            rawVehicle = tripId.split('_')[0]; // Grabs everything before the first underscore
        } else {
            rawVehicle = 'Unknown';
        }
    }
    
    // 3. REGION & CAPACITY
    let rawRegion = driverInfo.region || trip.region || 'Jammu';
    let rawCapacity = driverInfo.vehicleCapacity || trip.vehicleCapacity || 'Unknown';

    // Clean text
    const finalName = cleanText(rawName);
    const finalVehicle = cleanText(rawVehicle);
    const finalRegion = cleanText(rawRegion);
    const finalCapacity = cleanText(rawCapacity);

    // Get Date
    let tripDate = 'Unknown_Date';
    if (trip.startTime) {
      tripDate = new Date(trip.startTime).toISOString().split('T')[0];
    }

    if (trip.routePoints && Array.isArray(trip.routePoints)) {
      trip.routePoints.forEach(point => {
        if (point.latitude && point.longitude) {
            csvContent += `${tripId},${driverId},${finalName},${finalRegion},${finalVehicle},${finalCapacity},${tripDate},${point.timestamp},${point.latitude},${point.longitude},${point.speed}\n`;
            pointCount++;
        }
      });
    }
  });

  fs.writeFileSync('master_trips.csv', csvContent);
  console.log(`✅ Success! Exported ${pointCount} GPS points to master_trips.csv`);
}

exportData();