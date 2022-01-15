class SongQuiz {
  constructor(songMaster = null) {
    this._songMaster = songMaster;
    this._secondsToGuess = 20;
  }

  get playlist() {
    return this._playlist;
  }

  set playlist(newPlaylist) {
    this._playlist = newPlaylist;
  }

  get offset() {
    return this._offset;
  }

  set offset(newOffset) {
    this._offset = newOffset;
  }

  get playlistTracksData() {
    return this._playlistTracksData;
  }

  set playlistTracksData(newPlaylistTracksData) {
    this._playlistTracksData = newPlaylistTracksData;
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

  setRandomPlaylistOffset() {
    // Set random offset based on number of tracks in playlist
    // 100 tracks are returned by the API
    const numOfTracks = this.playlist.numOfTracks;

    this.playlistOffset = 0;
    if (numOfTracks > 100) {
      this.offset = Math.floor(Math.random() * (numOfTracks - 100));
    }
  }

  generateChoices() {
    const playlist = this.playlist;
    const track = this.answerTracks[this.currentQuestion];

    this._correctTrackId = track.track.id;

    const wrongAnswerPool = this.playlistTracks.filter(e => e !== track);
    const wrongAnswers = sampleSize(wrongAnswerPool, 3);

    // Create array for the 4 choices
    this._choices = [track]
    Array.prototype.push.apply(this._choices, wrongAnswers);

    // Make order random
    shuffle(this._choices);
  }

  start() {
    this.setRandomPlaylistOffset();

    const options = {
      offset: this.offset
    }

    this._songMaster.getPlaylistTracks(this.playlist.id, options, (getPlaylistTracksResult) => {
      this.playlistTracks = getPlaylistTracksResult["items"];
      this.answerTracks = sampleSize(this.playlistTracks, 10);
      this.currentQuestion = 0;

      this.nextQuestion();
    });
  }

  nextQuestion(callback) {
    this.generateChoices();

    // Spotify play API is not accepting track URI, only album/playlist
    // To play a specific song, need to pass an album/playlist with correct offset
    // Offset = offset passed to Playlist tracks API + index of track in the result of 100 tracks
    const trackIndexInResults = this.playlistTracks.indexOf(this.answerTracks[this.currentQuestion]);
    const trackOffset = this.offset + trackIndexInResults;

    // Count down from 5 seconds
    $("#content").html(5);
    var counter = 4;

    var interval = setInterval(() => {
      if (counter > 0) {
        $("#content").html(counter);
      }
      counter--;

      if (counter === -1) {
        clearInterval(interval);

        const templateValues = {
          timeLeft: this._secondsToGuess
        };

        for (var i = 0; i < this._choices.length; i++) {
          templateValues[`track${i+1}Id`] = this._choices[i].track.id;
          templateValues[`track${i+1}Name`] = this._choices[i].track.name;
        }

        readHtmlIntoElement("guess_the_song.html", "#content", templateValues, () => {
          var progressBar = $("#progressBar");
          progress(this._secondsToGuess, this._secondsToGuess, progressBar);
        });


        var songTimerCount = this._secondsToGuess;
        this._songTimer = setInterval(() => {
          if (songTimerCount === this._secondsToGuess) {
            this._songMaster.startPlaylistOnWebPlayer(this.playlist.id, trackOffset);
          }
          if (songTimerCount === 0) {
            clearInterval(this._songTimer);
            this._songMaster.pause();
            this.nextQuestion();
          }
          songTimerCount -= 1;
        }, 1000);

        this.currentQuestion += 1;

        if (this.currentQuestion === this.answerTracks.length) {
          clearInterval(this._songTimer);
        }
      }
    }, 1000);

    $(document).on("click", ".track-choice-button", (evt) => {
      const clickedTrackId = $(evt.target).data('track-id')

      $("#header").hide();
      
      if (clickedTrackId === this._correctTrackId) {
        $("#choices").text("Correct answer.");
      } else {
        $("#choices").text("Wrong answer.");
      }
    });

    if (typeof callback == 'function') {
      callback();
    }

  }
}
