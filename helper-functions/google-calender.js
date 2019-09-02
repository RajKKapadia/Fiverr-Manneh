const {google} = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const CREDENTIALS = JSON.parse(fs.readFileSync(process.env.CREDENTIALS));

const SCOPES = 'https://www.googleapis.com/auth/calendar';

const calendarId = process.env.CALENDER_ID;
const calendar = google.calendar({version : "v3"});

const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);

const insertEvent = async (event) => {

    let response = await calendar.events.insert({
        auth: auth,
        calendarId: calendarId,
        resource: event
    });

    if (response['status'] == 200 && response['statusText'] === 'OK') {
        return 1;
    } else {
        return 0;
    }
};

module.exports = {
    insertEvent
}