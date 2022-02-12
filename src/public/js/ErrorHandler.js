class ErrorHandler {
  constructor(errorMessage, errorType, additionalInfo = null) {
    this.error = errorMessage;
    this.additionalInfo = additionalInfo ? `<p>${additionalInfo}</p>` : "";

    if (errorType === "loginError") {
      this.handleLoginError();
    } else if (errorType === "nonCriticalError") {
      this.handleError();
    } else if (errorType === "criticalError") {
      this.displayError();
    }
  }


  handleLoginError() {
    $("#login_error h1").text(this.error);

    const infoElement = `
      <p>${this.additionalInfo}</p>
      <a href="/">
        <button class="bg-teal-500 hover:bg-teal-700 border-teal-500 hover:border-teal-700 text-base border-4 text-white p-2 m-4 rounded" type="button">
          Go to login page
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
      $("#error").delay(3000).fadeOut();
    });
  }

  displayError() {
    $("#content").html(`
      <div class="flex flex-col text-center">
        <div class="text-2xl text-red-600 p-6">${this.error}</div>
        <div class="text-base text-black p-4">${this.additionalInfo}</div>
      </div>
    `)
  }

}
