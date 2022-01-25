# SongMaster
##  Song quiz game powered by Spotify API
Login with your Spotify account and select one of your playlists to play a quiz game. There are 3 game modes: guess song title, guess artist, and random.
## Requirements
* Node.js and npm installed
* Spotify Premium subscription

## Deployment
### Clone repository and install dependencies
```sh
$ git clone https://github.com/narancs93/SongMaster
$ cd SongMaster
$ npm install
```
### Setup environment
For this step you need to have an App created in [Spotify Dashboard](https://developer.spotify.com/dashboard). From there you can get the Client ID and Client secret for authentication. You will also need to configure a Redirect URI, so the Spotify authentication service automatically invokes your app every time a user logs in. These steps are described in the [Spotify Web API Documentation](https://developer.spotify.com/documentation/general/guides/authorization/app-settings/).

Once you have the Client ID, Client Secret and Redirect URI:
* Create a ```.env``` file in the ```src``` directory with the following contents:

```sh
HTTP_PORT=http_port_to_listen_on
CLIENT_ID='your_client_id_here'
CLIENT_SECRET='your_client_secret_here'
REDIRECT_URI='your_redirect_uri_here'
```
Replace the value of CLIENT_ID, CLIENT_SECRET and REDIRECT_URI variables with the values you have from your Spotify Dashboard. (The app will start listening on the port specified in the HTTP_PORT variable, so that port has to match the port in the Redirect URI.)

Example with random values:
```sh
HTTP_PORT=8080
CLIENT_ID='pc39vei3kym3ac2b2fhu47xu6xgmvb9p'
CLIENT_SECRET='iaudnq29njacx6bmmx25pt84p9gddewj'
REDIRECT_URI='http://10.11.12.13:8080/callback'
```

Start the app.

```sh
node src/app.js
```


## Configure HTTPS

To configure HTTPS
* Add the following values to the ```.env``` file.

```sh
HTTPS_PORT=443
certPath='/path/to/certificate.crt'
keyPath='/path/to/private/key.key'
```

To generate a self-signed certificate

```sh
openssl req -newkey rsa:4096 -x509 -sha256 -days 365 -nodes -out yourdomain.crt -keyout yourdomain.key
```
