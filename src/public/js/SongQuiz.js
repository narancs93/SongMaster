class SongQuiz {
  constructor(playlist = null) {
    this._playlist = playlist;
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

  showQuestion(callback) {
    const thisOjbect = this;
    const playlistTracks = thisOjbect.playlistTracksData["items"];

    // Select 4 distinct random tracks from the 100 results for 4 answers
    const randomTracks = sampleSize(playlistTracks, 4);

    // Extract the required data from the results returned by API
    thisOjbect._choices = [];

    for (var i = 0; i < randomTracks.length; i++) {
      var trackData = randomTracks[i]["track"];
      var trackId = trackData["id"];
      var artists = trackData["artists"];
      var trackName = trackData["name"];

      thisOjbect._choices.push({
        trackId: trackId,
        artists: artists,
        trackName: trackName
      });
    }

    // Randomly select which of the 4 songs will be the correct answer
    var correctAnswerIndex = Math.floor(Math.random() * 4);
    thisOjbect._correctTrackId = thisOjbect._choices[correctAnswerIndex].trackId;

    // Show the choices in the content div element
    const templateValues = {};

    for (var i = 0; i < thisOjbect._choices.length; i++) {
      templateValues[`track${i+1}Id`] = thisOjbect._choices[i].trackId;
      templateValues[`track${i+1}Name`] = thisOjbect._choices[i].trackName;
    }

    readHtmlIntoElement("guess_the_song.html", "#content", templateValues);

    // Spotify play API is not accepting track URI, only album/playlist
    // To play a specific song, need to pass an album/playlist with correct offset
    // Offset = offset passed to Playlist tracks API + index of track in the result of 100 tracks
    const trackIndexInResults = playlistTracks.indexOf(randomTracks[correctAnswerIndex]);
    const trackOffset = thisOjbect.offset + trackIndexInResults;

    $(document).on("click", ".track-choice-button", function() {
      const clickedTrackId = $(this).data("track-id");

      if (clickedTrackId === thisOjbect._correctTrackId) {
        $("#content").text("Correct answer.");
      } else {
        $("#content").text("Wrong answer.");
      }
    });

    if (typeof callback == 'function') {
      callback(trackOffset);
    }
  }
}
