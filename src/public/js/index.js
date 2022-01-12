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


function readHtmlIntoElement(htmlFile, element, templateValues) {
  var reader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP');



  reader.open('get', htmlFile, true);
  reader.onreadystatechange = function() {
    if (reader.readyState == 4) {
      var htmlText = reader.responseText;

      for (const key in templateValues) {
        htmlText = htmlText.replace(`{{${key}}}`, `${templateValues[key]}`.trim());
      }

      $(element).html(htmlText);
    }
  };
  reader.send(null);
}


$(document).ready(function() {
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

          $("#display_name").text(display_name);
          $("#user_id").text(user_id);

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
                    <a href="#${queryString}" class="playlist flex items-center space-x-3 text-gray-700 p-2 rounded-md font-medium hover:bg-gray-200 focus:bg-gray-200 focus:shadow-outline" data-playlist-id="${playlist.id}">
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
});

$(document).on("click", ".playlist", function(e) {
  const templateValues = {
    playlist_selected: $(this).text(),
    playlist_id: $(this).data("playlist-id"),
  };

  readHtmlIntoElement("game_modes.html", "#content", templateValues);
});


$(document).on("click", "#play_button", function() {
  const playlist_id = $(this).data("playlist-id");

  // Count down from 5 seconds
  $("#content").html(5);
  var counter = 4;

  var interval = setInterval(function() {
    if (counter > 0) {
      $("#content").html(counter);
    }
    counter--;

    // Get a random song
    if (counter === -1) {
      clearInterval(interval);

      var params = getHashParams();
      var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

      // Get playlist items
      $.ajax({
        url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
        headers: {
          'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
          var playlist_items = response["items"];
          const randIndex = Math.floor(Math.random() * playlist_items.length);
          const track_name = playlist_items[randIndex]["track"]["name"];

          $("#content").text(track_name);
        },
        error: function() {
          console.log("Error occurred while getting playlists.");
        }
      });
    }
  }, 1000);



})
