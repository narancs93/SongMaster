class SongMaster {
  constructor(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    this._songQuiz = new SongQuiz(this);
    this.spotifyApi = new SpotifyWebApi();
    this.spotifyApi.setAccessToken(this.accessToken);

    this.initializePlayer("Web player");
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

  get player() {
    return this._player;
  }

  set player(newPlayer) {
    this._player = newPlayer;
  }

  get songQuiz() {
    return this._songQuiz;
  }

  set songQuiz(newSongQuiz) {
    this._songQuiz = newSongQuiz;
  }

  getUser(callback) {
    this._spotifyApi.getMe(function(getMeError, getMeResult) {
      if (getMeError) console.error("Error occurred while getting user info", getMeError);
      else {
        if (typeof callback == 'function') {
          callback(getMeResult);
        }
      }
    });
  }

  getPlaylists(options, callback) {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
      args[i] = arguments[i];
    };

    if (typeof args[args.length - 1] === 'function') {
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
    this._spotifyApi.getUserPlaylists(options, (getUserPlaylistsError, getUserPlaylistsResult) => {
      if (getUserPlaylistsError) console.error("Error occurred while getting playlists.", getUserPlaylistsError);
      else {
        this.user.playlistsData = getUserPlaylistsResult;
        Array.prototype.push.apply(this.user.playlists, this.user.playlistsData.items);

        if (this.user.playlistsData.next) {
          options.offset += options.limit;
          this.getPlaylists(options, callback);
        } else {
          if (typeof callback == 'function') {
            callback();
          }
        }
      }
    });
  }

  pause() {
    this._spotifyApi.pause(function(pauseError, pauseResult) {
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
    this._spotifyApi.getMyDevices(function(getMyDevicesError, getMyDevicesResult) {
      if (getMyDevicesError) console.error("Error occurred while getting devices.", getMyDevicesError);
      else {
        if (typeof callback == 'function') {
          callback(getMyDevicesResult["devices"]);
        }
      }
    });
  }

  getDevice(deviceName, callback) {
    this.getDevices(function(devices) {
      for (var i = 0; i < devices.length; i++) {
        if (devices[i]["name"] === deviceName) {
          if (typeof callback == 'function') {
            callback(devices[i]);
          }
        }
      }
    });
  }

  transferPlayback(playerId, options, callback) {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
      args[i] = arguments[i];
    };

    playerId = args.shift();

    if (typeof args[args.length - 1] === 'function') {
      callback = args.pop();
    }

    if (args.length > 0) options = args.shift();
    else options = {};

    this._spotifyApi.transferMyPlayback([playerId], options, function(transferMyPlaybackError, transferMyPlaybackResult) {
      if (transferMyPlaybackError) console.error(transferMyPlaybackError);
      else {
        if (typeof callback == 'function') {
          callback();
        }
      }
    });
  }

  playSong(webPlayerId, playlistId, offset, callback) {
    var options = {
      "device_id": webPlayerId,
      "context_uri": `spotify:playlist:${playlistId}`,
      "offset": {
        "position": offset
      },
      "position_ms": 0
    };

    this._spotifyApi.play(options, function(playError, playResult) {
      if (playError) console.error("Error occurred while starting play.", playError);
      else {
        if (typeof callback == 'function') {
          callback();
        }
      }
    });
  }

  getPlaylistTracks(playlistId, options, callback) {
    this._spotifyApi.getPlaylistTracks(playlistId, options, function(getPlaylistTracksError, getPlaylistTracksResult) {
      if (getPlaylistTracksError) console.error(getPlaylistTracksError);
      else {
        if (typeof callback == 'function') {
          callback(getPlaylistTracksResult);
        }
      }
    });
  }


  startPlaylistOnWebPlayer(playlistId, offset, callback) {
    this.playSong(this.webPlayerId, playlistId, offset);

    if (typeof callback == 'function') {
      callback();
    }
  };

  startGame(callback) {
    this._songQuiz.start();
  }

  initializePlayer(playerName) {
    window.onSpotifyWebPlaybackSDKReady = () => {
      this.player = new Spotify.Player({
        name: playerName,
        getOAuthToken: cb => {
          cb(this.accessToken);
        },
        volume: 0.2
      });

      this.player.playerName = playerName;

      // Ready
      this.player.addListener('ready', ({
        device_id
      }) => {
        this.player.deviceId = device_id;
        this.onPlayerReady();
      });

      // Not Ready
      this.player.addListener('not_ready', ({
        device_id
      }) => {
        console.log('Device ID has gone offline', device_id);
      });

      this.player.addListener('initialization_error', ({
        message
      }) => {
        console.error(message);
      });

      this.player.addListener('authentication_error', ({
        message
      }) => {
        console.error(message);
      });

      this.player.addListener('account_error', ({
        message
      }) => {
        console.error(message);
      });

      this.player.connect();
    }
  }

  onPlayerReady() {
    console.log('Ready with Device ID', this.player.deviceId);

    this.getDevice(this.player.playerName, (webPlayer) => {
      this.webPlayerId = webPlayer["id"];

      const options = {
        play: true
      }

      this.transferPlayback(this.webPlayerId, options);

      this.getUser((user) => {
        this.user = user;
        this.showUserDetails();
      });
    });
  }

  showUserDetails() {
    $("#displayName").text(this.user.display_name);
    $("#userId").text(this.user.id);

    $('#login').hide();
    $('#loggedin').show();

    this.getPlaylists(() => {
      this.showUserPlaylists();
    });
  }

  showUserPlaylists() {
    this.user.playlists.map((playlist) => {
      if (playlist.name !== '') {
        const params = new URLSearchParams({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken
        });
        const queryString = params.toString();

        var element = `
        <li>
          <a href="#${queryString}" class="playlist flex items-center space-x-3 text-gray-700 p-2 rounded-md font-medium hover:bg-gray-200 focus:bg-gray-200 focus:shadow-outline" data-playlist-id="${playlist.id}" data-num-of-tracks="${playlist.tracks.total}">
            <span>${playlist.name}</span>
          </a>
        </li>`;

        $("#playlists").append(element);
      }
    });
  }
}
