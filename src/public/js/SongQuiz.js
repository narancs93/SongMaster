class SongQuiz {
  constructor(songMaster) {
    this._songMaster = songMaster;
    this._timeToWait = 3;
    this._guessTimeInSeconds = 15;
    this._numOfQuestions = 10;

    this.targetTexts = {
      trackName: "title",
      trackArtists: "artist(s)",
      default: "song/artist(s)"
    };

    hideElementsBySelectors(["#progressBarContainer", "#quizDetailsContainer"]);
  }

  get songMaster() {
    return this._songMaster;
  }

  set songMaster(newSongMaster) {
    this._songMaster = newSongMaster;
  }

  get timeToWait() {
    return this._timeToWait;
  }

  set timeToWait(newTimeToWait) {
    this._timeToWait = newTimeToWait;
  }

  get guessTimeInSeconds() {
    return this._guessTimeInSeconds;
  }

  set guessTimeInSeconds(newGuessTimeInSeconds) {
    this._guessTimeInSeconds = newGuessTimeInSeconds;
  }

  get secondsToWait() {
    return this._secondsToWait;
  }

  set secondsToWait(newSecondsToWait) {
    this._secondsToWait = newSecondsToWait;
  }

  get remainingGuessTimeInSeconds() {
    return this._remainingGuessTimeInSeconds;
  }

  set remainingGuessTimeInSeconds(newRemainingGuessTimeInSeconds) {
    this._remainingGuessTimeInSeconds = newRemainingGuessTimeInSeconds;
  }

  get numOfQuestions() {
    return this._numOfQuestions;
  }

  set numOfQuestions(newNumOfQuestions) {
    this._numOfQuestions = newNumOfQuestions;
  }

  get playlistInfo() {
    return this._playlistInfo;
  }

  set playlistInfo(newPlaylistInfo) {
    this._playlistInfo = newPlaylistInfo;

    // Get name of the playlist
    this.songMaster.spotifyApi.getPlaylist(this.playlistInfo.id, (getPlaylistError, getPlaylistResult) => {
      if (getPlaylistError) console.error("Error occurred while getting playlist data.", getPlaylistError);
      else {
        this._playlistInfo.name = getPlaylistResult.name;
      }
    });
  }

  get playlistOffset() {
    return this._playlistOffset;
  }

  set playlistOffset(newPlaylistOffset) {
    this._playlistOffset = newPlaylistOffset;
  }

  get playlistTracks() {
    return this._playlistTracks;
  }

  set playlistTracks(newplaylistTracks) {
    this._playlistTracks = newplaylistTracks;
  }

  get choices() {
    return this._choices;
  }

  set choices(newChoices) {
    this._choices = newChoices;
  }

  get correctTrackId() {
    return this._correctTrackId;
  }

  set correctTrackId(newCorrectTrackId) {
    this._correctTrackId = newCorrectTrackId;
  }

  get answerTracks() {
    return this._answerTracks;
  }

  set answerTracks(newAnswerTracks) {
    this._answerTracks = newAnswerTracks;
  }

  get currentQuestionIndex() {
    return this._currentQuestionIndex;
  }

  set currentQuestionIndex(newCurrentQuestionIndex) {
    this._currentQuestionIndex = newCurrentQuestionIndex;
  }

  get score() {
    return this._score;
  }

  set score(newScore) {
    this._score = newScore;
  }

  get intervalBetweenQuestions() {
    return this._intervalBetweenQuestions;
  }

  set intervalBetweenQuestions(newIntervalBetweenQuestions) {
    this._intervalBetweenQuestions = newIntervalBetweenQuestions;
  }

  get intervalDuringQuestion() {
    return this._intervalDuringQuestion;
  }

  set intervalDuringQuestion(newIntervalDuringQuestions) {
    this._intervalDuringQuestion = newIntervalDuringQuestions;
  }


  setRandomPlaylistOffset() {
    // Set random offset based on number of tracks in playlist
    // Maximum of 100 tracks are returned by the API
    this.playlistOffset = 0;
    if (this.playlistInfo.numOfTracks > 100) {
      this.playlistOffset = Math.floor(Math.random() * (this.playlistInfo.numOfTracks - 100));
    }
  }


  generateChoices(callback) {
    const track = this.answerTracks[this.currentQuestionIndex];
    this.correctTrackId = track.trackId;
    const correctArtists = track.trackArtists;

    let wrongAnswerPool = this.playlistTracks.filter(e => e.id !== this.correctTrackId);

    if (this.target === "trackArtists") {
      // Make sure correct artist(s) does not appear twice in choices
      wrongAnswerPool = wrongAnswerPool.filter(e => correctArtists !== this.getTrackArtists(e));

      // Also make sure, that incorrect artist(s) cannot appear twice
      let tracksWithUniqueArtists = [];
      let uniqueArtists = [];

      for (let i = 0; i < wrongAnswerPool.length; i++) {
        const artist = this.getTrackArtists(wrongAnswerPool[i]);
        if (!uniqueArtists.includes(artist)) {
          tracksWithUniqueArtists.push(wrongAnswerPool[i]);
          uniqueArtists.push(artist);
        }
      }

      wrongAnswerPool = tracksWithUniqueArtists;
    }

    const wrongAnswers = sampleSize(wrongAnswerPool, 3);

    for (let i = 0; i < wrongAnswers.length; i++) {
      wrongAnswers[i] = this.extractTrackData(wrongAnswers[i]);
    }

    // Create array for the 4 choices
    this.choices = [track]
    Array.prototype.push.apply(this.choices, wrongAnswers);

    // Put the choices in random order
    shuffle(this.choices);

    if (typeof callback == "function") {
      callback();
    }
  }


  start(gameMode) {
    this.gameMode = gameMode;
    this.score = 0;
    this.currentQuestionIndex = 0;
    $("#quizPlaylist").text(this.playlistInfo.name);
    $("#numberOfSongs").text(this.numOfQuestions);
    showElementsBySelectors(["#progressBarContainer", "#quizDetailsContainer"]);
    $("#progressBar div").width("100%");

    this.nextQuestion();
  }


  getPlaylistTracks(playlistInfo, callback) {
    this.playlistInfo = playlistInfo;
    this.setRandomPlaylistOffset();

    const options = {
      offset: this.playlistOffset
    }

    this.songMaster.getPlaylistTracks(this.playlistInfo.id, options, (getPlaylistTracksResult) => {
      this.playlistTracks = getPlaylistTracksResult.items.map(item => item.track);

      if (typeof callback == "function") {
        callback();
      }
    });
  }


  generateAnswers(callback) {
    const tracks = sampleSize(this.playlistTracks, this.numOfQuestions);

    this.answerTracks = tracks.map(track => this.extractTrackData(track));

    if (typeof callback == "function") {
      callback();
    }
  }


  extractTrackData(track) {
    return {
      trackId: track.id,
      trackName: track.name,
      trackDuration: track.duration_ms,
      trackArtists: this.getTrackArtists(track)
    };
  }


  getTrackArtists(track) {
    const trackArtistNames = track.artists.map(artist => artist.name);

    return trackArtistNames.join(" & ");
  }


  stop() {
    try {
      clearInterval(this.intervalBetweenQuestions);
      clearInterval(this.intervalDuringQuestion);
    } catch {
      ;
    } finally {
      $("#progressBar div").stop();
      this.songMaster.pause();
    }
  }


  nextQuestion(callback) {
    $("#content").html(`<div id="counter"></div>`);
    $("#volume").prop("disabled", true);

    const trackId = this.answerTracks[this.currentQuestionIndex].trackId;
    const positionMs = this.getRandomPosition();

    this.songMaster.mutePlayer(() => {
      this.songMaster.startPlaylistOnWebPlayer(trackId, positionMs, (playError) => {
        if (playError) {
          new ErrorHandler("Error occurred while starting the song on Spotify.", false, "Re-trying with new song...")
          this.switchAnswerTrack(this.currentQuestionIndex);
          this.nextQuestion();
        } else {
          this.countdownBeforeNextSong();
        }
      });
    });

    if (typeof callback == "function") {
      callback();
    }
  }


  getRandomPosition() {
    const trackDuration = this.answerTracks[this.currentQuestionIndex].trackDuration;
    return Math.floor(Math.random() * (trackDuration - 1000 * (this.guessTimeInSeconds + this.timeToWait + 1)));
  }


  switchAnswerTrack(index) {
    const newTrack = this.getAnotherUniqueTrack();
    this.answerTracks[index] = newTrack;
  }


  getAnotherUniqueTrack() {
    const currentAnswerTrackIds = this.answerTracks.map(track => track.trackId);
    const possibleNewTracks = this.playlistTracks.filter(item => !currentAnswerTrackIds.includes(item.id));

    return this.extractTrackData(sampleSize(possibleNewTracks)[0]);
  }


  setQuestionTarget(callback) {
    if (this.gameMode === "guessTitles") {
      this.target = "trackName";
    } else if (this.gameMode === "guessArtists") {
      this.target = "trackArtists";
    } else if (this.gameMode === "guessRandom") {
      this.target = ["trackName", "trackArtists"][Math.floor(Math.random() * 2)];
    }

    if (typeof callback == "function") {
      callback();
    }
  }


  countdownBeforeNextSong() {
    this.secondsToWait = this.timeToWait + 1;
    this.intervalBetweenQuestions = setInterval(() => {
      this.secondsToWait--;

      if (this.secondsToWait > 0) {
        $("#counter").text(this.secondsToWait);
      } else {
        this.playNextSong();
      }
    }, 1000);
  }


  playNextSong() {
    clearInterval(this.intervalBetweenQuestions);
    $("#volume").prop("disabled", false);

    // Need to subtract 1, because setInterval adds 1 sec delay by default
    this.remainingGuessTimeInSeconds = this.guessTimeInSeconds - 1;

    this.setQuestionTarget(() => {
      this.answerTracks[this.currentQuestionIndex].guessTarget = this.targetTexts[this.target];
      this.generateChoices(() => {
        this.displayChoices();
      });
    });

    this.songMaster.unmutePlayer(() => {
      this.startTimer();
      this.answerTracks[this.currentQuestionIndex].startTime = new Date();

      this.intervalDuringQuestion = setInterval(() => {
        if (this.remainingGuessTimeInSeconds === 0) {
          this.finishQuestion();
        }
        this.remainingGuessTimeInSeconds -= 1;
      }, 1000);

      this.currentQuestionIndex += 1;
    });
  }


  startTimer() {
    const progressBarDiv = $("#progressBar").find("div");
    progressBarDiv.width("100%").animate({
      width: 0
    }, this.guessTimeInSeconds * 1000, "linear");
  }


  finishQuestion() {
    $("#progressBar div").stop();
    clearInterval(this.intervalDuringQuestion);
    this.songMaster.pause();

    // Check whether the chosen answer was correct
    const chosenAnswer = $(".chosen-answer").data("track-id");
    const correctAnswer = this.answerTracks[this.currentQuestionIndex - 1].trackId;
    this.checkAnswer(correctAnswer, chosenAnswer);

    if (this.currentQuestionIndex < this.answerTracks.length) {
      setTimeout(() => {
        this.nextQuestion();
      }, 4000);
    } else {
      setTimeout(() => {
        this.displayResults();
      }, 4000);
    }
  }


  checkAnswer(correctAnswer, chosenAnswer, callback) {
    const chosenAnswerElement = $(".chosen-answer");
    const correctAnswerElement = $(`button[data-track-id=${correctAnswer}]`);

    // Set back all choices to default before animation
    $(".track-choice-button").addClass("text-white bg-teal-500 hover:bg-teal-700").removeClass("text-black bg-orange-500 hover:bg-orange-700");

    if (correctAnswer === chosenAnswer) {
      this.score += 1;
      this.answerTracks[this.currentQuestionIndex - 1].guessedCorrectly = true;
      chosenAnswerElement.removeClass("border-teal-500 hover:border-teal-700").addClass("border-black");
    } else {
      this.answerTracks[this.currentQuestionIndex - 1].guessedCorrectly = false;
      chosenAnswerElement.removeClass("bg-orange-500 hover:bg-orange-700 text-white border-teal-500 hover:border-teal-700").addClass("text-black bg-red-500 hover:bg-red-700 border-black")
    }

    // Animate correct answer
    setInterval(function() {
      correctAnswerElement.toggleClass("bg-teal-500 text-white text-black");
      setTimeout(function() {
        correctAnswerElement.toggleClass("bg-teal-500 text-white text-black");
      }, 500)
    }, 1000);

    if (typeof callback == "function") {
      callback();
    }
  }


  displayChoices(callback) {
    const templateValues = {};

    let targetText = this.targetTexts[this.target] || this.targetTexts.default;

    for (let i = 0; i < this.choices.length; i++) {
      templateValues[`track${i+1}Id`] = this.choices[i].trackId;
      templateValues[`track${i+1}Data`] = this.choices[i][this.target];
    }
    templateValues.target = targetText;

    readHtmlIntoElement("guess_the_song.html", "#content", templateValues);

    if (typeof callback == "function") {
      callback();
    }
  }


  displayResults() {
    hideElementsBySelectors(["#progressBarContainer", "#quizDetailsContainer"]);

    let rowColorSuccessClass = "bg-lime-500";
    let rowColorFailClass = "bg-red-500";

    let htmlContent = `
    <div class="flex flex-col mt-auto mb-auto">
      <div class="text-center p-6">
        <h1 class="text-2xl m-6">Summary</h1>
        ${this.generateSummaryTableHtml()}

      </div>
      <div>
        <h1 class="text-2xl m-6 text-center">Details</h1>
        ${this.generateDetailsTableHtml()}
      </div>
    </div>
    `

    $("#content").html(htmlContent);
  }


  generateSummaryTableHtml() {
    let game_mode = null;

    if (this.gameMode === "guessTitles") {
      game_mode = "Guess the title";
    } else if (this.gameMode === "guessArtists") {
      game_mode = "Guess the artist(s)";
    } else if (this.gameMode === "guessRandom") {
      game_mode = "Mixed";
    }

    let htmlContent = `
        <table class="border-collapse table-auto text-base m-auto">
          <tbody>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 text-black text-left">Playlist</td>
              <td class="border-b border-black-900 p-4 text-black text-left">${this.playlistInfo.name}</td>
            </tr>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 text-black text-left">Game mode</td>
              <td class="border-b border-black-900 p-4 text-black text-left">${game_mode}</td>
            </tr>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 text-black text-left">Number of songs played</td>
              <td class="border-b border-black-900 p-4 text-black text-left">${this.numOfQuestions}</td>
            </tr>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 text-black text-left">Correct answers</td>
              <td class="border-b border-black-900 p-4 text-black text-left">${this.score}</td>
            </tr>
          </tbody>
        </table>
    `;
    return htmlContent;
  }


  generateDetailsTableHtml() {
    let htmlContent = `
          <table class="border-collapse table-auto text-base m-auto mb-12">
            <thead>
              <tr class="text-white bg-gray-700 font-bold">
                <th class="border-b p-4">Artist</th>
                <th class="border-b p-4">Title</th>
                <th class="border-b p-4">Guess time</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-slate-800">
    `;

    const tableRowHtml = `
      <tr class="text-white bg-gray-500 font-medium text-left">
        <td class="border-b border-slate-100 p-4">{{artist}}</td>
        <td class="border-b border-slate-100 p-4">{{name}}</td>
        <td class="border-b border-slate-100 p-4">{{guessTime}}</td>
      </tr>
    `;

    for (let i = 0; i < this.answerTracks.length; i++) {
      let track = this.answerTracks[i];
      let start = track.startTime;
      let end = track.answerTime;
      let guessTimeInSec = (end - start) / 1000;
      guessTimeInSec = isNaN(guessTimeInSec) ? "Not answered" : guessTimeInSec;

      let templateValues = {
        artist: track.trackArtists,
        name: track.trackName,
        guessTime: guessTimeInSec,
        guessTarget: track.guessTarget
      }


      if (track.guessTarget === "title") {
        if (track.guessedCorrectly) {
          templateValues.name = "<i class=\"fas fa-check rounded-full text-center p-2 bg-black text-green-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues.name;
        } else {
          templateValues.name = "<i class=\"fas fa-times rounded-full text-center p-2 bg-black text-red-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues.name;
        }
      } else if (track.guessTarget === "artist(s)") {
        if (track.guessedCorrectly) {
          templateValues.artist = "<i class=\"fas fa-check rounded-full text-center p-2 bg-black text-green-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues.artist;
        } else {
          templateValues.artist = "<i class=\"fas fa-times rounded-full text-center p-2 bg-black text-red-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues.artist;
        }
      }

      let newTableRow = insertTemplateIntoHtml(templateValues, tableRowHtml);

      htmlContent += newTableRow;
    }

    htmlContent += `
            </tbody>
          </table>
    `;

    return htmlContent;
  }


  setAnswerTime() {
    this.answerTracks[this.currentQuestionIndex - 1].answerTime = new Date();
  }
}
