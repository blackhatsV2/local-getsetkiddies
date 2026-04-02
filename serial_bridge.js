import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import fetch from 'node-fetch';

// CONFIGURATION
const PORT_PATH = '/dev/ttyUSB0'; // Your Nano's USB Port
const BAUD_RATE = 115200;       // Must match Serial.begin in Arduino
const API_URL = 'http://localhost:3000/api/locations'; // Local Reliable URL

console.log(`Starting Pure Serial Bridge on ${PORT_PATH}...`);

const port = new SerialPort({
    path: PORT_PATH,
    baudRate: BAUD_RATE,
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (data) => {
    console.log(`[Arduino] ${data}`);

    if (data.startsWith('GPS:')) {
        const payload = data.replace('GPS:', '').trim();
        if (payload === "Waiting for fix...") return;

        const coords = payload.split(',');
        if (coords.length === 2) {
            const lat = parseFloat(coords[0]);
            const lon = parseFloat(coords[1]);
            if (!isNaN(lat) && !isNaN(lon)) {
                pushToAPI(lat, lon);
            }
        }
    }
});

async function pushToAPI(latitude, longitude) {
    try {
        const activeRes = await fetch('http://localhost:3000/api/children/get-active');
        const { child_id } = await activeRes.json();

        if (!child_id) {
            console.log("No child selected in dashboard. Click 'Show on Map'.");
            return;
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ child_id, latitude, longitude, source: 'USB' }),
        });
        const result = await response.json();
        console.log(`Update sent for Child ${child_id}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

port.on('error', (err) => {
    console.error(`❌ Serial Error: ${err.message}`);
});
