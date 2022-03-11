let hub;
let clientId = 9999;

let hubConnectStatus = false;
let clients = [clientId];

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Get config URL parameters
$(() => {
    var params = {};
    if (location.href.includes("?")) {
        location.href.split("?")[1].split("&").forEach((i) => {
            params[i.split("=")[0].toLocaleLowerCase()] = i.split("=")[1];
        });
        if ('ip' in params && 'port' in params) {
            serverIp = params.ip;
            serverPort = params.port;

            // Load web fonts and initialise clock canvas
            document.fonts.ready.then(() => {
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

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Initialise hub proxy and setup return messages
init = () => {
    $.connection.hub.url = `http://${serverIp}:${serverPort}/MessageHub`;
    hub = $.connection.messageHub;

    // Setup client methods
    hub.client.ClientCommand = (command) => {
        processCommand(command);
    };
    hub.client.ButtonPressed = (clientId, choice) => {
        processButtonPress(clientId, choice);
    };

    // Add connection events
    $.connection.hub.reconnecting(() => {
        // Update status
        $("#status").removeClass();
        hubConnectStatus = false;
    });
    $.connection.hub.reconnected(() => {
        console.log("SignalR Reconnected");
        retryAttempts = 0;

        // Re-send ImOnline messsage to server
        const message = new ImOnlineMessage(DeviceType.Monitor, clientId);
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

    // Start connection (if we have a clientId)
    if (clientId > 0)
        start();
};

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Start SignalR connection
start = () => {
    console.log(`Connecting to SignalR (${serverIp})...`);
    $.connection.hub.start().done(() => {
        console.log("SignalR Connected");
        retryAttempts = 0;

        // Send ImOnline messsage to server
        const message = new ImOnlineMessage(DeviceType.Monitor, clientId);
        hub.server.imOnline(message);

        // Update status
        $("#status").addClass("online");
        hubConnectStatus = true;
    });

    // Show initial table
    $("#layout").css("position", "initial").show();
};

// ---------------------------------------------------------------------------------------------------------------------------------------------

updateAudience = (audience) => {
    if (Array.isArray(audience)) {
        if (audience.length > 0) {
            audience.forEach(audienceMember => {
                // Add/update table rows
                if ($(`tr#audience${audienceMember.Id}`).length == 0) {

                    // Add new row
                    let tableOutput = "";
                    tableOutput += `<tr id="audience${audienceMember.Id}">`;
                    tableOutput += `<td class="audienceId head" align="center">${audienceMember.Id}</td>`;
                    tableOutput += `<td class="audienceName">${audienceMember.Name}</td>`;
                    tableOutput += `<td class="audienceSeat" align="center">${audienceMember.Seat}</td>`;
                    tableOutput += `<td class="audienceStatus" align="center">${audienceMember.Status}</td>`;
                    tableOutput += `<td class="audienceLastVote" align="center">${audienceMember.LastVote}</td>`;
                    tableOutput += `<td align="center" class="audienceOnline ${(audienceMember.Online ? "online" : "offline")}"><i class='icon'></i><span class="state">${(audienceMember.Online ? "1" : "0")}</span></td>`;
                    tableOutput += `</tr>`;

                    // If audience member is online, add them to the internal list
                    if (audienceMember.Online)
                        clients.push(audienceMember.Id);

                    // Add content to page
                    $("#audienceList tbody").append(tableOutput);

                } else {

                    // Edit row
                    $(`tr#audience${audienceMember.Id} td.audienceName`).text(audienceMember.Name);
                    $(`tr#audience${audienceMember.Id} td.audienceSeat`).text(audienceMember.Seat);
                    $(`tr#audience${audienceMember.Id} td.audienceStatus`).text(audienceMember.Status);
                    $(`tr#audience${audienceMember.Id} td.audienceLastVote`).text(audienceMember.LastVote);
                    $(`tr#audience${audienceMember.Id} td.audienceOnline`).removeClass("online offline").addClass(audienceMember.Online ? "online" : "offline");
                    $(`tr#audience${audienceMember.Id} td.audienceOnline span.state`).text(audienceMember.Online ? "1" : "0");

                    // Update table sorting
                    $(`tr#audience${audienceMember.Id} td.audienceName`).updateSortVal(audienceMember.Name);
                    $(`tr#audience${audienceMember.Id} td.audienceSeat`).updateSortVal(audienceMember.Seat);
                    $(`tr#audience${audienceMember.Id} td.audienceStatus`).updateSortVal(audienceMember.Status);
                    $(`tr#audience${audienceMember.Id} td.audienceLastVote`).updateSortVal(audienceMember.LastVote);
                    $(`tr#audience${audienceMember.Id} td.audienceOnline`).updateSortVal(audienceMember.Online ? 1 : 0);

                }
            });
        }
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------

displayModal = (way, cssClass, text) => {
    if (way) {
        $("#modal").removeClass().addClass(cssClass).html(`<p><i class='icon'></i>${text}</p>`).fadeIn(500);
    } else {
        $("#modal").fadeOut(500);
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------

displayError = (text) => {
    displayModal(true, "error", text);
};

// ---------------------------------------------------------------------------------------------------------------------------------------------

refreshConnection = () => {
    localStorage.setItem("isRegistered", '');
    location.reload();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

processCommand = (command) => {
    if ('Type' in command && 'ClientIds' in command) {
        if (command.ClientIds.includes(clientId)) {
            switch (command.Type) {
                case CommandType.ResetAll:
                case CommandType.ResetPresses:
                case CommandType.ShowLayout:
                    if (command.Way)
                        resetButtonPresses();
                    break;

                case CommandType.UpdateAudience:
                    updateAudience(command.Audience);
                    break;
            }
        }
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------

processButtonPress = (clientId, choice) => {
    // Update last answer information
    $(`tr#audience${clientId} td.audienceLastVote`).text(choice);

    // Update table sorting
    $(`tr#audience${clientId} td.audienceLastVote`).updateSortVal(choice);
}

resetButtonPresses = () => {
    $(`td.audienceLastVote`).text("");

    // Update table sorting
    $("td.audienceLastVote").updateSortVal("");
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

const DeviceType = {
    Server: "Server",
    Client: "Client",
    Monitor: "Monitor"
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
    RegistrationSuccessful: 15,
    UpdateAudience: 16
}

function ImOnlineMessage(deviceType, clientId) {
    this.DeviceType = deviceType;
    this.ClientId = clientId;
}

function CommandMessage(clientIds, type, way) {
    this.ClientIds = clientIds;
    this.Type = type;
    this.Way = way;
}

function UpdateAudienceCommandMessage(clientIds, type, way, audience) {
    CommandMessage.call(this, clientIds, type, way);
    this.Audience = audience;
}
