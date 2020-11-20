const fs = require('fs');

var dataController = (function() {

    // Data controller state variable holding
    // everything needed for serial port communication
    var serialPort = {
        parser: null,
        port: null,
        settings: {
            path: null,
            baud: null
        },
        CB_dataRcvd: null,
        CB_portConnected: null,
        CB_portDisconnected: null,
        CB_error: null
    }

    // Remove ANSI codes from the provided ASCII string
    var removeAnsiCodes = function(string) {
        const ansiRegex = require('ansi-regex');

        if( typeof string === 'string' ) {
            var str
            str = string.replace(ansiRegex(), '');
            return str;
        }
        else {
            return "";
        }
    }

    // Data Controller API
    return {
        // Retrieve available serial port paths and populate a port list to be
        // sent back to the caller
        getAvailableSerialPorts: async function() {
            const SerialPort = require('serialport');
            var portList = [];
            try {
                await SerialPort.list().then((ports, err) => {
                    if (err) {
                        serialPort.CB_error(err);
                    }

                    if (ports.length !== 0) {
                        // Iterate through each port and push it into our list if it
                        // meets our criteria
                        ports.forEach(port => {
                            // We are saying that a port must have a valid
                            // product ID for us to accept it
                            if( port.productId !== undefined ) {
                                portList.push(port.path);
                            }
                        })
                    }
                })

                return portList;
            }
            catch(err) {
                serialPort.CB_error(err.message);
            }
        },
        // Return the current Serial Port settings
        getPortSettings: function() {
            return serialPort.settings;
        },
        // Connect to the port, checking if it has been properly configured, and the serial port object
        // is not undefined or null
        portConnect: function(path, baud) {
            if( (typeof(path) !== 'string') || path === "" ) {
                return false;
            }

            if( (typeof(baud) !== 'number') || baud === 0 ) {
                return false;
            }

            if( (serialPort.settings.path === path) && (serialPort.settings.baud === baud) && (serialPort.port.isOpen)) {
                return false;
            }

            serialPort.settings.path = path;
            serialPort.settings.baud = baud;

            if( (serialPort.port !== null) && (serialPort.port.isOpen) ) {
                this.portDisconnect();
            }

            const SerialPort = require('serialport');
            // Create a new serial port object using the path and badurate sepcified.
            // Set auto-open to false meaning the portConnect API must be called before
            // data will begin to come through
            serialPort.port = new SerialPort(path, {autoOpen: false, baudRate: baud}, (err) => {
                if(err) {
                    serialPort.CB_error(err);
                }
            })

            const Readline = require('@serialport/parser-readline');

            // Attach a parser that searches for the specified delimeter before sending
            // data through on the "data" event.
            serialPort.parser = serialPort.port.pipe(new Readline({delimeter: '\n'}))

            // Create the new "data" even CB which calls our data rcvd callback
            serialPort.parser.on('data', (data) => {
                var incoming = removeAnsiCodes(data);
                serialPort.CB_dataRcvd(incoming);
            })

            // When the port is open, send a callback
            serialPort.port.on('open', () => {
                serialPort.CB_portConnected();
            })

            // When the port is closed, send a callback
            serialPort.port.on('close', () => {
                serialPort.CB_portDisconnected();
            })

            serialPort.port.open( (err) => {
                if( err ) {
                    serialPort.CB_error(err);
                }
            });
        },
        // Disconnect the port, checking if it has been properly configured, and the serial port object
        // is not undefined or null
        portDisconnect: function() {
            try {
                if( (serialPort.port !== null) && (serialPort.port.isOpen) ) {
                    serialPort.port.close();
                }
            }
            catch(err) {
                serialPort.CB_error(err.message);
            }
        },
        // Setup a callback to be executed any time new data is received over the serial port.
        setupCallbacks: function(cb, connect, disconnect, error) {
            if( cb !== null ) {
                serialPort.CB_dataRcvd = cb;
            }

            if( connect !== null ) {
                serialPort.CB_portConnected = connect;
            }

            if( disconnect !== null ) {
                serialPort.CB_portDisconnected = disconnect;
            }

            if( error !== null ) {
                serialPort.CB_error = error;
            }
        },
        // If our serial port connection is configured, send data out with an appended \n\r
        sendData: function(outgoing) {
            try {
                if( (serialPort.isConfigured) && (serialPort.port !== undefined) && (serialPort.port !== null) ) {
                    outgoing = outgoing + "\n\r";
                    serialPort.port.write(outgoing);
                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch(err) {
                serialPort.CB_error(err.message);
                return false;
            }
        }
    }
})();

var UIController = (function() {

    // DOM strings
    var DOMstrings = {
        infoBox: "infoBox",
        infoHead: "infoHead",
        infoTxt: "infoTxt",
        txtInput: "txtInput",
        txtOutput: "txtOutput",
        txtStatus: "txtStatus",
        txtVersion: "txtVersion",
        btnSend: "btnSend",
        btnSave: "btnSave",
        btnSettingsOpen: "btnSettings",
        btnSettingsClose: "btnSettingsClose",
        btnMonitorClear: "btnMonitorClear",
        btnConnect: "btnConnect",
        btnWinClose: "btnWinClose",
        btnWinMinimize: "btnWinMinimize",
        btnWinMaximize: "btnWinMaximize",
        settingsWin: "settingsWin",
        cboPortList: "cboPortList",
        cboBaudList: "cboBaudList",
        chkLocalEcho: "chkLocalEcho",
        chkAutoScroll: "chkAutoScroll",
        maximizeFigure: "maximizeFigure"
    }

    // Open a save file dialog to save the serial data output screen
    var openSaveFileDialog = function() {
        const {remote} = require('electron');
        var filePath = remote.dialog.showSaveDialogSync(null);

        return filePath;
    }

    // Check if a provided option can be found in the given
    // list.
    var foundInList = function(opt, list) {
        var found = false;
        list.forEach( (li) => {
            if( li === opt ) {
                found = true;
            }
        })

        return found;
    }

    // Convert an HTML combo box option list into an
    // array containing the option text
    var cboOptionsToList = function(cboBox) {
        var list = [];

        if(cboBox.options.length < 1)
            return list;

        for( var i=0; i < cboBox.options.length; i++ ) {
            list.push(cboBox.options[i].text);
        }

        return list;
    }

    var isAutoScrollChecked = function () {
        var chk = document.getElementById(DOMstrings.chkAutoScroll);
        if( chk.checked ) {
            return true;
        }
        else {
            return false;
        }
    }

    // UI Controller API
    return {
        // Open the settings modal window
        openSettingsWindow: function() {
            document.getElementById(DOMstrings.settingsWin).style.opacity = 1;
            document.getElementById(DOMstrings.settingsWin).style.zIndex = 2;
        },
        // CLose the settings modal window
        closeSettingsWindow: function() {
            document.getElementById(DOMstrings.settingsWin).style.opacity = 0;
            document.getElementById(DOMstrings.settingsWin).style.zIndex = -1;
        },
        // Open a save window dialog and then write a file to the returned
        // file system path if one is given.
        openSaveDataWindow: function() {
            var dataOutput = document.getElementById(DOMstrings.txtOutput).textContent;

            if( dataOutput === "" ) {
                this.showInfoMsg("error", "No data available.", "There is no data to be saved.");
                return;
            }

            var filePath = openSaveFileDialog();
            if( filePath !== undefined ) {
                fs.writeFile(filePath, dataOutput, (err) => {
                    if(err) {
                        this.showInfoMsg("error", "There was a problem saving.", `${err}`);
                    }
                })
            }
            else {
                this.showInfoMsg("error", "No filepath was given.", `A filepath was not given to save the file.`);
            }
        },
        // Add serial data to the monitor window
        appendSerialData: function(data) {
            document.getElementById(DOMstrings.txtOutput).textContent += `${data}\n`;

            // If auto-scroll is checked. Move the view port down to the bottom
            // of the text output
            if( isAutoScrollChecked() ) {
                var elem = document.getElementById(DOMstrings.txtOutput);
                elem.scrollTop = elem.scrollHeight;
            }
        },
        // Clear the serial data window
        clearSerialData: function() {
            document.getElementById(DOMstrings.txtOutput).textContent = "";
        },
        // Show a dialog message in the bottom of the screen
        showInfoMsg: function(type, header, msg) {
            if( type === "error" ) {
                document.getElementById(DOMstrings.infoTxt).style.backgroundColor = "#BF616A";
                document.getElementById(DOMstrings.infoHead).style.backgroundColor = "#bf505a";
            }
            else if( type === "info" ) {
                document.getElementById(DOMstrings.infoTxt).style.backgroundColor = "#81A1C1";
                document.getElementById(DOMstrings.infoHead).style.backgroundColor = "#5E81AC";
            }
            else {
                return;
            }

            document.getElementById(DOMstrings.infoHead).textContent = header;
            document.getElementById(DOMstrings.infoTxt).textContent = msg;

            document.getElementById(DOMstrings.infoBox).style.opacity = 1;
            document.getElementById(DOMstrings.infoBox).style.WebkitTransform = "translate(-52rem, 0)";

            setTimeout(() => {
                document.getElementById(DOMstrings.infoBox).style.opacity = 0;
                document.getElementById(DOMstrings.infoBox).style.transform = ""
            }, 7500);
        },
        // Focus input on the text input field
        focusOnInput: function() {
            document.getElementById(DOMstrings.txtInput).focus();
        },
        // Update the port list combo box within the settings screen
        updatePortList: function(ports) {
            if( ports.length < 1 )
                return;

            var cboPorts = document.getElementById(DOMstrings.cboPortList);

            // Remove old ports
            for( var i=0; i < cboPorts.options.length; i++ ) {
                if( !foundInList(cboPorts.options[i].text, ports) ) {
                    // The option was not found in the port list.. Remove it
                    cboPorts.remove(i);
                }
            }

            var cboOptionsList = cboOptionsToList(cboPorts);

            // Add new ports
            ports.forEach( (port) => {
                if( !foundInList(port, cboOptionsList) ) {
                    var option = document.createElement("option");
                    option.text = port;
                    cboPorts.add(option);
                }
            })
        },
        // Set the available baud rates combo box using the provided list
        setAvailableBaudRates: function(baudList) {
            var cboBauds = document.getElementById(DOMstrings.cboBaudList);

            baudList.forEach( (baud) => {
                var option = document.createElement("option");
                option.text = baud;
                cboBauds.add(option);
            })
        },
        // Get the current selected serial port path
        getSelectedPath: function() {
            var cboPorts = document.getElementById(DOMstrings.cboPortList);
            var index = cboPorts.selectedIndex;

            return cboPorts.options[index].text;
        },
        // Get the current selected serial port baud rate
        getSelectedBaud: function() {
            var cboBaud = document.getElementById(DOMstrings.cboBaudList);
            var index = cboBaud.selectedIndex;

            return parseInt(cboBaud.options[index].text);
        },
        // Get the DOM strings used in our HTMl
        getDOMstrings: function() {
            return DOMstrings;
        },
        setStatus: function(stat) {
            var status = document.getElementById(DOMstrings.txtStatus);
            status.textContent = stat;
        },
        // Retrieve the current text input value
        getTxtInput: function() {
            return document.getElementById(DOMstrings.txtInput).value;
        },
        // Clear the current text input value
        clearTxtInput: function() {
            document.getElementById(DOMstrings.txtInput).value = "";
        },
        isLocalEchoChecked: function () {
            var chk = document.getElementById(DOMstrings.chkLocalEcho);
            if( chk.checked ) {
                return true;
            }
            else {
                return false;
            }
        },
        setVersion: function(ver) {
            version = document.getElementById(DOMstrings.txtVersion);
            version.innerText = `v${ver}`;
        }
    }
})();

// Main App controller
var controller = (function(dataCtrl, UICtrl) {

    var availablePorts = [];
    var availableBaudRates = [110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 128000, 256000];

    // Callback to be fired when new data is retrieved. This then
    // appends serial data using the UI controller API
    var CB_dataRcvd = function(incoming) {
        UICtrl.appendSerialData(incoming);
    }

    var CB_portConnected = function() {
        var DOM = UICtrl.getDOMstrings();
        var path = UICtrl.getSelectedPath();
        var baud = UICtrl.getSelectedBaud();
        UICtrl.showInfoMsg("info", "Connected.", `Connected to ${path} @ ${baud} baud`);
        UICtrl.setStatus(`Connected to ${path} @ ${baud} baud`);
        document.getElementById(DOM.btnConnect).innerText = "disconnect";
        document.getElementById(DOM.btnConnect).style.backgroundColor = "#BF616A";
        document.getElementById(DOM.cboBaudList).disabled=true;
        document.getElementById(DOM.cboPortList).disabled=true;
    }

    var CB_portDisconnected = function() {
        var DOM = UICtrl.getDOMstrings();
        UICtrl.showInfoMsg("error", "Disconnected.", "Serial port disconnected.");
        UICtrl.setStatus('Disconnected');
        document.getElementById(DOM.btnConnect).innerText = "connect";
        document.getElementById(DOM.btnConnect).style.backgroundColor = "";
        document.getElementById(DOM.cboBaudList).disabled=false;
        document.getElementById(DOM.cboPortList).disabled=false;
    }

    var CB_errorOccured = function (err) {
        UICtrl.showInfoMsg("error", "Serial Port error", err);
    }

    // Retrieve an available port list using the data controller API.
    var retrievePortList = async function() {
        // Retrieve the currently available ports.
        availablePorts = await dataCtrl.getAvailableSerialPorts();
        UICtrl.updatePortList(availablePorts);
        // Reschedule a port retrieval
        setTimeout(retrievePortList, 500);
    }

    // Retrieve the current text input, send it out the serial port
    // and then clear the text input field
    var sendInputData = function() {
        var input = UICtrl.getTxtInput();
        dataCtrl.sendData(input);

        // If local echo is enabled. Send the input data
        // to the local serial monitor
        if( UICtrl.isLocalEchoChecked() ) {
            UICtrl.appendSerialData(input);
        }

        UICtrl.clearTxtInput();
    }

    // Create an event that fires when the enter key is depressed.
    var init_keyboard_input = function() {
        const {remote} = require('electron');
        const BrowserWindow = remote.BrowserWindow;
        const win = BrowserWindow.getAllWindows()[0];

        win.webContents.on("before-input-event", (event, input) => {
            if( (input.type === "keyDown") && ((input.code === "Enter") || (input.code === "NumpadEnter")) ) {
                sendInputData();
            }
        });
    }

    var toggleMaxRestoreButtons = function() {
        const {remote} = require('electron');
        const win = remote.getCurrentWindow();
        var DOM = UICtrl.getDOMstrings();

        if( win.isMaximized() ) {
            // Window is maximized.. Set the icon to minimize
            document.getElementById(DOM.maximizeFigure).src = "./assets/imgs/minimize.svg"
        }
        else {
            // Window is smaller.. Set the icon to maximize
            document.getElementById(DOM.maximizeFigure).src = "./assets/imgs/maximize.svg"
        }
    }

    // Create our UI event listeners
    var createEventListeners = function() {
        const {remote} = require('electron');
        const win = remote.getCurrentWindow();
        var DOM = UICtrl.getDOMstrings();

        win.on('maximize', toggleMaxRestoreButtons);
        win.on('unmaximize', toggleMaxRestoreButtons);

        document.getElementById(DOM.btnSend).addEventListener("click", () => {
            sendInputData();
        })

        document.getElementById(DOM.btnSettingsOpen).addEventListener("click", () => {
            UICtrl.openSettingsWindow();
        })

        document.getElementById(DOM.btnSettingsClose).addEventListener("click", () => {
            UICtrl.closeSettingsWindow();
        })

        document.getElementById(DOM.btnConnect).addEventListener("click", () => {
            if( document.getElementById(DOM.btnConnect).innerText == "connect" ) {
                var path = UICtrl.getSelectedPath();
                var baud = UICtrl.getSelectedBaud();
                dataCtrl.portConnect(path, baud);
            }
            else {
                dataCtrl.portDisconnect();
            }
        })

        document.getElementById(DOM.btnMonitorClear).addEventListener("click", () => {
            UICtrl.clearSerialData();
        })

        document.getElementById(DOM.btnSave).addEventListener("click", () => {
            UICtrl.openSaveDataWindow();
        })

        document.getElementById(DOM.btnWinClose).addEventListener("click", () => {
            win.close();
        })

        document.getElementById(DOM.btnWinMaximize).addEventListener("click", () => {
            if( win.isMaximized() ) {
                win.unmaximize();
            }
            else {
                win.maximize();
            }
        })

        document.getElementById(DOM.btnWinMinimize).addEventListener("click", () => {
            win.minimize();
        })
    }

    // Main app controller API
    return {
        init: function() {
            // Create our event listeners for the UI
            createEventListeners();

            // Init the keyboard event for the "Enter" key
            init_keyboard_input();

            // Setup the callback for new data
            dataCtrl.setupCallbacks( CB_dataRcvd, CB_portConnected, CB_portDisconnected, CB_errorOccured);

            // Set the app version in the footer
            const {version} = require("../../package.json");
            UICtrl.setVersion(version);

            // Init the baudrate combo box with our available
            // baud rates.
            UICtrl.setAvailableBaudRates(availableBaudRates);

            // Focus the input on the txt field.
            UICtrl.focusOnInput();

            // Kick off our timer responsible or retrieving
            // available ports
            retrievePortList();
        }
    }
})(dataController, UIController);

// Call the app controller init to kick off the application.
controller.init();
