/**
 * Obtains parameters from the hash of the URL
 * @return Object
 */
function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while (e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}


function readHtmlIntoElement(htmlFile, element, templateValues) {
  var reader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP');

  reader.open('get', htmlFile, true);
  reader.onreadystatechange = function() {
    if (reader.readyState == 4) {
      var htmlText = reader.responseText;

      for (const key in templateValues) {
        htmlText = htmlText.replace(`{{${key}}}`, `${templateValues[key]}`.trim());
      }

      $(element).html(htmlText);
    }
  };
  reader.send(null);
}


$(document).ready(function() {
  var spotifyApi = null;
  var params = getHashParams();

  var accessToken = params.accessToken,
    refreshToken = params.refreshToken,
    error = params.error;

  if (error) {
    alert('There was an error during the authentication');
  } else {
    if (accessToken) {
      spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(accessToken);

      // Get the user's profile
      spotifyApi.getMe(function(getMeError, getMeResult) {
        if (getMeError) console.error("Error occurred while getting user info", getMeError);
        else {
          const displayName = getMeResult.display_name;
          const userId = getMeResult.id;

          $("#displayName").text(displayName);
          $("#userId").text(userId);

          $('#login').hide();
          $('#loggedin').show();

          // Get playlists
          spotifyApi.getUserPlaylists(userId, function(getUserPlaylistsError, getUserPlaylistsResult) {
            if (getUserPlaylistsError) console.error("Error occurred while getting playlists.", getUserPlaylistsError);
            else {
              var playlists = getUserPlaylistsResult["items"];
              playlists.map(function(playlist) {
                if (playlist.name !== '') {
                  const params = new URLSearchParams({
                    accessToken: accessToken,
                    refreshToken: refreshToken
                  });
                  const queryString = params.toString();

                  var element = `
                  <li>
                    <a href="#${queryString}" class="playlist flex items-center space-x-3 text-gray-700 p-2 rounded-md font-medium hover:bg-gray-200 focus:bg-gray-200 focus:shadow-outline" data-playlist-id="${playlist.id}">
                      <span>${playlist.name}</span>
                    </a>
                  </li>`;

                  $("#playlists").append(element);
                }
              });
            }
          });
          // getUserPlaylists end
        }
      });
      // getMe end

      $(document).on("click", ".playlist", function(e) {
        const templateValues = {
          playlistSelected: $(this).text(),
          playlistId: $(this).data("playlist-id"),
        };

        readHtmlIntoElement("game_modes.html", "#content", templateValues);

        // Stop current playback
        spotifyApi.pause(function(pauseError, pauseResult) {
          if (pauseError) {
            // Ignore "No active device found" error
            if (!pauseError["responseText"].includes("No active device found")) {
              console.error("Error occurred during pause.", pauseError);
            }
          }
          // Else playback was paused successfully, nothing to do
        })
      });

      window.onSpotifyWebPlaybackSDKReady = () => {
        const playerName = 'Web player';

        const player = new Spotify.Player({
          name: playerName,
          getOAuthToken: cb => {
            cb(accessToken);
          },
          volume: 0.2
        });

        // Ready
        player.addListener('ready', ({
          device_id
        }) => {
          console.log('Ready with Device ID', device_id);
        });

        // Not Ready
        player.addListener('not_ready', ({
          device_id
        }) => {
          console.log('Device ID has gone offline', device_id);
        });

        player.addListener('initialization_error', ({
          message
        }) => {
          console.error(message);
        });

        player.addListener('authentication_error', ({
          message
        }) => {
          console.error(message);
        });

        player.addListener('account_error', ({
          message
        }) => {
          console.error(message);
        });

        player.connect();


        function startPlaylistOnWebPlayer(playlistId) {
          // Get devices
          spotifyApi.getMyDevices(function(getMyDevicesError, getMyDevicesResult) {
            if (getMyDevicesError) console.error("Error occurred while getting devices.", getMyDevicesError);
            else {
              const devices = getMyDevicesResult["devices"];
              var webPlayerId = null;

              for (var i = 0; i < devices.length; i++) {
                if (devices[i]["name"] === playerName) {
                  webPlayerId = devices[i]["id"];
                }
              }

              // Transfer playback to Web player
              spotifyApi.transferMyPlayback(
                [webPlayerId], {
                  "play": true
                },
                function(transferMyPlaybackError, transferMyPlaybackResult) {
                  if (transferMyPlaybackError) console.error(transferMyPlaybackError);
                  else {
                    console.log("Playback transferred");

                    //Play a song
                    var options = {
                      "device_id": webPlayerId,
                      "context_uri": `spotify:playlist:${playlistId}`,
                      "offset": {
                        "position": 5
                      },
                      "position_ms": 0
                    };

                    spotifyApi.play(options, function(playError, playResult) {
                      if (playError) console.error("Error occurred while starting play.", playError);
                    });
                  }
                }
              );
            // transferMyPlayback end
            }
          });

          player.togglePlay();
        };
        // startPlaylistOnWebPlayer end


        $(document).on("click", "#play_button", function() {
          const playlistId = $(this).data("playlist-id");

          // Count down from 5 seconds
          $("#content").html(5);
          var counter = 4;

          var interval = setInterval(function() {
            if (counter > 0) {
              $("#content").html(counter);
            }
            counter--;

            if (counter === -1) {
              clearInterval(interval);
              $("#content").text("Guess the song");

              startPlaylistOnWebPlayer(playlistId);
            }
          }, 1000);
        })
      }
    } else {
      // render initial screen
      $('#login').show();
      $('#loggedin').hide();
    }
  }
});
