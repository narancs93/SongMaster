class SongMaster {
  constructor(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.songQuiz = new SongQuiz(this);
    this.spotifyApi = new SpotifyWebApi();
    this.spotifyApi.setAccessToken(this.accessToken);

    this.validateAccessToken();
  }

  get accessToken() {
    return this._accessToken;
  }

  set accessToken(newAccessToken) {
    this._accessToken = newAccessToken;
  }

  get refreshToken() {
    return this._refreshToken;
  }

  set refreshToken(newRefreshToken) {
    this._refreshToken = newRefreshToken;
  }

  get user() {
    return this._user;
  }

  set user(newUser) {
    this._user = newUser;
  }

  get spotifyApi() {
    return this._spotifyApi;
  }

  set spotifyApi(newSpotifyApi) {
    this._spotifyApi = newSpotifyApi;
  }

  get spotifyPlayer() {
    return this._spotifyPlayer;
  }

  set spotifyPlayer(newSpotifyPlayer) {
    this._spotifyPlayer = newSpotifyPlayer;
  }

  get songQuiz() {
    return this._songQuiz;
  }

  set songQuiz(newSongQuiz) {
    this._songQuiz = newSongQuiz;
  }


  validateAccessToken() {
    this.getUser((error, result) => {
      if (error) {
        if (error.status === 401) {
          new ErrorHandler("Your access token is invalid. Please login again.", true)
        } else {
          new ErrorHandler("Something went wrong", true, error.responseText);
        }
      } else {
        this.initSpotifyPlayer("Web player");
      }
    });
  }


  getUser(callback) {
    this.spotifyApi.getMe(function(getMeError, getMeResult) {
      if (typeof callback == "function") {
        callback(getMeError, getMeResult);
      }
    });
  }


  getPlaylists(...args) {
    let options = null,
      callback = null;

    if (typeof args[args.length - 1] === "function") {
      callback = args.pop();
    }

    if (args.length > 0) options = args.shift();
    else options = {
      limit: 50,
      offset: 0
    };

    if (!this.user.playlists) {
      this.user.playlists = [];
    }

    // Get all playlists for user
    this.spotifyApi.getUserPlaylists(options, (getUserPlaylistsError, getUserPlaylistsResult) => {
      if (getUserPlaylistsError) console.error("Error occurred while getting playlists.", getUserPlaylistsError);
      else {
        this.user.playlistsData = getUserPlaylistsResult;
        Array.prototype.push.apply(this.user.playlists, this.user.playlistsData.items);

        if (this.user.playlistsData.next) {
          options.offset += options.limit;
          this.getPlaylists(options, callback);
        } else {
          if (typeof callback == "function") {
            callback();
          }
        }
      }
    });
  }


  pause() {
    this.spotifyApi.pause(function(pauseError, pauseResult) {
      if (pauseError) {
        // Ignore "No active device found" error
        if (!pauseError.responseText.includes("No active device found")) {
          console.error("Error occurred during pause.", pauseError);
        }
      }
      // Else playback was paused successfully, nothing to do
    });
  }


  transferPlayback(...args) {
    let spotifyPlayerId = args.shift();
    let options = {},
      callback = null;

    if (typeof args[args.length - 1] === "function") {
      callback = args.pop();
    }

    if (args.length > 0) options = args.shift();

    this.spotifyApi.transferMyPlayback([spotifyPlayerId], options, function(transferMyPlaybackError, transferMyPlaybackResult) {
      if (transferMyPlaybackError) console.error(transferMyPlaybackError);
      else {
        if (typeof callback == "function") {
          callback();
        }
      }
    });
  }


  playSong(spotifyPlayerId, trackId, positionMs, callback) {
    const options = {
      device_id: spotifyPlayerId,
      uris: [`spotify:track:${trackId}`],
      position_ms: positionMs
    };

    this.spotifyApi.play(options, function(playError, playResult) {
      if (typeof callback == "function") {
        callback(playError);
      }
    });
  }


  getPlaylistTracks(playlistId, options, callback) {
    this.spotifyApi.getPlaylistTracks(playlistId, options, function(getPlaylistTracksError, getPlaylistTracksResult) {
      if (getPlaylistTracksError) console.error(getPlaylistTracksError);
      else {
        if (typeof callback == "function") {
          callback(getPlaylistTracksResult);
        }
      }
    });
  }


  startPlaylistOnWebPlayer(trackId, positionMs, callback) {
    this.playSong(this.spotifyPlayer.deviceId, trackId, positionMs, callback);
  };


  startGame(gameMode) {
    this.songQuiz.start(gameMode);
  }

  stopQuiz() {
    this.songQuiz.stop();
  }


  initSpotifyPlayer(playerName) {
    this.spotifyPlayer = new Spotify.Player({
      name: playerName,
      getOAuthToken: cb => {
        cb(this.accessToken);
      },
      volume: 0.2
    });

    // Ready
    this.spotifyPlayer.addListener("ready", ({
      device_id
    }) => {
      this.spotifyPlayer.deviceId = device_id;
      this.onPlayerReady();
      $("#volume").val(20);
    });

    // Not Ready
    this.spotifyPlayer.addListener("not_ready", ({
      device_id
    }) => {
      console.log("Device ID has gone offline", device_id);
    });

    this.spotifyPlayer.addListener("initialization_error", ({
      message
    }) => {
      console.error(message);
      new ErrorHandler("Failed to initialize the Spotify Web Playback SDK.", true, message);
    });

    this.spotifyPlayer.addListener("authentication_error", ({
      message
    }) => {
      console.error(message);
      new ErrorHandler("Failed to initialize the Spotify Web Playback SDK.", true, message);
    });

    this.spotifyPlayer.addListener("account_error", ({
      message
    }) => {
      console.error(message);
      new ErrorHandler("Failed to initialize the Spotify Web Playback SDK.", true, message);
    });

    this.spotifyPlayer.connect();
  }


  onPlayerReady() {
    console.log("Ready with Device ID", this.spotifyPlayer.deviceId);

    const options = {
      play: false
    }

    this.transferPlayback(this.spotifyPlayer.deviceId, options);

    this.getUser((error, user) => {
      this.user = user;
      this.showUserDetails();
    });
  }


  showUserDetails() {
    $("#displayName").text(this.user.display_name);
    $("#userId").text(this.user.id);

    $("#login").hide();
    $("#loggedin").show();

    this.getPlaylists(() => {
      this.showUserPlaylists();
    });
  }


  showUserPlaylists() {
    let hashParams = getHashParams();
    let {
      accessToken,
      refreshToken,
      validUntil
    } = hashParams;

    this.user.playlists.map((playlist) => {
      if (playlist.name !== "") {
        const params = new URLSearchParams({
          accessToken: accessToken,
          refreshToken: refreshToken,
          validUntil: validUntil
        });
        const queryString = params.toString();

        let element = `
        <li>
          <a href="#${queryString}" class="playlist flex items-center space-x-3 text-gray-700 p-2 rounded-md font-medium hover:bg-gray-200 focus:bg-gray-200 focus:shadow-outline" data-playlist-id="${playlist.id}" data-num-of-tracks="${playlist.tracks.total}">
            <span class="truncate">${playlist.name.replace(/\s/g, "&nbsp;")}</span>
          </a>
        </li>`;

        $("#playlists").append(element);
      }
    });
  }


  setVolume(volume, callback) {
    const options = {
      device_id: this.spotifyPlayer.deviceId
    }

    this.spotifyApi.setVolume(volume, options, (setVolumeError, setVolumeResult) => {
      if (typeof callback == "function") {
        callback(setVolumeError);
      }
    });
  }


  mutePlayer(callback) {
    this.setVolume(0, callback);
  }


  unmutePlayer(callback) {
    let volume = $("#volume").val();
    this.setVolume(volume, callback);
  }


  showGamesModes(e) {
    const playlistButton = $(e.target).closest('.playlist');
    const playlistInfo = {
      id: playlistButton.data("playlist-id"),
      numOfTracks: playlistButton.data("num-of-tracks")
    }

    this.songQuiz.getPlaylistTracks(playlistInfo);

    hideElementsBySelectors(["#progressBarContainer", "#quizDetailsContainer"]);

    const templateValues = {
      playlistSelected: $($(playlistButton).html().replace(/&nbsp;/g, " ")).text(),
      playlistId: $(playlistButton).data("playlist-id"),
      numOfTracks: $(playlistButton).data("num-of-tracks")
    };

    readHtmlIntoElement("game_modes.html", "#content", templateValues);

    this.stopQuiz();
  }

}
