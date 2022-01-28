class SongMaster {
  constructor(accessToken, refreshToken, songQuizOptions) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    songQuizOptions.songMaster = this;
    songQuizOptions.timeToWait = songQuizOptions.timeToWait || 3;
    songQuizOptions.guessTimeInSeconds = songQuizOptions.guessTimeInSeconds || 10;
    songQuizOptions.numOfQuestions = songQuizOptions.numOfQuestions || 10;

    this.songQuiz = new SongQuiz(songQuizOptions);
    this.spotifyApi = new SpotifyWebApi();
    this.spotifyApi.setAccessToken(this.accessToken);

    this.initSpotifyPlayer("Web player");
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


  getUser(callback) {
    this.spotifyApi.getMe(function(getMeError, getMeResult) {
      if (getMeError) console.error("Error occurred while getting user info", getMeError);
      else {
        if (typeof callback == "function") {
          callback(getMeResult);
        }
      }
    });
  }


  getPlaylists(options, callback) {
    let args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
      args[i] = arguments[i];
    };

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
        if (!pauseError["responseText"].includes("No active device found")) {
          console.error("Error occurred during pause.", pauseError);
        }
      }
      // Else playback was paused successfully, nothing to do
    });
  }


  getDevices(callback) {
    this.spotifyApi.getMyDevices(function(getMyDevicesError, getMyDevicesResult) {
      if (getMyDevicesError) console.error("Error occurred while getting devices.", getMyDevicesError);
      else {
        if (typeof callback == "function") {
          callback(getMyDevicesResult["devices"]);
        }
      }
    });
  }


  getDevice(deviceName, callback) {
    this.getDevices(function(devices) {
      for (let i = 0; i < devices.length; i++) {
        if (devices[i]["name"] === deviceName) {
          if (typeof callback == "function") {
            callback(devices[i]);
          }
        }
      }
    });
  }


  transferPlayback(spotifyPlayerId, options, callback) {
    let args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
      args[i] = arguments[i];
    };

    spotifyPlayerId = args.shift();

    if (typeof args[args.length - 1] === "function") {
      callback = args.pop();
    }

    if (args.length > 0) options = args.shift();
    else options = {};

    this.spotifyApi.transferMyPlayback([spotifyPlayerId], options, function(transferMyPlaybackError, transferMyPlaybackResult) {
      if (transferMyPlaybackError) console.error(transferMyPlaybackError);
      else {
        if (typeof callback == "function") {
          callback();
        }
      }
    });
  }


  playSong(spotifyPlayerId, playlistId, offset, callback) {
    let options = {
      "device_id": spotifyPlayerId,
      "context_uri": `spotify:playlist:${playlistId}`,
      "offset": {
        "position": offset
      },
      "position_ms": 0
    };

    this.spotifyApi.play(options, function(playError, playResult) {
      if (playError) console.error("Error occurred while starting play.", playError);
      else {
        if (typeof callback == "function") {
          callback();
        }
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


  startPlaylistOnWebPlayer(playlistId, offset, callback) {
    this.playSong(this.spotifyPlayerId, playlistId, offset, callback);
  };


  startGame(gameMode) {
    this.songQuiz.start(gameMode);
  }

  stopGame() {
    this.songQuiz.stop();
  }


  initSpotifyPlayer(playerName) {
    window.onSpotifyWebPlaybackSDKReady = () => {
      this.spotifyPlayer = new Spotify.Player({
        name: playerName,
        getOAuthToken: cb => {
          cb(this.accessToken);
        },
        volume: 0.2
      });

      this.spotifyPlayer.name = playerName;

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
      });

      this.spotifyPlayer.addListener("authentication_error", ({
        message
      }) => {
        console.error(message);
      });

      this.spotifyPlayer.addListener("account_error", ({
        message
      }) => {
        console.error(message);
      });

      this.spotifyPlayer.connect();
    }
  }


  onPlayerReady() {
    console.log("Ready with Device ID", this.spotifyPlayer.deviceId);

    this.getDevice(this.spotifyPlayer.name, (spotifyPlayer) => {
      this.spotifyPlayerId = spotifyPlayer["id"];

      const options = {
        play: false
      }

      this.transferPlayback(this.spotifyPlayerId, options);

      this.getUser((user) => {
        this.user = user;
        this.showUserDetails();
      });
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
      if (playlist.name !== '') {
        const params = new URLSearchParams({
          accessToken: accessToken,
          refreshToken: refreshToken,
          validUntil: validUntil
        });
        const queryString = params.toString();

        let element = `
        <li>
          <a href="#${queryString}" class="playlist flex items-center space-x-3 text-gray-700 p-2 rounded-md font-medium hover:bg-gray-200 focus:bg-gray-200 focus:shadow-outline" data-playlist-id="${playlist.id}" data-num-of-tracks="${playlist.tracks.total}">
            <span>${playlist.name}</span>
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
      if (setVolumeError) console.error("Error occurred while setting volume.", setVolumeError);
      else {
        if (typeof callback == "function") {
          callback();
        }
      }
    });
  }


  mutePlayer(callback) {
    // Save current volume for unmute
    this.getDevice(this.spotifyPlayer.name, (spotifyPlayer) => {
      this.spotifyPlayer.oldVolume = spotifyPlayer.volume_percent;
    });

    this.setVolume(0, callback);
  }

  unmutePlayer(callback) {
    this.setVolume(this.spotifyPlayer.oldVolume, callback);
  }
}
