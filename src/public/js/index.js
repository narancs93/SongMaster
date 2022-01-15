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


function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]
    ];
  }

  return array;
}


function readHtmlIntoElement(htmlFile, element, templateValues, callback) {
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

  if (typeof callback == 'function') {
    callback();
  }
}


function progress(timeleft, timetotal, element) {
  var element = $(element.selector);
  var progressBarWidth = timeleft * element.width() / timetotal;
  // element.find('div').animate({
  //   width: progressBarWidth
  // }, 500).html(timeleft);
  element.find('div').animate({
    width: progressBarWidth
  }, timeleft == timetotal ? 0 : 1000, "linear");

  if (timeleft > 0) {
    setTimeout(function() {
      progress(timeleft - 1, timetotal, element);
    }, 1000);
  }
};


// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/sampleSize.md
const sampleSize = ([...arr], n = 1) => {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr.slice(0, n);
};


$(document).ready(function() {
  var spotifyApi = null;
  var songMaster = new SongMaster();

  var params = getHashParams();

  var accessToken = params.accessToken,
    refreshToken = params.refreshToken,
    error = params.error;

  if (error) {
    alert('There was an error during the authentication');
  } else {
    if (accessToken) {

      var player = null;

      window.onSpotifyWebPlaybackSDKReady = () => {
        const playerName = 'Web player';

        player = new Spotify.Player({
          name: playerName,
          getOAuthToken: cb => {
            cb(accessToken);
          },
          volume: 0.2
        });
        songMaster.player = player;

        // Ready
        player.addListener('ready', ({
          device_id
        }) => {
          console.log('Ready with Device ID', device_id);

          spotifyApi = new SpotifyWebApi();
          spotifyApi.setAccessToken(accessToken);

          songMaster.spotifyApi = spotifyApi;
          songMaster.getDevice("Web player", (webPlayer) => {
            songMaster.webPlayerId = webPlayer["id"];

            const options = {
              play: true
            }

            songMaster.transferPlayback(songMaster.webPlayerId, options);

            songMaster.getUser((user) => {
              songMaster.user = user;

              $("#displayName").text(songMaster.user.name);
              $("#userId").text(songMaster.user.id);

              $('#login').hide();
              $('#loggedin').show();

              songMaster.getPlaylists(function() {
                var playlists = songMaster.user.playlists;

                playlists.map(function(playlist) {
                  if (playlist.name !== '') {
                    const params = new URLSearchParams({
                      accessToken: accessToken,
                      refreshToken: refreshToken
                    });
                    const queryString = params.toString();

                    var element = `
                    <li>
                      <a href="#${queryString}" class="playlist flex items-center space-x-3 text-gray-700 p-2 rounded-md font-medium hover:bg-gray-200 focus:bg-gray-200 focus:shadow-outline" data-playlist-id="${playlist.id}" data-num-of-tracks="${playlist.tracks.total}">
                        <span>${playlist.name}</span>
                      </a>
                    </li>`;

                    $("#playlists").append(element);
                  }
                });
              });
            });
          });
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
      }

      $(document).on("click", ".playlist", function(e) {
        const templateValues = {
          playlistSelected: $(this).text(),
          playlistId: $(this).data("playlist-id"),
          numOfTracks: $(this).data("num-of-tracks")
        };

        readHtmlIntoElement("game_modes.html", "#content", templateValues);

        // Stop current playback
        songMaster.pause();
      });


      $(document).on("click", "#play_button", function() {
        const playlistId = $(this).data("playlist-id");
        const numOfTracks = $(this).data("num-of-tracks");

        const playlist = {
          id: playlistId,
          numOfTracks: numOfTracks
        }

        songMaster.songQuiz.playlist = playlist;
        songMaster.startGame();
      });
    } else {
      // render initial screen
      $('#login').show();
      $('#loggedin').hide();
    }
  }
});
