const axios = require('axios');
require('dotenv').config();

const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;

// Get the Last Question Asked and the Level
const checkAppointmentExist = async (date, time) => {

    url = `https://api.airtable.com/v0/${APP_ID}/Appointments?view=Grid%20view&filterByFormula=(AND({Appointment Date}="${date}", {Appointment Time}="${time}"))&maxRecords=1`;
    headers = {
        Authorization: `Bearer ${API_KEY}`
    }
    
    let response = await axios.get(url, {headers});
    let records = response['data']['records'];

    let len = records.length;

    return len;
};

const insertAppointment = async (fields) => {

    url = `https://api.airtable.com/v0/${APP_ID}/Appointments`;
    headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    }

    let response = await axios.post(url, {fields}, {headers});

    if (response.status == 200) {
        return 1;
    } else {
        return 0;
    }
};

module.exports = {
    checkAppointmentExist,
    insertAppointment
}