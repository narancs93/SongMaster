class SongMaster {
  constructor(user = null, spotifyApi = null) {
    this._user = user;
    this._spotifyApi = spotifyApi;
    this._songQuiz = new SongQuiz();
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

    if(!this.user.playlists) {
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
    //Play a song
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


  startPlaylistOnWebPlayer(playlistId, offset) {
    const thisObject = this;
    // Get devices
    thisObject.getDevice("Web player", function(webPlayer) {
      const webPlayerId = webPlayer["id"];

      thisObject.transferPlayback(webPlayerId, function() {
        thisObject.playSong(webPlayerId, playlistId, offset);
      })
    });

    thisObject.player.togglePlay();
  };


  startGame(callback) {
    const thisObject = this;

    const playlist = thisObject._songQuiz.playlist;
    const numOfTracks = playlist.numOfTracks;

    // Set random offset based on number of tracks in playlist
    // 100 tracks are returned by the API
    var offset = 0;
    if (numOfTracks > 100) {
      thisObject._songQuiz.offset = Math.floor(Math.random() * (numOfTracks - 100));
    }

    const options = {
      offset: thisObject._songQuiz.offset
    }
    // Count down from 5 seconds
    $("#content").html(5);
    var counter = 4;

    var interval = setInterval(function() {
      if (counter > 0) {
        $("#content").html(counter);
      }
      counter--;

      if (counter === -1) {
        clearInterval(interval);

        thisObject.getPlaylistTracks(playlist.id, options, function(getPlaylistTracksResult) {
          thisObject._songQuiz.playlistTracksData = getPlaylistTracksResult;
          thisObject._songQuiz.showQuestion(function(trackOffset) {
            thisObject.startPlaylistOnWebPlayer(playlist.id, trackOffset);
          });

        })
      }
    }, 1000);
  }

}
