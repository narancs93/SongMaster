(function() {
  /**
   * Obtains parameters from the hash of the URL
   * @return Object
   */
  function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
    while (e = r.exec(q)) {
      hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
  }

  var params = getHashParams();

  var access_token = params.access_token,
    refresh_token = params.refresh_token,
    error = params.error;

  if (error) {
    alert('There was an error during the authentication');
  } else {
    if (access_token) {
      // Get the users profile
      $.ajax({
        url: 'https://api.spotify.com/v1/me',
        headers: {
          'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
          const display_name = response.display_name;
          const user_id = response.id;

          document.getElementById("display_name").innerText = display_name;
          document.getElementById("user_id").innerText = user_id;

          $('#login').hide();
          $('#loggedin').show();

          // Get playlists
          $.ajax({
            url: `https://api.spotify.com/v1/users/${user_id}/playlists`,
            headers: {
              'Authorization': 'Bearer ' + access_token
            },
            success: function(data) {
              var playlists = data["items"];
              playlists.map(function(playlist) {

                if (playlist.name !== '') {
                  const params = new URLSearchParams({
                    access_token: access_token,
                    refresh_token: refresh_token
                  });
                  const queryString = params.toString();

                  var element = `
                  <li>
                    <a href="#${queryString}" class="playlist flex items-center space-x-3 text-gray-700 p-2 rounded-md font-medium hover:bg-gray-200 focus:bg-gray-200 focus:shadow-outline">
                      <span>${playlist.name}</span>
                    </a>
                  </li>`

                  $("#playlists").append(element);
                }
              });
            },
            error: function() {
              console.log("Error occurred while getting playlists.");
            }
          });
        }
      });
    } else {
      // render initial screen
      $('#login').show();
      $('#loggedin').hide();
    }

  }
})();


$(document).on("click", ".playlist", function(e) {
  $("#content").text($(this).text());
});
