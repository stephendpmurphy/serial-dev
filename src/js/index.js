const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const ansiRegex = require('ansi-regex');
const {remote} = require('electron');
const fs = require('fs');
const path = require('path');

var dataController = (function() {

    var serialPort = {
        parser: null,
        port: null,
        settings: {
            path: null,
            baud: null
        },
        CB_dataRcvd: null
    }

    var instantiatePort = function(path, baud) {
        serialPort.port = new SerialPort(path, {autoOpen: false, baudRate: baud}, (err) => {
            if(err) {
                console.log("Error: ", err);
                return false;
            }
            else {
                return true;
            }
        })
    }

    var removeAnsiCodes = function(string) {
        if( typeof string === 'string' ) {
            var str
            str = string.replace(ansiRegex(), '');
            return str;
        }
        else {
            return string;
        }
    }

    return {
        getAvailableSerialPorts: async function() {
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
        getPortSettings: function() {
            return serialPort.settings;
        },
        updatePortSettings: function(path, baud) {
            if( (typeof(path) !== 'string') || path === "" )
                return false;

            if( (typeof(baud) !== 'number') || baud === 0 )
                return false;

            serialPort.settings.path = path;
            serialPort.settings.baud = baud;

            this.portDisconnect();

            console.log(`Connecting to ${serialPort.settings.path} @ ${serialPort.settings.baud} baud`);

            instantiatePort(serialPort.settings.path, serialPort.settings.baud);

            serialPort.parser = serialPort.port.pipe(new Readline({delimeter: '\n'}))

            serialPort.parser.on('data', (data) => {
                var strippedData = removeAnsiCodes(data);
                serialPort.CB_dataRcvd(strippedData);
            })

            serialPort.port.on('open', () => {
                console.log("Port opened.");
            })

            serialPort.port.on('close', () => {
                console.log("Port closed.");
            })

            serialPort.port.open();

            return true;
        },
        portConnect: function() {
            try {
                if( (portSettings.path === undefined) || portSettings.baud !== undefined ) {
                    console.log("Problem found with settings");
                    return false;
                }

                instantiatePort(portSettings.path, portSettings.baud);

                if( (serialPort.port !== undefined) || (serialPort.port !== null) ) {
                    console.log("Opening");
                    serialPort.port.open();

                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch(err) {
                console.log("There was a problem opening the port: ", err);
                return false;
            }

        },
        portDisconnect: function() {
            console.log("Closing port");
            try {
                if( (serialPort.port !== undefined) || (serialPort.port !== null) ) {
                    return serialPort.port.close();
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
        setupDataCB: function(cb) {
            if( cb !== null )
                console.log("Data Rcvd CB setup.");
                serialPort.CB_dataRcvd = cb;
        }
    }
})();

var UIController = (function() {
    var saveDialog = remote.dialog;

    var DOMstrings = {
        infoBox: "infoBox",
        infoHead: "infoHead",
        infoTxt: "infoTxt",
        txtInput: "txtInput",
        txtOutput: "txtOutput",
        btnSend: "btnSend",
        btnSave: "btnSave",
        btnSettingsOpen: "btnSettings",
        btnSettingsClose: "btnSettingsClose",
        btnSettingsApply: "btnSettingsApply",
        settingsWin: "settingsWin",
        cboPortList: "cboPortList",
        cboBaudList: "cboBaudList"
    }

    var openSaveFileDialog = function() {
        var filePath = saveDialog.showSaveDialogSync(null);

        return filePath;
    }

    var foundInList = function(opt, list) {
        var found = false;
        list.forEach( (li) => {
            if( li === opt ) {
                found = true;
            }
        })

        return found;
    }

    var cboOptionsToList = function(cboBox) {
        var list = [];

        if(cboBox.options.length < 1)
            return list;

        for( var i=0; i < cboBox.options.length; i++ ) {
            list.push(cboBox.options[i].text);
        }

        return list;
    }

    return {
        openSettingsWindow: function() {
            document.getElementById(DOMstrings.settingsWin).style.opacity = 1;
            document.getElementById(DOMstrings.settingsWin).style.zIndex = 2;
        },
        closeSettingsWindow: function() {
            document.getElementById(DOMstrings.settingsWin).style.opacity = 0;
            document.getElementById(DOMstrings.settingsWin).style.zIndex = -1;
        },
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
        appendSerialData: function(data) {
            document.getElementById(DOMstrings.txtOutput).textContent += `${data}\n`;

            var elem = document.getElementById(DOMstrings.txtOutput);
            elem.scrollTop = elem.scrollHeight;
        },
        clearSerialData: function() {
            document.getElementById(DOMstrings.txtOutput).textContent = "";
        },
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
            document.getElementById(DOMstrings.infoBox).style.WebkitTransform = "translate(-53rem, 0)";

            setTimeout(() => {
                document.getElementById(DOMstrings.infoBox).style.opacity = 0;
                document.getElementById(DOMstrings.infoBox).style.transform = ""
            }, 4000);
        },
        focusOnInput: function() {
            document.getElementById(DOMstrings.txtInput).focus();
        },
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
        setAvailableBaudRates: function(baudList) {
            var cboBauds = document.getElementById(DOMstrings.cboBaudList);

            baudList.forEach( (baud) => {
                var option = document.createElement("option");
                option.text = baud;
                cboBauds.add(option);
            })
        },
        getSelectedPath: function() {
            var cboPorts = document.getElementById(DOMstrings.cboPortList);
            var index = cboPorts.selectedIndex;

            return cboPorts.options[index].text;
        },
        getSelectedBaud: function() {
            var cboBaud = document.getElementById(DOMstrings.cboBaudList);
            var index = cboBaud.selectedIndex;

            return parseInt(cboBaud.options[index].text);
        },
        getDOMstrings: function() {
            return DOMstrings;
        }
    }
})();

var controller = (function(dataCtrl, UICtrl) {

    var availablePorts = [];
    var availableBaudRates = [110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 128000, 256000];

    var CB_dataRcvd = function(incoming) {
        UICtrl.appendSerialData(incoming);
    }

    var timer_updatePorts = function() {
        retrievePortList();
        UICtrl.updatePortList(availablePorts);

        setTimeout(timer_updatePorts, 500);
    }

    var retrievePortList = function() {
        // Retrieve the currently available ports.
        dataCtrl.getAvailableSerialPorts().then( (ports) => {
            // Store the available ports list
            availablePorts = ports;
        })
    }

    var createEventListeners = function() {
        var DOM = UICtrl.getDOMstrings();

        document.getElementById(DOM.btnSettingsOpen).addEventListener("click", () => {
            UICtrl.openSettingsWindow();
        })

        document.getElementById(DOM.btnSettingsClose).addEventListener("click", () => {
            UICtrl.closeSettingsWindow();
        })

        document.getElementById(DOM.btnSettingsApply).addEventListener("click", () => {
            var path = UICtrl.getSelectedPath();
            var baud = UICtrl.getSelectedBaud();

            UICtrl.closeSettingsWindow();

            if( dataCtrl.updatePortSettings(path, baud) ) {
                UICtrl.showInfoMsg("info", "Connected.", `Connected to ${path} @ ${baud} baud`);
            }
        })

        document.getElementById(DOM.btnSave).addEventListener("click", () => {
            UICtrl.openSaveDataWindow();
        })
    }

    return {
        init: function() {
            // Create our event listeners for the UI
            createEventListeners();

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

controller.init();
