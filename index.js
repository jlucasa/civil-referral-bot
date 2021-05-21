const {google} = require('googleapis');
const sheets = google.sheets('v4');

const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

exports.handleNewSubscriber = async (req, res) => {
    let merges = req.body.data.merges;

    const jwt = getJwt();
    const apiKey = getApiKey();
    const spreadsheetId = process.env.SPREADSHEETID;
    const range = 'Testing Sheet!A1:L1';

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

    const rowValues = [
        emailAddress,
        rhCode, 
        rhRefLink, 
        rhSubId, 
        rhIsRef, 
        rhTotRef, 
        rhLastRef, 
        rhIsShare, 
        rhSharer, 
        addedDate, 
        null
    ];

    try {
        const result = await appendToRows(jwt, apiKey, spreadsheetId, range, rowValues);
        return res.status(200).type('text/plain').send(result);
    } catch (err) {
        return res.status(400).type('text/plain').send(`An error occurred! ${err}`);
    }
}

exports.handleNewUnsubscriber = async (req, res) => {
    const emailAddress = req.body.data.merges['EMAIL'];

    const jwt = getJwt();
    const apiKey = getApiKey();
    const spreadsheetId = process.env.SPREADSHEETID;
    const sheetId = process.env.SHEETID;
    const sheetNames = ['Testing Sheet'];

    try {
        const rowIndexWithEmail = await findRowOrRowIndexWithEmail(jwt, apiKey, spreadsheetId, sheetNames, emailAddress, 'rowIndex');

        if (rowIndexWithEmail === -1) {
            return res.status(400).type('text/plain').send(`Email address to delete (${emailAddress}) could not be found.`);
        }

        const deletedRow = await deleteRow(jwt, apiKey, spreadsheetId, sheetId, rowIndexWithEmail);

        return res.status(200).send(deletedRow);
    } catch (err) {
        return res.status(500).type('text/plain').send(`An error occurred! ${err}`);
    }
}

exports.handleUpdatedSubscriber = async (req, res) => {
    let merges = req.body.data.merges;

    const jwt = getJwt();
    const apiKey = getApiKey();
    const spreadsheetId = process.env.SPREADSHEETID;
    const sheetNames = ['Testing Sheet'];

    const emailAddress = merges['EMAIL'];
    const rhCode = merges['RH_CODE'];
    const rhRefLink = merges['RH_REFLINK'];
    const rhSubId = merges['RH_SUBID'];
    const rhIsRef = merges['RH_ISREF'];
    const rhTotRef = merges['RH_TOTREF'];
    const rhLastRef = merges['RH_LASTREF'];
    const rhIsShare = merges['RH_ISSHARE'];
    const rhSharer = merges['RH_SHARER'];

    const updatedDate = new Date().toISOString().
        replace(/T/, ' ').      // replace T with a space
        replace(/\..+/, '');    // delete the dot and everything after

    const rowValues = [
        emailAddress,
        rhCode, 
        rhRefLink, 
        rhSubId, 
        rhIsRef, 
        rhTotRef, 
        rhLastRef, 
        rhIsShare, 
        rhSharer, 
        null,
        updatedDate
    ]; 

    try {
        const rowIndexWithEmail = await findRowOrRowIndexWithEmail(jwt, apiKey, spreadsheetId, sheetNames, emailAddress, 'rowIndex');

        if (rowIndexWithEmail === -1) {
            return res.status(400).type('text/plain').send(`Email address to update (${emailAddress}) could not be found.`);
        }

        const updatedRow = await updateRow(jwt, apiKey, spreadsheetId, sheetNames[0], rowIndexWithEmail, rowValues);

        return res.status(200).send(updatedRow);
    } catch (err) {
        return res.status(500).type('text/plain').send(`An error occurred! ${err}`);
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

/**
 * Finds the row index with key `email` in a spreadsheet with `spreadsheetId` and `subsheetNames`
 * @param {JSON} jwt The JSON web token information for the service account
 * @param {string} apiKey The API key for GCP Edit Access to Google Sheets API
 * @param {string} spreadsheetId The ID of the spreadsheet to search
 * @param {string[]} sheetNames The array of subsheet names to search
 * @param {string} email The "key" to search in `subsheetNames`
 * @param {'row' | 'rowIndex'} rowOrRowIndex Whether or not to return the row or the index of the row
 * @returns {number} The resulting row index with the key `email`, `-1` if that row index is not found.
 * @throws An error getting the row index with the key `email`
 */
async function findRowOrRowIndexWithEmail(jwt, apiKey, spreadsheetId, sheetNames, email, rowOrRowIndex='row') {
    try {
        const allValues = await sheets.spreadsheets.values.batchGet({
            auth: jwt,
            key: apiKey,
            spreadsheetId: spreadsheetId,
            ranges: sheetNames
        });

        for (const [ind, val] of allValues.data.valueRanges[0].values.entries()) {
            if (val[0] === email) {
                if (rowOrRowIndex === 'row') {
                    return val;
                }

                return ind;
            }
        }

        return -1;
    } catch (err) {
        throw `An error occurred finding the row index with email ${email}: ${err}`;
    }
}

/**
 * Appends to the rows in a spreadsheet specified with `spreadsheetId` and `range`.
 * @param {JSON} jwt The JSON web token information for the service account
 * @param {string} apiKey The API key for GCP Edit Access to Google Sheets API
 * @param {string} spreadsheetId The ID of the spreadsheet to edit
 * @param {string} sheetName The sheet name in `spreadsheetId`
 * @param {any[]} rowValues The row values to append to the spreadsheet specified in "range"
 * @returns The result of appending to rows in the spreadsheet ID with `spreadsheetId`
 * @throws An error appending to rows in the spreadsheet ID with `spreadsheetId`
 */
async function appendToRows(jwt, apiKey, spreadsheetId, sheetName, rowValues) {
    try {
        const result = await sheets.spreadsheets.values.append({
            auth: jwt,
            key: apiKey,
            spreadsheetId: spreadsheetId,
            valueInputOption: 'RAW',
            range: `${sheetName}!A1:L1`,
            requestBody: {
                values: [rowValues]
            }
        })

        return result.data;
    } catch (err) {
        throw `An error occurred appending to rows: ${err}`;
    }
}

/**
 * Deletes a row at a given index `rowIndex` in the spreadsheet `spreadsheetId` at `sheetId`
 * @param {JSON} jwt The JSON web token information for the service account
 * @param {string} apiKey The API key for GCP Edit Access to Google Sheets API
 * @param {string} spreadsheetId The ID of the spreadsheet to edit
 * @param {string} sheetId The ID of the sheet within `spreadsheetId` to edit
 * @param {number} rowIndex The row index (found with `findRowIndexWithEmail`)
 * @returns The deleted values from the spreadsheet with ID `spreadsheetId` at `subsheetId`
 * @throws An error deleting the row at `rowIndex` in spreadsheet with ID `spreadsheetId` at `subsheetId`
 */
async function deleteRow(jwt, apiKey, spreadsheetId, sheetId, rowIndex) {
    try {
        const deletedVal = await sheets.spreadsheets.batchUpdate({
            auth: jwt,
            key: apiKey,
            spreadsheetId: spreadsheetId,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }
                ]
            }
        });

        return deletedVal.data;
    } catch (err) {
        throw `An error occurred deleting the row at ${rowIndex} at sheet with ID ${subsheetId}: ${err}`;
    }
}

/**
 * Updates a row at a given index `rowIndex` in the spreadsheet `spreadsheetId`
 * @param {JSON} jwt The JSON web token information for the service account
 * @param {string} apiKey The API key for GCP Edit Access to Google Sheets API
 * @param {string} spreadsheetId The ID of the spreadsheet to edit
 * @param {string} sheetName The name of the sheet within `spreadsheetId` to edit
 * @param {number} rowIndex The index of the row within `sheetName` to edit
 * @param {any[]} rowValues The values to place in `spreadsheetId` at `sheetName`
 * @returns A successful updating of these row values
 * @throws An error updating these row values
 */
async function updateRow(jwt, apiKey, spreadsheetId, sheetName, rowIndex, rowValues) {
    if (rowValues[9] !== null) {
        // If the item in the created date index passed in is not null, it should be!
        rowValues[9] = null;
    }

    try {
        const updatedVal = await sheets.spreadsheets.values.update({
            auth: jwt,
            key: apiKey,
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A${rowIndex}:L${rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [rowValues]
            }
        });

        return updatedVal.data;
    } catch (err) {
        throw `An error occurred updating the row at ${rowIndex} in spreadsheet ${spreadsheetId} with sheet ${sheetName}: ${err}`;
    }
}