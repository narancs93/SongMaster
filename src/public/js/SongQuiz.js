class SongQuiz {
  constructor(songMaster) {
    this._songMaster = songMaster;
    this._timeToWait = 3;
    this._guessTimeInSeconds = 15;
    this._numOfQuestions = 10;

    this.targetTexts = {
      "trackName": "title",
      "trackArtists": "artist(s)",
      "default": "song/artist(s)"
    };

    hideElementsBySelectors(["#playerScoreContainer", "#progressBarContainer", "#quizDetailsContainer"]);
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
        this._playlistInfo.name = getPlaylistResult["name"];
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

    let wrongAnswerPool = this.playlistTracks.filter(e => e.track.id !== this.correctTrackId);

    if (this.target === "trackArtists") {
      // Make sure correct artist(s) does not appear twice in choices
      wrongAnswerPool = wrongAnswerPool.filter(e => correctArtists !== this.getTrackArtists(e.track));

      // Also make sure, that incorrect artist(s) cannot appear twice
      let tracksWithUniqueArtists = [];
      let uniqueArtists = [];

      for (let i = 0; i < wrongAnswerPool.length; i++) {
        const artist = this.getTrackArtists(wrongAnswerPool[i].track);
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
    this.displayScore();
    $("#quizPlaylist").text(this.playlistInfo.name);
    $("#numberOfSongs").text(this.numOfQuestions);
    showElementsBySelectors(["#playerScoreContainer", "#progressBarContainer", "#quizDetailsContainer"]);
    $('#progressBar').find('div').width('100%');

    this.nextQuestion();
  }

  getPlaylistTracks(playlistInfo, callback) {
    this.playlistInfo = playlistInfo;
    this.setRandomPlaylistOffset();

    const options = {
      offset: this.playlistOffset
    }

    this.songMaster.getPlaylistTracks(this.playlistInfo.id, options, (getPlaylistTracksResult) => {
      this.playlistTracks = getPlaylistTracksResult["items"];

      if (typeof callback == "function") {
        callback();
      }
    });
  }

  generateAnswers(callback) {
    const tracks = sampleSize(this.playlistTracks, this.numOfQuestions);

    this.answerTracks = [];

    for (let i = 0; i < tracks.length; i++) {
      let newAnswer = this.extractTrackData(tracks[i]);

      this.answerTracks.push(newAnswer);
    }

    if (typeof callback == "function") {
      callback();
    }
  }

  extractTrackData(track) {
    let trackData = {};

    let trackId = track.track.id;
    let trackName = track.track.name;
    let trackArtists = this.getTrackArtists(track.track)

    trackData["trackId"] = trackId;
    trackData["trackName"] = trackName;
    trackData["trackArtists"] = trackArtists;

    return trackData;
  }

  getTrackArtists(track) {
    let trackArtistArray = track.artists;

    let trackArtistNames = [];
    for (let j = 0; j < trackArtistArray.length; j++) {
      trackArtistNames.push(trackArtistArray[j].name);
    }
    return trackArtistNames.join(" & ");
  }

  stop() {
    try {
      clearInterval(this.intervalBetweenQuestions);
      clearInterval(this.intervalDuringQuestion);
    } catch {
      ;
    } finally {
      this.songMaster.pause();
    }
  }

  nextQuestion(callback) {
    $("#content").html(this.timeToWait);
    $("#volume").prop("disabled", true);

    const trackId = this.answerTracks[this.currentQuestionIndex].trackId;
    this.songMaster.mutePlayer(() => {
      this.songMaster.startPlaylistOnWebPlayer(trackId);
    });

    this.countdownBeforeNextSong();

    if (typeof callback == "function") {
      callback();
    }
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
    this.secondsToWait = this.timeToWait;
    this.intervalBetweenQuestions = setInterval(() => {
      this.secondsToWait--;

      if (this.secondsToWait > 0) {
        $("#content").html(this.secondsToWait);
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
      this.answerTracks[this.currentQuestionIndex]["guessTarget"] = this.targetTexts[this.target];
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
    const progressBarDiv = $('#progressBar').find('div');
    progressBarDiv.width('100%').animate({
      width: 0
    }, this.guessTimeInSeconds * 1000, "linear");
  }


  finishQuestion() {
    $('#progressBar').find('div').stop();
    clearInterval(this.intervalDuringQuestion);
    this.songMaster.pause();

    // Check whether the chosen answer was correct
    const chosenAnswer = $(".chosen-answer").data("track-id");
    const correctAnswer = this.answerTracks[this.currentQuestionIndex - 1].trackId;
    this.checkAnswer(correctAnswer, chosenAnswer, () => {
      this.displayScore();
    });

    if (this.currentQuestionIndex < this.answerTracks.length) {
      this.nextQuestion();
    } else {
      this.displayResults();
    }
  }


  displayChoices(callback) {
    const templateValues = {};

    let targetText = this.targetTexts[this.target] || this.targetTexts["default"];

    for (let i = 0; i < this.choices.length; i++) {
      templateValues[`track${i+1}Id`] = this.choices[i].trackId;
      templateValues[`track${i+1}Data`] = this.choices[i][this.target];
      templateValues[`target`] = targetText;
    }

    readHtmlIntoElement("guess_the_song.html", "#content", templateValues);

    if (typeof callback == "function") {
      callback();
    }
  }

  displayResults() {
    hideElementsBySelectors(["#playerScoreContainer", "#progressBarContainer", "#quizDetailsContainer"]);

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
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">Playlist</td>
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">${this.playlistInfo.name}</td>
            </tr>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">Game mode</td>
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">${game_mode}</td>
            </tr>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">Number of songs played</td>
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">${this.numOfQuestions}</td>
            </tr>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">Correct answers</td>
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">${this.score}</td>
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
        <td class="border-b border-slate-100 p-4 pl-8">{{artist}}</td>
        <td class="border-b border-slate-100 p-4 pl-8">{{name}}</td>
        <td class="border-b border-slate-100 p-4 pl-8">{{guessTime}}</td>
      </tr>
    `;

    for (let i = 0; i < this.answerTracks.length; i++) {
      let track = this.answerTracks[i];
      let start = track.startTime;
      let end = track.answerTime;
      let guessTimeInSec = (end - start) / 1000;
      guessTimeInSec = isNaN(guessTimeInSec) ? "Not answered" : guessTimeInSec;

      let templateValues = {
        "artist": track.trackArtists,
        "name": track.trackName,
        "guessTime": guessTimeInSec,
        "guessTarget": track["guessTarget"]
      }


      if (track["guessTarget"] === "title") {
        if (track["guessedCorrectly"]) {
          templateValues["name"] = "<i class=\"fas fa-check rounded-full text-center p-2 bg-black text-green-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues["name"];
        } else {
          templateValues["name"] = "<i class=\"fas fa-times rounded-full text-center p-2 bg-black text-red-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues["name"];
        }
      } else if (track["guessTarget"] === "artist(s)") {
        if (track["guessedCorrectly"]) {
          templateValues["artist"] = "<i class=\"fas fa-check rounded-full text-center p-2 bg-black text-green-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues["artist"];
        } else {
          templateValues["artist"] = "<i class=\"fas fa-times rounded-full text-center p-2 bg-black text-red-500\" style=\"width: 32px; height: 32px;\"></i> " + templateValues["artist"];
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

  checkAnswer(correctAnswer, chosenAnswer, callback) {
    if (correctAnswer === chosenAnswer) {
      this.score += 1;
      this.answerTracks[this.currentQuestionIndex - 1].guessedCorrectly = true;
    } else {
      this.answerTracks[this.currentQuestionIndex - 1].guessedCorrectly = false;
    }

    if (typeof callback == "function") {
      callback();
    }
  }

  displayScore() {
    $("#playerScore").text(`Score: ${this.score}/${this.currentQuestionIndex}`);
  }

  setAnswerTime() {
    this.answerTracks[this.currentQuestionIndex - 1].answerTime = new Date();
  }
}
