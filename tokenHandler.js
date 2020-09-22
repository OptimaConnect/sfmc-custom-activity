'use strict';

const axios = require('axios');

const restUrl = process.env.restUrl;
const authUrl = process.env.authUrl;
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;

exports.validateToken = async function (req, res, next) {
    const fuelAuth = req.headers.authorization;
    const contextUrl = restUrl + "platform/v1/tokenContext";

    console.log(`Authentication Header: ${fuelAuth}`);

    if (!fuelAuth){
        res.locals.authenticated = false;
        res.sendStatus(403);
        return;
    }

    try {
        const response = await axios({
            url: contextUrl,
            headers: { "Authorization": fuelAuth }
        });

        res.locals.authenticated = true;
        next();
    } catch (error) {
        console.log(error);
        res.locals.authenticated = false;
        res.sendStatus(403);
    }
};

exports.getOauth2Token = async function () {
    const oauthResponse = await axios({
        method: 'post',
        url: authUrl,
        data: {
            "grant_type": "client_credentials",
            "client_id": clientId,
            "client_secret": clientSecret
        }
    });

    console.dir('Bearer '.concat(oauthResponse.data.access_token));
    return 'Bearer '.concat(oauthResponse.data.access_token);
}