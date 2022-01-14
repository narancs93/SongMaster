class User {
  constructor(displayName, userId) {
    this._name = displayName;
    this._id = userId;
  }

  get name() {
    return this._name;
  }

  set name(newName) {
    this._name = newName;
  }

  get id() {
    return this._id;
  }

  set id(newId) {
    this._id = newId;
  }

  get playlists() {
    return this._playlists;
  }

  set playlists(newPlaylists) {
    this._playlists = newPlaylists;
  }
}
