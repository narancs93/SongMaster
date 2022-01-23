const express = require('express');
const request = require('request');
const path = require('path');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";

var app = express();

app.use(express.static(path.join(__dirname, "public")))
  .use(cors())
  .use(cookieParser());

app.get("/login", function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  var scope = "user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-private user-read-email user-library-read streaming app-remote-control user-read-playback-position user-top-read user-read-recently-played playlist-read-collaborative playlist-read-private";
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
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect("/#" +
      querystring.stringify({
        error: "state_mismatch"
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
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

        var accessToken = body.access_token,
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
  var refreshToken = req.query.refreshToken;
  var authOptions = {
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
      var accessToken = body.access_token,
        validUntil = new Date().getTime() / 1000 + body.expires_in;

        res.send({
        "accessToken": accessToken,
        "refreshToken": refreshToken,
        "validUntil": validUntil
      });
    }
  });
});

console.log("Listening on 8888");
app.listen(8888);
