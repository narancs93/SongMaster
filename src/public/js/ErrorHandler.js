class ErrorHandler {
  constructor(errorMessage, isLoginError = false, additionalInfo = null) {
    this.error = errorMessage;
    this.additionalInfo = additionalInfo ? `<p>${additionalInfo}</p>` : "";

    if (isLoginError) {
      this.handleLoginError();
    } else {
      this.handleError();
    }
  }


  handleLoginError() {
    $("#login_error h1").text(this.error);

    const infoElement = `
      <p>${this.additionalInfo}</p>
      <a href="/">
        <button class="bg-teal-500 hover:bg-teal-700 border-teal-500 hover:border-teal-700 text-base border-4 text-white p-2 m-4 rounded" type="button">
          Back to login page
        </button>
      </a>
      `;
    $("#login_error div").append(infoElement);


    $("#login_error").show();
  }

  handleError() {
    $("#error").html(`
      <div class="flex flex-col">
        <div class="text-xl">${this.error}</div>
        <div class="text-sm">${this.additionalInfo}</div>
      </div>
    `);

    $("#error").fadeIn("slow", function() {
      $("#error").delay(5000).fadeOut();
    });
  }

}
