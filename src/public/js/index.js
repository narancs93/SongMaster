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

      // Get the users profile
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
                  </li>`

                  $("#playlists").append(element);
                }
              });
            }
          });
        }
      })
    } else {
      // render initial screen
      $('#login').show();
      $('#loggedin').hide();
    }
  }
});

$(document).on("click", ".playlist", function(e) {
  const templateValues = {
    playlistSelected: $(this).text(),
    playlistId: $(this).data("playlist-id"),
  };

  readHtmlIntoElement("game_modes.html", "#content", templateValues);

  var params = getHashParams();

  var accessToken = params.accessToken,
    refreshToken = params.refreshToken,
    error = params.error;

  // Stop current playback
  $.ajax({
    url: `https://api.spotify.com/v1/me/player/pause`,
    type: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    },
    success: function(data1, textStatus1, xhr1) {
      console.log(xhr1.status);
    },
    error: function(resp) {
      var errorMessage = resp.responseText;
      if (!errorMessage.includes("No active device found")) {
        console.log(`Error while pausing playback: ${errorMessage}`)
      }
    }
  });
});


window.onSpotifyWebPlaybackSDKReady = () => {
  var params = getHashParams();

  var accessToken = params.accessToken,
    refreshToken = params.refreshToken,
    error = params.error;

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
    var params = getHashParams();
    var accessToken = params.accessToken,
      refreshToken = params.refreshToken,
      error = params.error;

    // Get devices
    $.ajax({
      url: `https://api.spotify.com/v1/me/player/devices`,
      headers: {
        'Authorization': 'Bearer ' + accessToken
      },
      success: function(response) {
        const devices = response["devices"];
        var webPlayerId = null;

        for (var i = 0; i < devices.length; i++) {
          if (devices[i]["name"] === playerName) {
            webPlayerId = devices[i]["id"];
          }
        }

        // Transfer playback to Web player
        var data = {
          "device_ids": [
            webPlayerId
          ],
          "play": true
        };

        $.ajax({
          url: `https://api.spotify.com/v1/me/player`,
          type: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + accessToken
          },
          data: JSON.stringify(data),
          success: function(data, textStatus, xhr) {
            if (xhr.status === 204) {
              console.log("Playback transferred");

              //Play a song
              var dataObject = {
                "device_id": webPlayerId,
                "context_uri": `spotify:playlist:${playlistId}`,
                "offset": {
                  "position": 5
                },
                "position_ms": 0
              };

              $.ajax({
                url: `https://api.spotify.com/v1/me/player/play`,
                type: 'PUT',
                headers: {
                  'Authorization': 'Bearer ' + accessToken
                },
                data: JSON.stringify(dataObject),
                dataType: 'json',
                success: function(data1, textStatus1, xhr1) {
                  console.log(xhr1.status);
                },
                error: function() {
                  console.log("Error occurred while getting playlists.");
                }
              });

            }
          },
          error: function() {
            console.log("Error occurred while getting playlists.");
          }
        });


      },
      error: function() {
        console.log("Error occurred while getting playlists.");
      }
    });

    player.togglePlay();
  };


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

        var params = getHashParams();
        var accessToken = params.accessToken,
          refreshToken = params.refreshToken,
          error = params.error;

        startPlaylistOnWebPlayer(playlistId);
      }
    }, 1000);
  })
}
