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


function insertTemplateIntoHtml(template, html) {
  for (const key in template) {
    html = html.replace(`{{${key}}}`, `${template[key]}`.trim());
  }
  return html;
}


// https://stackoverflow.com/questions/13709482/how-to-read-text-file-in-javascript
function readHtmlIntoElement(htmlFile, element, templateValues, callback) {
  let reader = new XMLHttpRequest() || new ActiveXObject("MSXML2.XMLHTTP");

  reader.open("get", htmlFile, true);
  reader.onreadystatechange = function() {
    if (reader.readyState == 4) {
      let htmlText = reader.responseText;
      htmlText = insertTemplateIntoHtml(templateValues, htmlText);
      $(element).html(htmlText);
    }
  };
  reader.send(null);

  if (typeof callback == "function") {
    callback();
  }
}


function isInt(str) {
  return !isNaN(str) && Number.isInteger(parseFloat(str));
}


$(document).on("click", "#obtainNewToken", function(e) {
  let params = getHashParams();
  let {
    refreshToken,
    error
  } = params;

  if (refreshToken) {
    $.ajax({
      url: "/refreshToken",
      data: {
        refreshToken: refreshToken
      }
    }).done(function(data) {
      var params = new URLSearchParams({
        accessToken: data.accessToken,
        refreshToken: refreshToken,
        validUntil: data.validUntil
      });

      window.location.href = `/#${params.toString()}`;
      window.location.reload(true);
    });
  }
});


// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/sampleSize.md
const sampleSize = ([...arr], n = 1) => {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr.slice(0, n);
};


function updateTokenExpiry(validUntil) {
  let currentTime = new Date().getTime() / 1000;
  let secondsLeft = Math.round(validUntil - currentTime);

  if (secondsLeft > 0) {
    $("#tokenExpiry").text(secondsLeft);
  } else {
    $("#tokenExpiry").parent('span').text("The access token has expired.");
  }

  if (secondsLeft < 300) {
    $("#refreshTokenButton").removeClass("bg-gray-200 hover:bg-gray-200").addClass("bg-red-300 hover:bg-red-400");
  } else if (secondsLeft < 900) {
    $("#refreshTokenButton").removeClass("bg-gray-200 hover:bg-gray-200").addClass("bg-yellow-300 hover:bg-yellow-400");
  }
}


function hideElementsBySelectors(selectorList) {
  const combinedSelector = selectorList.join(",");
  $(combinedSelector).each(function() {
    $(this).hide();
  });
}


function showElementsBySelectors(selectorList) {
  const combinedSelector = selectorList.join(",");
  $(combinedSelector).each(function() {
    $(this).show();
  });
}


$(document).ready(function() {
  let params = getHashParams();
  let {
    accessToken,
    refreshToken,
    validUntil,
    error
  } = params;

  setInterval(function() {
    updateTokenExpiry(validUntil);
  }, 1000)

  if (error) {
    new ErrorHandler('An error occurred during the authentication.', true);
  } else {
    if (accessToken) {

      let songMaster = new SongMaster(accessToken, refreshToken);

      $(document).on("click", ".playlist", function(e) {
        const playlistInfo = {
          id: $(this).data("playlist-id"),
          numOfTracks: $(this).data("num-of-tracks")
        }

        songMaster.songQuiz.getPlaylistTracks(playlistInfo);

        hideElementsBySelectors(["#progressBarContainer", "#quizDetailsContainer"]);

        const templateValues = {
          playlistSelected: $($(this).html().replace(/&nbsp;/g, ' ')).text(),
          playlistId: $(this).data("playlist-id"),
          numOfTracks: $(this).data("num-of-tracks")
        };

        readHtmlIntoElement("game_modes.html", "#content", templateValues);

        songMaster.stopQuiz();
      });


      $(document).on("click", "#play", () => {
        // Read form data
        const numberOfSongs = $("#number-of-songs").val();
        const difficulty = $("input[name='difficulty']:checked").val();
        const guessTarget = $("input[name='guess']:checked").val();

        // Validate form data
        const validDifficulties = ["easy", "medium", "hard"];
        const validGuessTargets = ["title", "artist", "random"];
        const gameModes = {
          title: "guessTitles",
          artist: "guessArtists",
          random: "guessRandom"
        }
        const guessTimes = {
          easy: 30,
          medium: 15,
          hard: 7
        }

        if (
          isInt(numberOfSongs) && numberOfSongs > 0 &&
          validDifficulties.includes(difficulty) &&
          validGuessTargets.includes(guessTarget)
        ) {
          songMaster.songQuiz.numOfQuestions = numberOfSongs;
          songMaster.songQuiz.guessTimeInSeconds = guessTimes[difficulty];

          songMaster.songQuiz.generateAnswers();
          songMaster.startGame(gameModes[guessTarget])
        }
      });


      $(document).on("click", ".track-choice-button", (evt) => {
        // Add class 'chosen-answer' to the selected answer and change its color
        // Set the other 3 answers back to default
        $(".track-choice-button").addClass("text-white bg-teal-500 hover:bg-teal-700").removeClass("chosen-answer text-black bg-orange-500 hover:bg-orange-700");
        $(evt.target).addClass("chosen-answer text-black bg-orange-500 hover:bg-orange-700").removeClass("text-white bg-teal-500 hover:bg-teal-700");

        songMaster.songQuiz.setAnswerTime();
      });


      $(document).on("click", "#play-next-song", function() {
        $("#play-next-song").css('visibility', 'hidden');
        songMaster.songQuiz.finishQuestion();
      });


      $(document).on("input", "#volume", function() {
        let volume = $(this).val();
        songMaster.setVolume(volume);
      });


      $(document).on("click", "#playlist-search", () => {
        hideElementsBySelectors(["#progressBarContainer", "#quizDetailsContainer"]);
        songMaster.stopQuiz();

        const playlistQuery = $("#playlist-query").val();
        songMaster.spotifyApi.searchPlaylists(playlistQuery, (searchPlaylistsError, searchPlaylistsResult) => {
          if (searchPlaylistsError) console.error("Error occurred while searching for playlists.", searchPlaylistsError);
          else {
            const playlists = searchPlaylistsResult.playlists.items;

            let playlistsHtml = playlists.map(playlist => {
              return `<div class="playlist rounded-2xl p-4 m-4 cursor-pointer bg-gray-200 hover:bg-gray-400" data-playlist-id="${playlist.id}" data-num-of-tracks="${playlist.tracks.total}">
                <img class="playlist-image m-auto" src="${playlist.images[0].url}">
                <div class="text-base">${playlist.name}</div>
                <div class="text-sm text-gray-600">By ${playlist.owner.display_name}</div>
              </div>`
            }).join('');

            let contentHtml = `
            <div class="flex flex-col mt-auto mb-auto text-center m-8">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">${playlistsHtml}</div>
            <div>
            `

            $("#content").html(contentHtml);
            console.log(contentHtml)
          }
        });
      });

    } else {
      // render login screen
      $("#login").show();
      $("#loggedin").hide();
    }
  }
});
