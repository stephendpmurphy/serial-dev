const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const ansiRegex = require('ansi-regex');
const {remote} = require('electron');
const fs = require('fs');
const path = require('path');

var dataController = (function() {

    // Parser for turning a byte buffer into an ascii string
    var serialPort = {
        parser: null,
        port: null,
        settings: {
            path: null,
            baud: null
        },
        isConfigured: false
    }

    var CB_dataRcvd;

    var openPort = function(path, baud) {
        serialPort.port = new SerialPort(path, {autoOpen: false, baudRate: baud}, (err) => {
            console.log(`${err}`);
            if(err) {
                console.log("Error: ", err);
                return false;
            }
            else {
                console.log("No errors");
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
                        alert(`There was a problem searching for ports: ${err}`);
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
            return serialPort.portSettings;
        },
        updatePortSettings: function(path, baud) {
            if( (typeof(path) !== 'string') && path === "" )
                return false;

            if( (typeof(baud) !== 'number') || baud === 0 )
                return false;

            serialPort.settings.path = path;
            serialPort.settings.baud = baud;

            this.portDisconnect();

            console.log(`Connecting to ${serialPort.settings.path} @ ${serialPort.settings.baud} baud`);

            openPort(serialPort.settings.path, serialPort.settings.baud);

            serialPort.parser = serialPort.port.pipe(new Readline({delimeter: '\n'}))

            serialPort.parser.on('data', (data) => {
                var newData = removeAnsiCodes(data);
                CB_dataRcvd(newData);
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

                openPort(portSettings.path, portSettings.baud);

                if( serialPort.port !== undefined ) {
                    console.log("Opening");
                    return serialPort.port.open();
                }
                else
                {
                    return false;
                }
            }
            catch(err) {
                return false;
            }

        },
        portDisconnect: function() {
            console.log("Closing port");
            try {
                if( serialPort.port !== undefined ) {
                    return serialPort.port.close();
                }
                else
                {
                    return false;
                }
            }
            catch(err) {
                return false;
            }
        },
        isPortOpen: function() {
            if(port !== undefined) {
                return serialPort.port.isOpen;
            }
            else {
                return false;
            }
        },
        setupDataCB: function(cb) {
            if( cb !== null )
                console.log("Data Rcvd CB setup.");
                CB_dataRcvd = cb;
        }
    }
})();

var UIController = (function() {
    var saveDialog = remote.dialog;
    var parentWindow = remote.BrowserWindow.getFocusedWindow();

    var DOMstrings = {
        serialData: "dataOutput",
        info_msg: "info-msg",
        infoHead: "infoHead",
        infoTxt: "infoTxt",
        txtInput: "txtInput",
        settingsBlur: "settings--blur",
        btnSend: "btnSend",
        btnSave: "btnSave",
        btnSettings: "btnSettings",
        portList: "portList",
        baudList: "baudList"
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
            document.getElementById(DOMstrings.settingsBlur).style.opacity = 1;
            document.getElementById(DOMstrings.settingsBlur).style.zIndex = 2;
        },
        closeSettingsWindow: function() {
            document.getElementById(DOMstrings.settingsBlur).style.opacity = 0;
            document.getElementById(DOMstrings.settingsBlur).style.zIndex = -1;
        },
        openSaveDataWindow: function() {
            var dataOutput = document.getElementById(DOMstrings.serialData).textContent;

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
            document.getElementById(DOMstrings.serialData).textContent += `${data}\n`;

            var elem = document.getElementById(DOMstrings.serialData);
            elem.scrollTop = elem.scrollHeight;
        },
        clearSerialData: function() {
            document.getElementById(DOMstrings.serialData).textContent = "";
        },
        showInfoMsg: function(type, header, msg) {
            document.getElementById(DOMstrings.info_msg).style.opacity = 1;
            document.getElementById(DOMstrings.info_msg).style.WebkitTransform = "translate(-53rem, 0)";

            if( type === "error" ) {
                document.getElementById(DOMstrings.info_msg).style.backgroundColor = "#BF616A";
            }
            else if( type === "info" ) {
                document.getElementById(DOMstrings.info_msg).style.backgroundColor = "#A3BE8C";
            }

            document.getElementById(DOMstrings.infoHead).textContent = header;
            document.getElementById(DOMstrings.infoTxt).textContent = msg;

            setTimeout(() => {
                document.getElementById(DOMstrings.info_msg).style.opacity = 0;
                document.getElementById(DOMstrings.info_msg).style.transform = ""
            }, 4000);
        },
        focusOnInput: function() {
            document.getElementById(DOMstrings.txtInput).focus();
        },
        updatePortList: function(ports) {
            if( ports.length < 1 )
                return;

            var cboPorts = document.getElementById(DOMstrings.portList);

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
        getSelectedPath: function() {
            var cboPorts = document.getElementById(DOMstrings.portList);
            var index = cboPorts.selectedIndex;

            return cboPorts.options[index].text;
        },
        getSelectedBaud: function() {
            var cboBaud = document.getElementById(DOMstrings.baudList);
            var index = cboBaud.selectedIndex;

            return parseInt(cboBaud.options[index].text);
        }
    }
})();

var controller = (function(dataCtrl, UICtrl) {

    var availablePorts = [];

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
        document.getElementById("btnSettings").addEventListener("click", () => {
            UICtrl.openSettingsWindow();
        })

        document.getElementById("btnSettingsClose").addEventListener("click", () => {
            UICtrl.closeSettingsWindow();
        })

        document.getElementById("btnSettingsApply").addEventListener("click", () => {
            var path = UICtrl.getSelectedPath();
            var baud = UICtrl.getSelectedBaud();

            UICtrl.closeSettingsWindow();

            if( dataCtrl.updatePortSettings(path, baud) ) {
                UICtrl.showInfoMsg("info", "Connected.", `Connected to ${path} @ ${baud} baud`);
            }
        })

        document.getElementById("btnSave").addEventListener("click", () => {
            UICtrl.openSaveDataWindow();
        })
    }

    return {
        init: function() {
            // Create our event listeners for the UI
            createEventListeners();

            // Kick off our timer responsible or retrieving
            // available ports
            timer_updatePorts();

            // Setup the callback for new data
            dataCtrl.setupDataCB( CB_dataRcvd );

            // Focus the input on the txt field.
            UICtrl.focusOnInput();
        }
    }
})(dataController, UIController);

controller.init();
