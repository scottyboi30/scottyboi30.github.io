let hub;
let serverIp = "";
let serverPort = "";
let clientId = 0;

let logoTouches = 0;
let maxLogoTouches = 10;
let logoTouchTimer = null;

let userInteractionLoaded = false;
let isRegistered;

let hubConnectStatus = false;

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------------------------------------------------------------------------

// Get config URL parameters
$(() => {
    selectionsAllowed = 8;
            // Load web fonts and initialise clock canvas
            document.fonts.ready.then(() => {
                // Load hub proxy and initialise SignalR
                $("button").on("touchstart mousedown", (e) => {
                    e.preventDefault();
    
                    const choice = parseInt($(e.currentTarget).attr("data-id"));
                    const state = parseInt($(e.currentTarget).attr("data-state"));
                    toggleSingleButtonPress(e, choice, state);
                });
            });
});

refreshConnection = () => {
    localStorage.setItem("isRegistered", '');
    location.reload();
}


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

        if (!isRegistered) {
            initRegistration();
        }
    });
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------------------------------------------------------------------------

let selection = [];
let selectionsAllowed = 0;
let activeLayout = false;
const contsInfo = [];

displayLayout = (way, buttons, cssClass = "", locked = false, contestantInfo = "", contsPerPair = -1, resetSelection = true, layoutSelectionsAllowed = 1, roundText = "") => {
    if (way) {
        // Lock/unlock this layout (from interaction)?
        if (locked) {
            // If we are showing a new layout, don't bother fading the lock in (this will create a flash)
            if (!activeLayout)
                $("#lock").show();
            else
                $("#lock").fadeIn(500);
        } else
            $("#lock").fadeOut(500);

        // Repeated call without resetting answers?
        if (!resetSelection && activeLayout)
            return;
        
        // Save active layout
        activeLayout = true;

        selectionsAllowed = layoutSelectionsAllowed;
        selection = [];

        // reset layout
        $("#layoutContent .button").remove();
        $("#layoutContent .row-text").remove();
        $("#roundText").text("");
        
        // Build buttons        
        const conts = contestantInfo.split(",");

        // do we have more than one contestant per button
        if (contsPerPair != -1) {
            for (var i = 0; i < buttons; i++) {
                const pairings = conts.splice(0, contsPerPair);

                if (!pairings || pairings.length === 0) continue;

                let rowText = "";
                let rowClass = "pairs";
                let button = '<div class="button-content">';
                if (contsPerPair > 2) {
                    rowClass = "contestant-row";
                    if (i === 0)
                        rowText = `<div class="row-text">Top Row</div>`;
                    else
                        rowText = `<div class="row-text">Bottom Row</div>`;
                }

                // build content for each contestant in the pairing
                for (var g = 0; g < pairings.length; g++) {
                    const contInfo = pairings[g].split(":");

                    const image = contsInfo.find(ci => ci.name == contInfo[1]);
                    const imageSrc = image ? image.src ? image.src : contInfo[0] : contInfo[0];

                    button = `${button}<div class="pairs-content"><img src="${imageSrc}" class="avatar"><div class="button-text"><span class="button-text-name">${contInfo[1]}</span></div></div>`
                }

                button = `${button}</div>`;
                $("#buttonContent").append(`${rowText}<div class="button ${rowClass}"><button data-index="${(i + 1)}" data-state="0">${button}</button></div>`);
            }

            $("#buttonContent").addClass("col");
            $("#buttonContent").removeClass("twoCol fourCol twoRow");

            // Add click/tap events to buttons
            $("button").on("touchstart mousedown", (e) => {
                e.preventDefault();

                const choice = parseInt($(e.currentTarget).attr("data-index"));
                togglePairingButtonPress(e, choice);
            });

        } else {
            for (var i = buttons; i > 0; i--) {
                var contInfo = conts[i - 1].split(":")
                const image = contsInfo.find(ci => ci.name == contInfo[1]);
                const imageSrc = image ? image.src ? image.src : contInfo[0] : contInfo[0];

                $("#buttonContent").prepend(`<div class="button"><button data-index="${(i)}" data-state="0" data-id="${contInfo[2]}"><div class="button-content"><img src="${imageSrc}" class="avatar"><div class="button-text"><span class="button-text-name">${contInfo[1]}</span></div></div></button></div>`);
            }

            // Configure flex layout
            if (buttons === 4)
                $("#buttonContent").removeClass("fourCol col").addClass("twoCol").addClass("twoRow");
            else if (buttons <= 6)
                $("#buttonContent").removeClass("fourCol col twoRow").addClass("twoCol");
            else if (buttons > 9)
                $("#buttonContent").removeClass("twoCol twoRow col").addClass("fourCol");
            else
                $("#buttonContent").removeClass("twoCol fourCol twoRow col");

            // Add click/tap events to buttons
            $("button").on("touchstart mousedown", (e) => {
                e.preventDefault();

                const choice = parseInt($(e.currentTarget).attr("data-id"));
                const state = parseInt($(e.currentTarget).attr("data-state"));
                toggleSingleButtonPress(e, choice, state);
            });
        }

        // set round text
        $("#roundText").text(roundText);

        // Add Lock In button
        $("#layoutContent").append(`<div class="button lockin-button"><button class="inactive"><div class="lockin-button-text">LOCK IN</div></button></div>`);
        $(".lockin-button button").on("mousedown touchstart", (e) => {
            e.preventDefault();
            const choice = selection;
            lockinPress(choice);
        });

        // Show layout
        $("#layout").addClass(cssClass).fadeIn(500);
    } else {
        // Hide layout (and lock)
        activeLayout = false;
        $("#lock").fadeOut(500);
        $("#layout").fadeOut(500);
    }
};

displayModal = (way, cssClass, text) => {
    if (way) {
        $("#modal").removeClass().addClass(cssClass).html(`<p><i class='icon'></i>${text}</p>`).fadeIn(500);
    } else {
        $("#modal").fadeOut(500);
    }
};

lockButton = (way, buttonIndex) => {
    if (activeLayout) {
        const button = $(`#layoutContent .button button[data-index="${buttonIndex}"]`);
        if (way) {
            button.removeClass("pressed").addClass("locked");
        } else {
            button.removeClass("locked");
        }
    }
};

lockLayout = (way) => {
    if (activeLayout) {
        if (way) {
            $("#lock").fadeIn(500);
        } else {
            $("#lock").fadeOut(500);
        }
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------------------------------------------------------------------------

let imageLoadCount = 0;
preloadImages = (contestantInfo) => {
    imageLoadCount = 0;
    var conts = contestantInfo.split(",");
    imagesToLoad = conts.length;
    for (let i = 0; i < conts.length; i++) {
        const contSplit = conts[i].split(":");
        const tempInfo = {
            name: contSplit[1],
            image: new Image()
        };
        tempInfo.image.src = contSplit[0];
        tempInfo.image.onLoad = imageLoaded();
        contsInfo[i] = tempInfo;
    }
};

imageLoaded = () => {
    imageLoadCount++;
    if (imageLoadCount == imagesToLoad) {
        const message = new ImagesLoadedMessage(DeviceType.Client, clientId);
        hub.server.imagesLoaded(message);
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// OS helper
// ---------------------------------------------------------------------------------------------------------------------------------------------

getOs = () => {
    const platform = window.navigator.platform;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    let os = null;

    if (macosPlatforms.indexOf(platform) !== -1)
        os = 'Mac';
    else if (windowsPlatforms.indexOf(platform) !== -1)
        os = 'Windows';

    return os;
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------------------------------------------------------------

displayError = (text) => {
    displayModal(true, "error", text);
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Voting Button handlers
// ---------------------------------------------------------------------------------------------------------------------------------------------

toggleSingleButtonPress = (e, choice, state) => {
    if (!$(e.currentTarget).hasClass("locked")) {
        if (selectionsAllowed === 1) {
            if (selection.length === 1) {
                currentSelected = $(`#layoutContent .button button[data-id="${selection[0]}"]`);
                $(currentSelected).removeClass("pressed").addClass("unpressed").attr("data-state", "0");
            }

            $(e.currentTarget).removeClass("unpressed").addClass("pressed").attr("data-state", "1");
            selection[0] = choice;

            $(".lockin-button button").removeClass("inactive").addClass("active");
            return;
        }

        if (state == 0 && selection.length < selectionsAllowed) {
            $(e.currentTarget).attr("data-state", "1");

            selection[selection.length] = choice;
            $(e.currentTarget).removeClass("unpressed").addClass("pressed");
        }
        else if (state == 1) {
            $(e.currentTarget).removeClass("pressed").addClass("unpressed");
            $(e.currentTarget).attr("data-state", "0");

            var i = selection.indexOf(choice);
            if (i != -1) {
                selection.splice(i, 1);
            }
        }

        if (selectionsAllowed === selection.length) $(".lockin-button button").removeClass("inactive").addClass("active");
        else $(".lockin-button button").removeClass("active").addClass("inactive");
    }
};

singleButtonPress = (choice, e) => {
    $(e.currentTarget).addClass("pressed");
    hub.server.buttonPressed(new ButtonPressMessage(choice, clientId));
};

togglePairingButtonPress = (e, choice) => {
    if (!$(e.currentTarget).hasClass("locked")) {
        if (selectionsAllowed === 1) {
            if (selection.length === 1) {
                currentSelected = $(`#layoutContent .button button[data-index="${selection[0]}"]`);
                $(currentSelected).removeClass("pressed").addClass("unpressed").attr("data-state", "0");
            }

            $(e.currentTarget).removeClass("unpressed").addClass("pressed").attr("data-state", "1");
            selection[0] = choice;
            $(".lockin-button button").removeClass("inactive").addClass("active");
            return;
        }
    }
};

lockinPress = (choice) => {
    if (selection.length == selectionsAllowed) {
        hub.server.lockinPressed(new ButtonPressMessage(choice, clientId));
        lockLayout(true);
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Process commands
// ---------------------------------------------------------------------------------------------------------------------------------------------

processCommand = (command) => {
    if ('Type' in command && 'ClientIds' in command) {
        if (command.ClientIds.includes(clientId)) {
            switch (command.Type) {
                case CommandType.ResetAll:
                    displayLayout(false, 0);
                    displayModal(false, "", "");
                    $("#layoutContent .button button").removeClass();
                    selection = [];
                    selectionsAllowed = 0;
                    break;
                case CommandType.ResetPresses:
                    $("#layoutContent .button button").removeClass("pressed").removeClass("locked");
                    break;
                case CommandType.ShowLayout:
                    if (!isRegistered) return;
                    console.log(command);
                    displayLayout(command.Way,
                        command.NumberOfButtons,
                        command.CssClass, 
                        command.Locked,
                        command.ContestantInfo,
                        command.ContsPerPair,
                        command.ResetVote,
                        command.Selections,
                        command.RoundText
                    );
                    break;
                case CommandType.ShowModal:
                    displayModal(command.Way, command.CssClass, command.Text, command.ShowSelection);
                    break;
                case CommandType.ButtonLock:
                    if (!isRegistered) return;
                    lockButton(command.Way, command.ButtonIndex);
                    break;
                case CommandType.LayoutLock:
                    if (!isRegistered) return;
                    lockLayout(command.Way);
                    break;
                case CommandType.PreloadImages:
                    preloadImages(command.ContestantInfo);
                    break;
                case CommandType.RegisterNewUser:
                    handleRegisterNewUser();
                    break;
                case CommandType.UserExists:
                    handleUserExists(command.FirstName, command.LastName);
                    break;
                case CommandType.ResetRegistration:
                    handleResetRegistration();
                    break;
                case CommandType.RegistrationSuccessful:
                    handleRegistrationSuccessful(command.Way);
                    break;
            }
        } else if (command.Type === CommandType.ResetRegistration) {
            handleResetRegistration();
        }
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------------------------------------------------------------------------
let timeout;
let resetting = false;
handleRegisterNewUser = () => {
    clearRegistrationTimeout();
    $(".loader-wrapper").hide();
    showRegisterNewUser();
}

handleUserExists = (firstName, lastName) => {
    clearRegistrationTimeout();
    $(".loader-wrapper").hide();
    swal({
        title: "Confirm User",
        text: `Are you ${firstName} ${lastName} ?`,
        icon: "warning",
        buttons: ["No", "Yes"]
    })
        .then((confirm) => {
            test();
            try {
                if (confirm)
                    handleRegistrationSuccessful(true);
                else
                    showRegisterNewUser();
            } catch (error) {
                $(".loader-wrapper").hide();
                console.error(error);
            }
        });
}

test = () => {
    console.log(resetting);
}

handleRegistrationSuccessful = (way) => {
    clearRegistrationTimeout();
    $(".loader-wrapper").hide();
    if (way) {
        localStorage.setItem("isRegistered", true);
        isRegistered = true;

        clearDownForm();
    } else {
        // handle error
        swal({
            title: "Problem registering",
            text: "Please try again",
            icon: "error"
        });

        clearDownForm(false);
    }
}

handleResetRegistration = () => {
    resetting = true;
    test();
    localStorage.setItem("isRegistered", '');

    try {
        swal.close();
    } catch (error) {
        
    }

    try {
        clearDownForm();

        initRegistration();
    } catch (error) {
        console.log(error);
    }
    finally {
        resetting = false;
    }
}

initRegistration = () => {
    $("#layoutContent .button").remove();
    $("#layoutContent .row-text").remove();
    $("#roundText").text("");
    displayLayout(false, 0);
    displayModal(false, "", "");
    selection = [];
    selectionsAllowed = 0;

    $("#registration").removeClass("d-none");
    $(".loader-wrapper").hide();

    //
    // handle button events
    //
    $("#registerSeat").on("touchstart mousedown", (e) => {
        e.preventDefault();
        $("#seatNumber").trigger("blur");
        try {
            registerSeat();
        } catch (error) {
            $(".loader-wrapper").hide();
            console.error(error);
        }
    });

    $("#registerUser").on("touchstart mousedown", (e) => {
        e.preventDefault();
        try {
            registerUser();
        } catch (error) {
            $(".loader-wrapper").hide();
            console.error(error);
        }
    });

    $("#cancelRegistration").on("touchstart mousedown", (e) => {
        e.preventDefault();
        cancelRegistration();
    });

    //
    // handle enter events for android keyboard
    //
    $("#firstName").on("keydown", (e) => {
        if (e.key && e.key === "Enter") {
            $("#firstName").trigger("blur");
        }
    });

    $("#lastName").on("keydown", (e) => {
        if (e.key && e.key === "Enter") {
            $("#lastName").trigger("blur");
            $("#registerUser").trigger("touchstart");
        }
    });

    $("#seatNumber").on("keydown", (e) => {
        if (e.key && e.key === "Enter") {
            $("#seatNumber").trigger("blur");
            $("#registerSeat").trigger("touchstart");
        }
    });
}

registerSeat = () => {
    const seatNumber = parseInt($("#seatNumber").val());
    
    // Here as a precaution
    if (isNaN(seatNumber)) {
        return;
    }

    // send to server
    try {
        $(".loader-wrapper").show();
        setRegistrationTimeout();
        hub.server.registerSeat(new RegisterSeatMessage(seatNumber, clientId));
    } catch (error) {
        $(".loader-wrapper").hide();
        console.error(error);
    }
}

registerUser = () => {
    const firstName = $("#firstName").val();
    const lastName = $("#lastName").val();

    if (!firstName || firstName.trim().length === 0) {
        // show validation
        $("#nameInvalid").removeClass("d-none");
        return;
    }
    if (!lastName || lastName.trim().length === 0) {
        // show validation
        $("#nameInvalid").removeClass("d-none");
        return;
    }

    if (!($("#nameInvalid").hasClass("d-none"))) {
        $("#nameInvalid").addClass("d-none");
    }

    // send to server
    try {
        $(".loader-wrapper").show();
        setRegistrationTimeout();
        hub.server.registerUser(new RegisterUserMessage(firstName, lastName, clientId));
    } catch (error) {
        $(".loader-wrapper").hide();
        console.error(error);
    }    
}

showRegisterNewUser = () => {
    $("#registerSeat").addClass("d-none");
    $("#seatNumber").prop("disabled", true);
    $(".details").removeClass("d-none");
}

cancelRegistration = () => {
    $("#registerSeat").removeClass("d-none");
    $("#seatNumber").prop("disabled", false);
    $(".details").addClass("d-none");
    $("#nameInvalid").addClass("d-none");

    $("#firstName").val("");
    $("#lastName").val("");
}

clearDownForm = (hideForm = true) => {
    // reset form
    $(".loader-wrapper").hide();
    $("#seatNumber").prop("disabled", false);
    $("#seatNumber").val("");
    $("#firstName").val("");
    $("#lastName").val("");
    $("#registerSeat").removeClass("d-none");
    $(".details").addClass("d-none");
    $("#nameInvalid").addClass("d-none");

    if (hideForm) $("#registration").addClass("d-none");
}

setRegistrationTimeout = () => {
    console.log("Start registration timeout");
    if (!timeout) {
        timeout = setTimeout(() => {
            $(".loader-wrapper").hide();
            const text = hubConnectStatus ? "Please try again" : "Disconnected please see your closest audience co-ordinator"
            swal({
                title: "An error occurred",
                text: text,
                icon: "error"
            });
        }, 30000);
    }
}

clearRegistrationTimeout = () => {
    console.log("Stop registration timeout");
    $(".loader-wrapper").hide();
    clearTimeout(timeout);
    timeout = null;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------------------------------------------------------------------------

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

const ClockOption = {
    NoClock: 0,
    ProgressBar: 1,
    ProgressBarReverse: 2,
    Pie: 3
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

function LayoutCommandMessage(clientIds, type, way, numberOfButtons, cssClass, locked, clockOption, clockTimeMs, startClock) {
    CommandMessage.call(this, clientIds, type, way);
    this.NumberOfButtons = numberOfButtons;
    this.CssClass = cssClass;
    this.Locked = locked;
    this.ClockOption = clockOption;
    this.ClockTimeMs = clockTimeMs;
    this.StartClock = startClock;
}

function ModalCommandMessage(clientIds, type, way, cssClass, text, showSelection) {
    CommandMessage.call(this, clientIds, type, way);
    this.CssClass = cssClass;
    this.Text = text;
    this.ShowSelection = showSelection;
}

function ButtonLockCommandMessage(clientIds, type, way, buttonIndex) {
    CommandMessage.call(this, clientIds, type, way);
    this.ButtonIndex = buttonIndex;
}

function ImagesLoadedMessage(deviceType, clientId) {
    this.DeviceType = deviceType;
    this.ClientId = clientId;
}

function VideoLoadedMessage(clientId) {
    this.ClientId = clientId;
}

function ButtonPressMessage(choice, clientId) {
    this.choice = choice;
    this.ClientId = clientId;
}

function RegisterSeatMessage(seat, clientId) {
    this.seat = seat;
    this.clientId = clientId;
}

function userConfirmationMessage(way, clientId) {
    this.way = way;
    this.clientId = clientId;
}

function RegisterUserMessage(firstName, lastName, clientId) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.clientId = clientId;
}