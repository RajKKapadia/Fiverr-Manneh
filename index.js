const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const webApp = express();

webApp.use(bodyParser.urlencoded({
    extended: true
}))

webApp.use(bodyParser.json()); 

const PORT = process.env.PORT;

webApp.get('/', (req, res) => {
    res.send(`Hello World.!`);
});

const OPENTIME = 9;
const CLOSETIME = 21;

const ad = require('./helper-functions/airtable-database');
const gc = require('./helper-functions/google-calender');

// Schedule Appointment Action
const scheduleAppointment = async (req) => {

    let timeString = req['body']['queryResult']['parameters']['time'];
    let dateString = req['body']['queryResult']['parameters']['date'];

    let time = timeString.split('T')[1].substring(0, 5);
    let date = dateString.split('T')[0];

    let outString;
    let responseText = {};

    if (parseInt(time.substring(0, 2)) < OPENTIME || parseInt(time.substring(0, 2)) > CLOSETIME) {
        outString = 'We are open from 9 AM to 9 PM, please choose a time in between.';
        responseText = {'fulfillmentText': outString};
    } else if (parseInt(time.substring(0, 2)) == OPENTIME || parseInt(time.substring(0, 2)) == CLOSETIME) {
        outString = 'Please choose a time after 9 AM and before 9 PM.';
        responseText = {'fulfillmentText': outString};
    } else {
        // Check here with the airtable data
        let len = await ad.checkAppointmentExist(date, time);

        if (len != 3 || len < 3) {
            outString = `We are available on ${date} at ${time}. Do you want to confirm it?`;
            let session = req['body']['session'];
            let context = `${session}/contexts/await-confirmation`;
            let sessionVars = `${session}/contexts/sessionvars`;
            responseText = {
                'fulfillmentText': outString,
                'outputContexts': [{
                    'name': context,
                    'lifespanCount': 1
                }, {
                    'name': sessionVars,
                    'lifespanCount': 50,
                    'parameters': {
                        'time': timeString,
                        'date': dateString
                    }
                }]
            };
        } else {
            
            let availableTimeSlots = await ad.getTimeslots(date);

            if (availableTimeSlots.length == 0) {
                outString = `Sorry, we are not available on ${date} at ${time}.`;
                responseText = {
                    'fulfillmentText': outString
                }
            } else {
                outString = `Sorry, we are not available on ${date} at ${time}. We are free on ${date} at ${availableTimeSlots[0]}, ${availableTimeSlots[1]}, and ${availableTimeSlots[2]}`;
                let session = req['body']['session'];
                let rescheduleAppointment = `${session}/contexts/await-reschedule`;
                let sessionVars = `${session}/contexts/sessionvars`;
                responseText = {
                    'fulfillmentText': outString,
                    'outputContexts': [{
                        'name': rescheduleAppointment,
                        'lifespanCount': 1
                    }, {
                        'name': sessionVars,
                        'lifespanCount': 50,
                        'parameters': {
                            'time': timeString,
                            'date': dateString
                        }
                    }]
                };
            }
        }
    }
    return responseText;
};

// Insert the invent to the calender
const addEventInCalender = async (req) => {
    let responseText = {};

    let outputContexts = req['body']['queryResult']['outputContexts'];
    let name, number, time, date;
    outputContexts.forEach(outputContext => {
        let session = outputContext['name'];
        if (session.includes('/contexts/sessionvars')) {
            name = outputContext['parameters']['given-name'];
            number = outputContext['parameters']['phone-number'];
            time = outputContext['parameters']['time'];
            date = outputContext['parameters']['date'];
        }
    });

    let dateTimeStart = new Date(Date.parse(date.split('T')[0]+'T'+time.split('T')[1].split('-')[0]));
    let dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours()+1));

    let appointmentTimeString = dateTimeStart.toLocaleString(
        'en-US',
        {
            month: 'long', day: 'numeric', hour: 'numeric', timeZone: 'Asia/Kolkata'
        }
    );

    let event = {
        'summary': `Appointment for ${name}.`,
        'description': `Customer mobile number ${number}.`,
        'start': {
            'dateTime': dateTimeStart,
            'timeZone': 'Asia/Kolkata',
        },
        'end': {
            'dateTime': dateTimeEnd,
            'timeZone': 'Asia/Kolkata',
        }
    };

    let flag = await gc.insertEvent(event);

    let fields = {
        'Name': name,
        'Mobile Number': number,
        'Appointment Date': date.split('T')[0],
        'Appointment Time': time.split('T')[1].substring(0, 5)
    }

    let atflag = await ad.insertAppointment(fields);

    if (flag == 1 && atflag == 1) {
        responseText['fulfillmentText'] = `Appointment is set for ${appointmentTimeString}.`;
    } else {
        responseText['fulfillmentText'] = 'An error occured, please try after some time.';
    }

    return responseText;
};

const rescheduleAppointment = async (req) => {

    let timeString = req['body']['queryResult']['parameters']['reTime'];

    outString = `What first name I use to book the appointment?`;
    
    let session = req['body']['session'];
    let sessionVars = `${session}/contexts/sessionvars`;

    responseText = {
        'fulfillmentText': outString,
        'outputContexts': [{
            'name': `${session}/contexts/await-name`,
            'lifespanCount': 1
        }, {
            'name': sessionVars,
            'lifespanCount': 50,
            'parameters': {
                'time': timeString,
            }
        }]
    };

    return responseText;
}

webApp.post('/webhook', async (req, res) => {

    let action = req['body']['queryResult']['action'];
    let responseText = {};
    if (action === 'schedule-appointment') {
        responseText = await scheduleAppointment(req);
    } else if (action === 'user-number-entered') {
        responseText = await addEventInCalender(req);
    } else if (action === 'reschedule-appointment') {
        responseText = await rescheduleAppointment(req);
    }

    res.send(responseText);
});

webApp.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});