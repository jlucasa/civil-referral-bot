const {google} = require('googleapis');
const express = require('express');
require('dotenv').config();

const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

exports.handleNewSubscriber = async (req, res) => {
    let merges = req.body.data.merges;

    const jwt = getJwt();
    const apiKey = getApiKey();
    const spreadsheetId = process.env.SHEETID;
    const range = 'Testing Sheet!A1:K1';

    const emailAddress = merges['EMAIL'];
    const rhCode = merges['RH_CODE'];
    const rhRefLink = merges['RH_REFLINK'];
    const rhSubId = merges['RH_SUBID'];
    const rhIsRef = merges['RH_ISREF'];
    const rhTotRef = merges['RH_TOTREF'];
    const rhLastRef = merges['RH_LASTREF'];
    const rhIsShare = merges['RH_ISSHARE'];
    const rhSharer = merges['RH_SHARER'];

    const addedDate = new Date().toISOString().
        replace(/T/, ' ').      // replace T with a space
        replace(/\..+/, '');    // delete the dot and everything after

    try {
        const row = [emailAddress, rhCode, rhRefLink, rhSubId, rhIsRef, rhTotRef, rhLastRef, rhIsShare, rhSharer, addedDate];
        let result = undefined;
        try {
            result = await getRows(jwt, apiKey, spreadsheetId, range, row);
        } catch (err) {
            return res.status(200).type('text/plain').send(`An error occurred: ${err}`);
        }

        return res.status(200).type('text/plain').send(result);
    } catch (err) {
        return res.status(500).send(err);
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

async function getRows(jwt, apiKey, spreadsheetId, range, row) {
    const sheets = google.sheets('v4');
    try {
        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            auth: jwt,
            key: apiKey,
            valueInputOption: 'RAW',
            range: range,
            requestBody: {
                values: [row]
            }
        });

        return result.data;
    } catch (err) {
        throw err;
    }
}