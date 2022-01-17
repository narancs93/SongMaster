// https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/public/index.html
/**
 * Obtains parameters from the hash of the URL
 * @return Object
 */
function getHashParams() {
  let hashParams = {};
  let keyValuePair,
    regex = /([^&;=]+)=?([^&;]*)/g,
    queryString = window.location.hash.substring(1);
  while (keyValuePair = regex.exec(queryString)) {
    let key = keyValuePair[1];
    let value = keyValuePair[2];
    hashParams[key] = decodeURIComponent(value);
  }
  return hashParams;
}


// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
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


// https://stackoverflow.com/questions/13709482/how-to-read-text-file-in-javascript
function readHtmlIntoElement(htmlFile, element, templateValues, callback) {
  let reader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP');

  reader.open('get', htmlFile, true);
  reader.onreadystatechange = function() {
    if (reader.readyState == 4) {
      let htmlText = reader.responseText;

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

// https://stackoverflow.com/questions/34038464/jquery-looping-progress-bar
function progress(timeleft, timetotal, element) {
  element = $(element.selector);
  let progressBarWidth = timeleft * element.width() / timetotal;
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
  let params = getHashParams();
  let [accessToken, refreshToken, error] = [
    params.accessToken,
    params.refreshToken,
    params.error
  ];

  if (error) {
    alert('There was an error during the authentication');
  } else {
    if (accessToken) {
      let songMaster = new SongMaster(accessToken, refreshToken);

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
      // render login screen
      $('#login').show();
      $('#loggedin').hide();
    }
  }
});
