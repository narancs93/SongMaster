class SongQuiz {
  constructor(songMaster = null) {
    this._songMaster = songMaster;
    this._secondsToGuess = 10;

    $("#playerScore").hide();
    $("#progressBar").hide();
  }

  get songMaster() {
    return this._songMaster;
  }

  set songMaster(newSongMaster) {
    this._songMaster = newSongMaster;
  }

  get secondsToGuess() {
    return this._secondsToGuess;
  }

  set secondsToGuess(newSecondsToGuess) {
    this._secondsToGuess = newSecondsToGuess;
  }

  get playlist() {
    return this._playlist;
  }

  set playlist(newPlaylist) {
    this._playlist = newPlaylist;
  }

  get playlistOffset() {
    return this._playlistOffset;
  }

  set playlistOffset(newPlaylistOffset) {
    this._playlistOffset = newPlaylistOffset;
  }

  get offset() {
    return this._offset;
  }

  set offset(newOffset) {
    this._offset = newOffset;
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

  get secondsToWait() {
    return this._secondsToWait;
  }

  set secondsToWait(newSecondsToWait) {
    this._secondsToWait = newSecondsToWait;
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
    const numOfTracks = this.playlist.numOfTracks;

    this.playlistOffset = 0;
    if (numOfTracks > 100) {
      this.offset = Math.floor(Math.random() * (numOfTracks - 100));
    }
  }

  generateChoices() {
    const track = this.answerTracks[this.currentQuestionIndex];

    this.correctTrackId = track.track.id;

    const wrongAnswerPool = this.playlistTracks.filter(e => e !== track);
    const wrongAnswers = sampleSize(wrongAnswerPool, 3);

    // Create array for the 4 choices
    this.choices = [track]
    Array.prototype.push.apply(this.choices, wrongAnswers);

    // Make order random
    shuffle(this.choices);
  }

  start() {
    this.score = 0;
    this.displayScore();
    $("#playerScore").show();
    $("#progressBar").show();

    this.setRandomPlaylistOffset();

    const options = {
      offset: this.offset
    }

    this.songMaster.getPlaylistTracks(this.playlist.id, options, (getPlaylistTracksResult) => {
      this.playlistTracks = getPlaylistTracksResult["items"];
      this.answerTracks = sampleSize(this.playlistTracks, 10);
      this.currentQuestionIndex = 0;

      this.nextQuestion();
    });
  }

  nextQuestion(callback) {
    this.generateChoices();

    // Spotify play API is not accepting track URI, only album/playlist
    // To play a specific song, need to pass an album/playlist with correct offset
    // Offset = offset passed to Playlist tracks API + index of track in the result of 100 tracks
    const trackIndexInResults = this.playlistTracks.indexOf(this.answerTracks[this.currentQuestionIndex]);
    const trackOffset = this.offset + trackIndexInResults;

    // Count down from 5 seconds
    this.secondsToWait = 5;
    $("#content").html(this.secondsToWait);

    this.intervalBetweenQuestions = setInterval(() => {
      this.countdownBeforeNextSong(trackOffset);
    }, 1000);

    if (typeof callback == 'function') {
      callback();
    }
  }

  countdownBeforeNextSong(trackOffset) {
    this.secondsToWait--;
    if (this.secondsToWait > 0) {
      $("#content").html(this.secondsToWait);
    }

    if (this.secondsToWait === 0) {
      clearInterval(this.intervalBetweenQuestions);

      this.displayChoices();

      this.songMaster.startPlaylistOnWebPlayer(this.playlist.id, trackOffset);

      let songTimerCount = this.secondsToGuess;
      this.intervalDuringQuestion = setInterval(() => {
        if (songTimerCount === 0) {
          clearInterval(this.intervalDuringQuestion);
          this.songMaster.pause();

          // Check whether the chosen answer was correct
          const chosenAnswer = $(".chosen-answer").text().trim();
          const correctAnswer = this.answerTracks[this.currentQuestionIndex - 1].track.name;
          this.checkAnswer(correctAnswer, chosenAnswer, () => {
            this.displayScore();
          });

          if (this.currentQuestionIndex < this.answerTracks.length) {
            this.nextQuestion();
          } else {
            this.displayResults();
          }
        }
        songTimerCount -= 1;
      }, 1000);

      this.currentQuestionIndex += 1;
    }
  }

  displayChoices() {
    const templateValues = {
      timeLeft: this.secondsToGuess
    };

    for (let i = 0; i < this.choices.length; i++) {
      templateValues[`track${i+1}Id`] = this.choices[i].track.id;
      templateValues[`track${i+1}Name`] = this.choices[i].track.name;
    }

    readHtmlIntoElement("guess_the_song.html", "#content", templateValues, () => {
      let progressBar = $("#progressBar");
      progress(this.secondsToGuess, this.secondsToGuess, progressBar);
    });
  }

  displayResults() {
    console.log("DisplayResults");
    $("#content").text(`${this.score}/10`);
  }

  checkAnswer(correctAnswer, chosenAnswer, callback) {
    if (correctAnswer === chosenAnswer) {
      this.score += 1;
    }

    callback();
  }

  displayScore() {
    $("#playerScore").text(`Score: ${this.score}/10`)
  }
}
