let hub;
let serverIp = "";
let serverPort = "";
let clientId = 0;

const clockSta = -Math.PI / 2;
let clockCtx = null;
let clockTimer = null;
let userInteractionLoaded = false;

let hubConnectStatus = false;

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------------------------------------------------------------------------

// Get config URL parameters
$(() => {
    isRegistered = localStorage.getItem("isRegistered");
    var params = {};
    if (location.href.includes("?")) {
        location.href.split("?")[1].split("&").forEach((i) => {
            params[i.split("=")[0].toLocaleLowerCase()] = i.split("=")[1];
        });
        if ('ip' in params && 'port' in params && 'clientid' in params) {
            serverIp = params.ip;
            serverPort = params.port;
            clientId = parseInt(params.clientid);

            // Show client id
            $("#client").html(clientId);

            // Load web fonts and initialise clock canvas
          document.fonts.ready.then(() => {
            $("#loadPage").on('touchstart mousedown', e => {
              e.preventDefault();
              $(".page-load-wrapper").hide();
            });
            // Load hub proxy and initialise SignalR
            $.getScript(`http://${serverIp}:${serverPort}/MessageHub/hubs`, () => init());
          });
        } else {
          // Missing configuration
          displayError("Missing Configuration");
        }
    } else {
        // Missing configuration
        displayError("Missing Configuration");
    }
});

// Initialise hub proxy and setup return messages
init = () => {
    $.connection.hub.url = `http://${serverIp}:${serverPort}/MessageHub`;
    hub = $.connection.messageHub;

    // Setup client methods
    hub.client.ClientCommand = (command) => {
        processCommand(command);
    };

    // Add connection events
    $.connection.hub.reconnecting(() => {
        // Update status
        $("#status").removeClass();
        hubConnectStatus = false;
    });
    $.connection.hub.reconnected(() => {
        console.log("SignalR Reconnected");

        // Re-send ImOnline message to server
        const message = new ImOnlineMessage(DeviceType.Client, clientId);
        hub.server.imOnline(message);

        // Update status
        $("#status").addClass("online");
        hubConnectStatus = true;
    });
    $.connection.hub.disconnected(() => {
        // Update status
        $("#status").removeClass();
        hubConnectStatus = false;

        // Try re-connecting
        setTimeout(() => start(), 3000);
    });

    // Start connection
    start();
};

// Start SignalR connection
start = () => {
    $.connection.hub.start().done(() => {
        console.log("SignalR Connected");

        // Send ImOnline messsage to server
        const message = new ImOnlineMessage(DeviceType.Client, clientId);
        hub.server.imOnline(message);

        // Update status
        $("#status").addClass("online");
        hubConnectStatus = true;
    });
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------------------------------------------------------------------------
loadContestantLayout = (videoUrl) => {
    if (!userInteractionLoaded) {
        userInteractionLoaded = true;
        $("#video").on('loadeddata', e => {
            const state = $("#video").prop('readyState');

            if (state) {
                const value = parseInt(state);

                // Video can be played.
                if (value >= 3) {
                    hub.server.videoLoaded(new VideoLoadedMessage(clientId));
                }
            }
        });

        $("#video").html(`
        <!-- MP4 must be first for iPad! -->
        <source id="videoSource" src="${videoUrl}" type="video/mp4">`);

    } else {
        const video = $('#video').get(0);
        video.pause();
        $("#videoLayout").hide();

        $("#videoSource").remove();
        $("#video").html(`
            <!-- MP4 must be first for iPad! -->
            <source id="videoSource" src="${videoUrl}" type="video/mp4">`);

        video.load();
    }
}

playVideo = () => {
    $("#videoLayout").fadeIn(500);
    const video = $('#video').get(0);
    //openFullScreen(video);
    video.play();
}

stopVideo = () => {
    const video = $('#video').get(0);
    //closeFullScreen(video);
    video.pause();
    video.currentTime = 0;
    $("#videoLayout").fadeOut(500);
}

pauseVideo = () => {
    const video = $('#video').get(0);
    video.pause();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------------------------------------------------------------

displayError = (text) => {
    displayModal(true, "error", text);
};

displayModal = (way, cssClass, text, showSelection) => {
  if (way) {
      $("#modal").removeClass().html(`<p><i class='icon'></i>${text}</p>`).fadeIn(500);
  } else {
      $("#modal").fadeOut(500);
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Process commands
// ---------------------------------------------------------------------------------------------------------------------------------------------

processCommand = (command) => {
    if ('Type' in command && 'ClientIds' in command) {
            switch (command.Type) {
                case CommandType.LoadVideo:
                    loadContestantLayout(command.VideoURL);
                    break;
                case CommandType.PlayVideo:
                    playVideo();
                    break;
                case CommandType.StopVideo:
                    stopVideo();
                    break;
                // case CommandType.PauseVideo:
                //     pauseVideo();
                //     break;
            }
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------------------------------------------------------------------------

function ImOnlineMessage(deviceType, clientId) {
  this.DeviceType = deviceType;
  this.ClientId = clientId;
}

const DeviceType = {
    Server: "Server",
    Client: "Client"
}

const CommandType = {
    ResetAll: 0,
    ResetPresses: 1,
    ShowLayout: 2,
    ShowModal: 3,
    StartClock: 4,
    ButtonLock: 5,
    LayoutLock: 6,
    PreloadImages: 7,
    LoadVideo: 8,
    PlayVideo: 9,
    StopVideo: 10,
    UserExists: 11,
    SeatTaken: 12,
    RegisterNewUser: 13,
    ResetRegistration: 14,
    RegistrationSuccessful: 15
    //PauseVideo: 
}

function VideoLoadedMessage(clientId) {
    this.ClientId = clientId;
}