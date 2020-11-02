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
        isConfigured: false,
        CB_dataRcvd: null
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
            return string;
        }
    }

    // Instantiate a new SerialPort object using the provided serial port path
    // and baud rate
    var instantiatePort = function(path, baud) {
        const SerialPort = require('serialport');
        // Create a new serial port object using the path and badurate sepcified.
        // Set auto-open to false meaning the portConnect API must be called before
        // data will begin to come through
        serialPort.port = new SerialPort(path, {autoOpen: false, baudRate: baud}, (err) => {
            if(err) {
                console.log("Error: ", err);
                return false;
            }
            else {
                return true;
            }
        })

        const Readline = require('@serialport/parser-readline');

        // Attach a parser that searches for the specified delimeter before sending
        // data through on the "data" event.
        serialPort.parser = serialPort.port.pipe(new Readline({delimeter: '\n'}))

        // Create the new "data" even CB which strips ANSI codes from the string,
        // and then call ours CB for our controller to consumer and then display
        serialPort.parser.on('data', (data) => {
            var strippedData = removeAnsiCodes(data);
            serialPort.CB_dataRcvd(strippedData);
        })

        // When the port is open, emit a console message
        serialPort.port.on('open', () => {
            console.log("Port opened.");
        })

        // When the port is closed, emit a console message
        serialPort.port.on('close', () => {
            console.log("Port closed.");
        })

        return true;
    }

    // Data Controller API
    return {
        // Retrieve available serial port paths and populate a port list to be
        // sent back to the caller
        getAvailableSerialPorts: async function() {
            const SerialPort = require('serialport');
            var portList = [];
            try {
                SerialPort.list().then((ports, err) => {
                    if (err) {
                        console.log("Error: ", err.message);
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
            }
            catch(err) {
                console.log("Failed to retrieve a port list: ", err);
            }

            return portList;
        },
        // Return the current Serial Port settings
        getPortSettings: function() {
            return serialPort.settings;
        },
        // Update the Serial Port path and baud rate. Return the state of updating
        // the port settings
        updatePortSettings: function(path, baud) {
            if( (typeof(path) !== 'string') || path === "" )
                return false;

            if( (typeof(baud) !== 'number') || baud === 0 )
                return false;

            serialPort.settings.path = path;
            serialPort.settings.baud = baud;

            this.portDisconnect();

            console.log(`Connecting to ${serialPort.settings.path} @ ${serialPort.settings.baud} baud`);

            serialPort.isConfigured = instantiatePort(serialPort.settings.path, serialPort.settings.baud);

            return serialPort.isConfigured;
        },
        // Connect to the port, checking if it has been properly configured, and the serial port object
        // is not undefined or null
        portConnect: function() {
            console.log("Opening port");
            try {
                if( (serialPort.isConfigured) && (serialPort.port !== undefined) && (serialPort.port !== null) ) {
                    serialPort.port.open();
                    return true;
                }
                else if( instantiatePort(portSettings.path, portSettings.baud) ) {
                    serialPort.port.open();
                    return true;
                }
                else {
                    return false;
                }
            }
            catch(err) {
                console.log("There was a problem opening the port: ", err);
                return false;
            }
        },
        // Disconnect the port, checking if it has been properly configured, and the serial port object
        // is not undefined or null
        portDisconnect: function() {
            console.log("Closing port");
            try {
                if( (serialPort.isConfigured) && (serialPort.port !== undefined) && (serialPort.port !== null) ) {
                    serialPort.port.close();
                    return;
                }
                else
                {
                    return false;
                }
            }
            catch(err) {
                console.log("There was a problem closing the port: ", err);
                return false;
            }
        },
        // Setup a callback to be executed any time new data is received over the serial port.
        setupDataCB: function(cb) {
            if( cb !== null )
                console.log("Data Rcvd CB setup.");
                serialPort.CB_dataRcvd = cb;
        },
        // If our serial port connection is configured, send data out with an appended \n\r
        sendData: function(outgoing) {
            try {
                if( (serialPort.isConfigured) && (serialPort.port !== undefined) && (serialPort.port !== null) ) {
                    console.log("Sending: ", outgoing);
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
                console.log("There was a problem closing the port: ", err);
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
        btnSend: "btnSend",
        btnSave: "btnSave",
        btnSettingsOpen: "btnSettings",
        btnSettingsClose: "btnSettingsClose",
        btnMonitorClear: "btnMonitorClear",
        btnConnect: "btnConnect",
        settingsWin: "settingsWin",
        cboPortList: "cboPortList",
        cboBaudList: "cboBaudList"
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
            console.log("Saving file at: ", filePath);
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

            var elem = document.getElementById(DOMstrings.txtOutput);
            elem.scrollTop = elem.scrollHeight;
        },
        // Clear the serial data window
        clearSerialData: function() {
            document.getElementById(DOMstrings.txtOutput).textContent = "";
        },
        // Show a dialog message in the bottom of the screen
        showInfoMsg: function(type, header, msg) {
            if( type === "error" ) {
                document.getElementById(DOMstrings.infoBox).style.backgroundColor = "#BF616A";
            }
            else if( type === "info" ) {
                document.getElementById(DOMstrings.infoBox).style.backgroundColor = "#A3BE8C";
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
            }, 4000);
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
                    console.log("Removing: ", cboPorts.options[i].text);
                    // The option was not found in the port list.. Remove it
                    cboPorts.remove(i);
                }
            }

            var cboOptionsList = cboOptionsToList(cboPorts);

            // Add new ports
            ports.forEach( (port) => {
                if( !foundInList(port, cboOptionsList) ) {
                    console.log("Adding: ", port);
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

    // Timer used to retrieve a port list, and then display it using the
    // UI controller API. We then reschedule this function to be fired again.
    var timer_updatePorts = function() {
        retrievePortList();
        UICtrl.updatePortList(availablePorts);

        setTimeout(timer_updatePorts, 500);
    }

    // Retrieve an available port list using the data controller API.
    var retrievePortList = function() {
        // Retrieve the currently available ports.
        dataCtrl.getAvailableSerialPorts().then( (ports) => {
            // Store the available ports list
            availablePorts = ports;
        })
    }

    // Retrieve the current text input, send it out the serial port
    // and then clear the text input field
    var sendInputData = function() {
        var input = UICtrl.getTxtInput();
        dataCtrl.sendData(input);
        UICtrl.clearTxtInput();
    }

    var applySettings = function() {
        var path = UICtrl.getSelectedPath();
        var baud = UICtrl.getSelectedBaud();

        if( !dataCtrl.updatePortSettings(path, baud) ) {
            UICtrl.showInfoMsg("error", "Could not connect.", "Failed to connect to the requested serial port.");
            UICtrl.setStatus('Disconnected');
        }
    }

    // Create an event that fires when the enter key is depressed.
    var init_keyboard_input = function() {
        const {remote} = require('electron');
        const BrowserWindow = remote.BrowserWindow;
        const win = BrowserWindow.getFocusedWindow();

        win.webContents.on("before-input-event", (event, input) => {
            if( (input.type === "keyDown") && (input.code === "Enter") )
                sendInputData();
        });
    }

    // Create our UI event listeners
    var createEventListeners = function() {
        var DOM = UICtrl.getDOMstrings();

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
            UICtrl.closeSettingsWindow();

            if( document.getElementById(DOM.btnConnect).innerText == "connect" ) {

                applySettings();

                if( dataCtrl.portConnect() ) {
                    var path = UICtrl.getSelectedPath();
                    var baud = UICtrl.getSelectedBaud();
                    UICtrl.showInfoMsg("info", "Connected.", `Connected to ${path} @ ${baud} baud`);
                    UICtrl.setStatus(`Connected to ${path} @ ${baud} baud`);
                    document.getElementById(DOM.btnConnect).innerText = "disconnect";
                    return;
                }
            }
            else {
                document.getElementById(DOM.btnConnect).innerText = "connect";
                if( dataCtrl.portDisconnect() ) {
                    UICtrl.showInfoMsg("error", "Disconnected.", "Serial port disconnected.");
                    UICtrl.setStatus('Disconnected');
                    document.getElementById(DOM.btnConnect).innerText = "connect";
                    return;
                }
            }

            UICtrl.showInfoMsg("error", "Could not connect.", "Failed to connect to the requested serial port.");
            UICtrl.setStatus('Disconnected');
        })

        document.getElementById(DOM.btnMonitorClear).addEventListener("click", () => {
            UICtrl.clearSerialData();
        })

        document.getElementById(DOM.btnSave).addEventListener("click", () => {
            UICtrl.openSaveDataWindow();
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
            dataCtrl.setupDataCB( CB_dataRcvd );

            // Init the baudrate combo box with our available
            // baud rates.
            UICtrl.setAvailableBaudRates(availableBaudRates);

            // Focus the input on the txt field.
            UICtrl.focusOnInput();

            // Kick off our timer responsible or retrieving
            // available ports
            timer_updatePorts();
        }
    }
})(dataController, UIController);

// Call the app controller init to kick off the application.
controller.init();
