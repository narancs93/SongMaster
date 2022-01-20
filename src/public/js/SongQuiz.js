class SongQuiz {
  constructor(options) {
    ({
      songMaster: this._songMaster,
      timeToWait: this._timeToWait,
      timeToGuess: this._timeToGuess,
      numOfQuestions: this._numOfQuestions
    } = options);
    this._timeToWait = (this._timeToWait === undefined) ? 3 : this._timeToWait;
    this._timeToGuess = (this._timeToGuess === undefined) ? 10 : this._timeToGuess;
    this._numOfQuestions = (this._numOfQuestions === undefined) ? 10 : this._numOfQuestions;

    $("#playerScore").hide();
    $("#progressBar").hide();
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

  get timeToGuess() {
    return this._timeToGuess;
  }

  set timeToGuess(newTimeToGuess) {
    this._timeToGuess = newTimeToGuess;
  }

  get secondsToWait() {
    return this._secondsToWait;
  }

  set secondsToWait(newSecondsToWait) {
    this._secondsToWait = newSecondsToWait;
  }

  get secondsToGuess() {
    return this._secondsToGuess;
  }

  set secondsToGuess(newSecondsToGuess) {
    this._secondsToGuess = newSecondsToGuess;
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
    this.songMaster.stopProgressBar = false;
    this.displayScore();
    $("#playerScore").show();
    $("#progressBar").show();

    this.setRandomPlaylistOffset();

    const options = {
      offset: this.playlistOffset
    }

    this.songMaster.getPlaylistTracks(this.playlist.id, options, (getPlaylistTracksResult) => {
      this.playlistTracks = getPlaylistTracksResult["items"];
      this.answerTracks = sampleSize(this.playlistTracks, this.numOfQuestions);
      this.currentQuestionIndex = 0;

      this.nextQuestion();
    });
  }

  stop() {
    try {
      clearInterval(this.intervalBetweenQuestions);
      clearInterval(this.intervalDuringQuestion);
    } catch {
      ;
    } finally {
      this.songMaster.stopProgressBar = true;
      this.songMaster.pause();
    }
  }

  nextQuestion(callback) {
    this.generateChoices();

    // Spotify play API is not accepting track URI, only album/playlist
    // To play a specific song, need to pass an album/playlist with correct offset
    // Offset = offset passed to Playlist tracks API + index of track in the result of 100 tracks
    const trackIndexInResults = this.playlistTracks.indexOf(this.answerTracks[this.currentQuestionIndex]);
    const trackOffset = this.playlistOffset + trackIndexInResults;

    this.secondsToWait = this.timeToWait;
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
    } else {
      clearInterval(this.intervalBetweenQuestions);
      this.secondsToGuess = this.timeToGuess;

      this.displayChoices(() => {
        let progressBar = $("#progressBar");
        progress(this.secondsToGuess, this.secondsToGuess, progressBar, this.songMaster);
      });

      this.songMaster.startPlaylistOnWebPlayer(this.playlist.id, trackOffset);

      this.intervalDuringQuestion = setInterval(() => {
        if (this.secondsToGuess === 0) {
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
        this.secondsToGuess -= 1;
      }, 1000);

      this.currentQuestionIndex += 1;
    }
  }

  displayChoices(callback) {
    const templateValues = {
      timeLeft: this.secondsToGuess
    };

    for (let i = 0; i < this.choices.length; i++) {
      templateValues[`track${i+1}Id`] = this.choices[i].track.id;
      templateValues[`track${i+1}Name`] = this.choices[i].track.name;
    }

    readHtmlIntoElement("guess_the_song.html", "#content", templateValues);

    if (typeof callback == 'function') {
      callback();
    }
  }

  displayResults() {
    $("#content").text(`${this.score}/${this.numOfQuestions}`);
  }

  checkAnswer(correctAnswer, chosenAnswer, callback) {
    if (correctAnswer === chosenAnswer) {
      this.score += 1;
    }

    callback();
  }

  displayScore() {
    $("#playerScore").text(`Score: ${this.score}/${this.numOfQuestions}`)
  }
}
