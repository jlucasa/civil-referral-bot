const {google} = require('googleapis');
const express = require('express');
require('dotenv').config();

const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

exports.handleNewSubscriber = (req, res) => {
    const jwt = getJwt();
    const apiKey = getApiKey();
    const spreadsheetId = process.env.SHEETID;
    const range = 'Testing Sheet!A1:E5';

    try {
        const result = getRows(jwt, apiKey, spreadsheetId, range);
        res.status(200).type('text/plain').send(result);
    } catch (err) {
        res.status(500).send(err);
    }    
}

function getJwt() {
    const credentials = require('./credentials.json');
    return new google.auth.JWT(
        credentials.client_email, 
        null,
        credentials.private_key,
        SCOPE
    )
}

function getApiKey() {
    return require('./apikey.json').key;
}

function getRows(jwt, apiKey, spreadsheetId, range, row) {
    const sheets = google.sheets('v4');
    sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        auth: jwt,
        key: apiKey,
        valueInputOption: 'RAW',
        range: range,
        requestBody: {
            values: [row]
        }
    }, function (err, result) {
        if (err) {
            throw err;
        } else {
            return `Updated sheet: ${result.data.updates.updatedRange}`;
        }   
    });
}