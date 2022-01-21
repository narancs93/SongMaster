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
    this.correctTrackId = track.trackId;

    const wrongAnswerPool = this.playlistTracks.filter(e => e.track.id !== this.correctTrackId);
    const wrongAnswers = sampleSize(wrongAnswerPool, 3);

    for (let i = 0; i < wrongAnswers.length; i++) {
      wrongAnswers[i] = this.extractTrackData(wrongAnswers[i]);
    }

    // Create array for the 4 choices
    this.choices = [track]
    Array.prototype.push.apply(this.choices, wrongAnswers);

    // Make order random
    shuffle(this.choices);
  }

  start() {
    this.score = 0;
    this.currentQuestionIndex = 0;
    this.songMaster.stopProgressBar = false;
    this.displayScore();
    $("#playerScore").show();
    $("#progressBar").show();

    this.nextQuestion();
  }

  getPlaylistTracks(callback) {
    this.setRandomPlaylistOffset();

    const options = {
      offset: this.playlistOffset
    }

    this.songMaster.getPlaylistTracks(this.playlist.id, options, (getPlaylistTracksResult) => {
      this.playlistTracks = getPlaylistTracksResult["items"];

      if (typeof callback == 'function') {
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

    if (typeof callback == 'function') {
      callback();
    }
  }

  extractTrackData(track) {
    let trackData = {};

    let trackId = track.track.id;
    let trackName = track.track.name;
    let trackArtistArray = track.track.artists;

    let trackArtistNames = [];
    for (let j = 0; j < trackArtistArray.length; j++) {
      trackArtistNames.push(trackArtistArray[j].name);
    }
    let trackArtists = trackArtistNames.join(' & ');

    trackData['trackId'] = trackId;
    trackData['trackName'] = trackName;
    trackData['trackArtists'] = trackArtists;

    return trackData;
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
    //const trackIndexInResults = this.playlistTracks.indexOf(this.answerTracks[this.currentQuestionIndex]);
    const trackIndex = this.getTrackIndex();
    const trackOffset = this.playlistOffset + trackIndex;

    this.secondsToWait = this.timeToWait;
    $("#content").html(this.secondsToWait);

    this.intervalBetweenQuestions = setInterval(() => {
      this.countdownBeforeNextSong(trackOffset);
    }, 1000);

    if (typeof callback == 'function') {
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

  countdownBeforeNextSong(trackOffset) {
    this.secondsToWait--;
    if (this.secondsToWait > 0) {
      $("#content").html(this.secondsToWait);
    } else {
      clearInterval(this.intervalBetweenQuestions);
      this.secondsToGuess = this.timeToGuess;

      this.displayChoices();

      this.songMaster.startPlaylistOnWebPlayer(this.playlist.id, trackOffset, () => {
        let progressBar = $("#progressBar");
        progress(this.secondsToGuess, this.secondsToGuess, progressBar, this.songMaster);

        this.answerTracks[this.currentQuestionIndex].startTime = new Date();

        this.intervalDuringQuestion = setInterval(() => {
          if (this.secondsToGuess === 0) {
            clearInterval(this.intervalDuringQuestion);
            this.songMaster.pause();

            // Check whether the chosen answer was correct
            const chosenAnswer = $(".chosen-answer").text().trim();
            const correctAnswer = this.answerTracks[this.currentQuestionIndex - 1].trackName;
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
      });
    }
  }

  displayChoices(callback) {
    const templateValues = {
      timeLeft: this.secondsToGuess
    };

    for (let i = 0; i < this.choices.length; i++) {
      templateValues[`track${i+1}Id`] = this.choices[i].trackId;
      templateValues[`track${i+1}Name`] = this.choices[i].trackName;
    }

    readHtmlIntoElement("guess_the_song.html", "#content", templateValues);

    if (typeof callback == 'function') {
      callback();
    }
  }

  displayResults() {
    $("#playerScore").hide();
    $("#progressBar").hide();
    let htmlContent = `
    <div class="flex flex-col mt-auto mb-auto">
      <div class="text-center p-6">
        <h1 class="text-2xl">Result</h1>
        <h2 class="text-lg">Correct answers: ${this.score}/${this.numOfQuestions}</h2>
      </div>
      <div>
          <table class="border-collapse table-auto text-base">
            <thead>
              <tr>
                <th class="border-b font-medium p-4 pt-0 pb-3 text-slate-400">Artist</th>
                <th class="border-b font-medium p-4 pt-0 pb-3 text-slate-400">Title</th>
                <th class="border-b font-medium p-4 pt-0 pb-3 text-slate-400">Guess time</th>
                <th class="border-b font-medium p-4 pt-0 pb-3 text-slate-400">Is correct?</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-slate-800">
    `

    for (let i = 0; i < this.answerTracks.length; i++) {
      let track = this.answerTracks[i];
      let start = track.startTime;
      let end = track.answerTime;
      let guessTimeInSec = (end - start) / 1000;
      guessTimeInSec = isNaN(guessTimeInSec) ? 'Not answered' : guessTimeInSec;

      let tmp = {
        'artist': track.trackArtists,
        'name': track.trackName,
        'guessTime': guessTimeInSec,
        'guessedCorrectly': (track.guessedCorrectly) ? 'Yes' : 'No'
      }

      const tableRowHtml = `
        <tr>
          <td class="border-b border-slate-100 p-4 pl-8 text-slate-500 text-left">${tmp.artist}</td>
          <td class="border-b border-slate-100 p-4 pl-8 text-slate-500 text-left">${tmp.name}</td>
          <td class="border-b border-slate-100 p-4 pl-8 text-slate-500 text-left">${tmp.guessTime}</td>
          <td class="border-b border-slate-100 p-4 pl-8 text-slate-500 text-left">${tmp.guessedCorrectly}</td>
        </tr>
      `

      htmlContent += tableRowHtml;
    }

    htmlContent += `
            </tbody>
          </table>
        </div>
      </div>
    `
    $("#content").html(htmlContent);
    //$("#content").text(`${this.score}/${this.numOfQuestions}`);
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
    $("#playerScore").text(`Score: ${this.score}/${this.currentQuestionIndex}`)
  }

  setAnswerTime() {
    this.answerTracks[this.currentQuestionIndex - 1].answerTime = new Date();
  }
}
