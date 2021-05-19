const {google} = require('googleapis');

const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

exports.handleNewUnsubscriber = async (req, res) => {
    const emailAddress = req.body.data.merges['EMAIL'];

    const jwt = getJwt();
    const apiKey = getApiKey();
    const spreadsheetId = process.env.SHEETID;
    const ranges = ['Testing Sheet'];

    const updatedDate = new Date().toISOString().
        replace(/T/, ' ').      // replace T with a space
        replace(/\..+/, '')     // delete the dot and everything after
    
    
    let results = undefined;

    try {
        const rowIndexWithEmail = await findRowIndexWithEmail(jwt, apiKey, spreadsheetId, ranges, emailAddress);

        if (rowIndexWithEmail === -1) {
            return res.status(404).type('text/plain').send(`Email address ${emailAddress} could not be found.`);
        }

        const deletedRow = await deleteRow(jwt, apiKey, spreadsheetId, rowIndexWithEmail);

        return res.status(200).send(deletedRow);
    } catch (err) {
        return res.status(404).type('text/plain').send(`An error occurred: ${err}`);
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

async function findRowIndexWithEmail(jwt, apiKey, spreadsheetId, ranges, email) {
    const sheets = google.sheets('v4');
    try {
        const allValues = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: spreadsheetId,
            auth: jwt,
            key: apiKey,
            ranges: ranges
        });

        for (const [ind, val] of allValues.data.valueRanges[0].values.entries()) {
            if (val[0] === email) {
                return ind;
            }
        }

        return -1;
    } catch (err) {
        throw err;
    }
}

async function deleteRow(jwt, apiKey, spreadsheetId, rowIndex) {
    const sheets = google.sheets('v4');

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
                                sheetId: process.env.SUBSHEETID,
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
        throw err;
    }
}