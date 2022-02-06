const express = require('express');
const request = require('request');
const path = require('path');
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
require('dotenv').config({path: path.join(__dirname, '..', '.env')});

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri_base = process.env.REDIRECT_URI;
let redirect_uri;
const httpPort = process.env.HTTP_PORT || 8080;
const httpsPort = process.env.HTTPS_PORT;
const certPath = process.env.certPath;
const keyPath = process.env.keyPath;

if (typeof(client_id) === 'undefined') {
  console.error('CLIENT_ID is not specified in .env file. Exiting...');
  process.exit(1);
} else if (typeof(client_secret) === 'undefined') {
  console.error('CLIENT_SECRET is not specified in .env file. Exiting...');
  process.exit(2);
} else if (typeof(redirect_uri_base) === 'undefined') {
  console.error('REDIRECT_URI is not specified in .env file. Exiting...');
  process.exit(3);
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
let generateRandomString = function(length) {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

let stateKey = "spotify_auth_state";

let app = express();

app.use(express.static(path.join(__dirname, "public")))
  .use(cors())
  .use(cookieParser());

app.get("/login", function(req, res) {
  redirect_uri = redirect_uri_base.replace("{{PROTOCOL}}", req.protocol);
  redirect_uri = redirect_uri.replace("{{PORT}}", req.socket.address().port);

  let state = generateRandomString(16);
  res.cookie(stateKey, state);

  let scope = "user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-private user-read-email user-library-read streaming app-remote-control user-read-playback-position user-top-read user-read-recently-played playlist-read-collaborative playlist-read-private";
  res.redirect("https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get("/callback", function(req, res) {
  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect("/#" +
      querystring.stringify({
        error: "state_mismatch"
      }));
  } else {
    res.clearCookie(stateKey);
    let authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        "Authorization": "Basic " + Buffer.from(client_id + ":" + client_secret, "utf-8").toString("base64")
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        let accessToken = body.access_token,
          refreshToken = body.refresh_token,
          validUntil = new Date().getTime() / 1000 + body.expires_in;

        res.redirect("/#" +
          querystring.stringify({
            accessToken: accessToken,
            refreshToken: refreshToken,
            validUntil: validUntil
          }));
      } else {
        res.redirect("/#" +
          querystring.stringify({
            error: "invalid_token"
          }));
      }
    });
  }
});

app.get("/refreshToken", function(req, res) {
  // requesting access token from refresh token
  let refreshToken = req.query.refreshToken;
  let authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      "Authorization": "Basic " + Buffer.from(client_id + ":" + client_secret, "utf-8").toString("base64")
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refreshToken
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      let accessToken = body.access_token,
        validUntil = new Date().getTime() / 1000 + body.expires_in;

        res.send({
        accessToken: accessToken,
        refreshToken: refreshToken,
        validUntil: validUntil
      });
    }
  });
});


const httpServer = http.createServer(app);
try {
  httpServer.listen(httpPort, () => {
      console.log(`HTTP server started on port ${httpPort}`);
  }).on('error', console.log);
} catch(e) {
  console.log(e)
}


if (typeof(httpsPort) !== 'undefined') {
  if (typeof(certPath) !== 'undefined' && typeof(keyPath) !== 'undefined') {
    try {
      const httpsServer = https.createServer({
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }, app);

      httpsServer.listen(httpsPort, () => {
          console.log(`HTTPS server started on port ${httpsPort}`);
      }).on('error', console.log);
    } catch(e) {
      console.log(e);
    }

  } else {
    console.error('Server is not listening on HTTPS. Reason: HTTPS_PORT is specified in .env file, but certPath and/or keyPath is missing.')
  }
} else {
  console.error('Server is not listening on HTTPS. Reason: HTTPS_PORT is not specified in .env file.')
}
