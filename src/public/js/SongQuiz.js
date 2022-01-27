class SongQuiz {
  constructor(options) {
    ({
      songMaster: this._songMaster,
      timeToWait: this._timeToWait,
      guessTimeInSeconds: this._guessTimeInSeconds,
      numOfQuestions: this._numOfQuestions
    } = options);

    this.targetTexts = {
      "trackName": "title",
      "trackArtists": "artist(s)",
      "default": "song/artist(s)"
    };

    this._timeToWait = (this._timeToWait === undefined) ? 3 : this._timeToWait;
    this._guessTimeInSeconds = (this._guessTimeInSeconds === undefined) ? 10 : this._guessTimeInSeconds;
    this._numOfQuestions = (this._numOfQuestions === undefined) ? 10 : this._numOfQuestions;

    $("#playerScoreContainer").hide();
    $("#progressBarContainer").hide();
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

  get playlist() {
    return this._playlist;
  }

  set playlist(newPlaylist) {
    this._playlist = newPlaylist;

    // Get name of the playlist
    this.songMaster.spotifyApi.getPlaylist(this.playlist.id, (getPlaylistError, getPlaylistResult) => {
      if (getPlaylistError) console.error("Error occurred while getting playlist data.", getPlaylistError);
      else {
        this._playlist.name = getPlaylistResult["name"];
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
    if (this.playlist.numOfTracks > 100) {
      this.playlistOffset = Math.floor(Math.random() * (this.playlist.numOfTracks - 100));
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
    $("#playerScoreContainer").show();
    $("#progressBarContainer").show();

    this.nextQuestion();
  }

  getPlaylistTracks(callback) {
    this.setRandomPlaylistOffset();

    const options = {
      offset: this.playlistOffset
    }

    this.songMaster.getPlaylistTracks(this.playlist.id, options, (getPlaylistTracksResult) => {
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
    // Spotify play API is not accepting track URI, only album/playlist
    // To play a specific song, need to pass an album/playlist with correct offset
    // Offset = offset passed to Playlist tracks API + index of track in the result of 100 tracks
    //const trackIndexInResults = this.playlistTracks.indexOf(this.answerTracks[this.currentQuestionIndex]);
    const trackIndex = this.getTrackIndex();
    const trackOffset = this.playlistOffset + trackIndex;

    this.secondsToWait = this.timeToWait;
    $("#content").html(this.secondsToWait);

    this.songMaster.mutePlayer(() => {
      this.songMaster.startPlaylistOnWebPlayer(this.playlist.id, trackOffset);
    });

    this.intervalBetweenQuestions = setInterval(() => {
      this.secondsToWait--;
      this.countdownBeforeNextSong(trackOffset);
    }, 1000);

    if (typeof callback == "function") {
      callback();
    }
  }

  getTrackIndex() {
    let index = null;
    for (let i = 0; i < this.playlistTracks.length; i++) {
      if (this.playlistTracks[i].track.id === this.answerTracks[this.currentQuestionIndex].trackId) {
        return i;
      }
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

  countdownBeforeNextSong(trackOffset) {
    if (this.secondsToWait > 0) {
      $("#content").html(this.secondsToWait);
    } else {
      clearInterval(this.intervalBetweenQuestions);
      // Need to subtract 1, because setInterval adds 1 sec delay by default
      this.remainingGuessTimeInSeconds = this.guessTimeInSeconds - 1;

      this.setQuestionTarget(() => {
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
    const templateValues = {
      timeLeft: this.remainingGuessTimeInSeconds
    };

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
    $("#playerScoreContainer").hide();
    $("#progressBarContainer").hide();

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
    let htmlContent = `
        <table class="border-collapse table-auto text-base m-auto">
          <tbody>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">Playlist</td>
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">${this.playlist.name}</td>
            </tr>
            <tr class="bg-gray-100">
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">Game mode</td>
              <td class="border-b border-black-900 p-4 pl-8 text-black text-left">Guess the ${this.targetTexts[this.target]}</td>
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
          <table class="border-collapse table-auto text-base">
            <thead>
              <tr class="bg-gray-700">
                <th class="border-b font-medium p-4 text-white">Artist</th>
                <th class="border-b font-medium p-4 text-white">Title</th>
                <th class="border-b font-medium p-4 text-white">Guess time</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-slate-800">
    `;

    const tableRowHtml = `
      <tr class="{{rowColorClass}}">
        <td class="border-b border-slate-100 p-4 pl-8 text-black text-left">{{artist}}</td>
        <td class="border-b border-slate-100 p-4 pl-8 text-black text-left">{{name}}</td>
        <td class="border-b border-slate-100 p-4 pl-8 text-black text-left">{{guessTime}}</td>
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
        "rowColorClass": (track.guessedCorrectly) ? "bg-lime-500" : "bg-red-500"
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

    callback();
  }

  displayScore() {
    $("#playerScore").text(`Score: ${this.score}/${this.currentQuestionIndex}`);
  }

  setAnswerTime() {
    this.answerTracks[this.currentQuestionIndex - 1].answerTime = new Date();
  }
}
