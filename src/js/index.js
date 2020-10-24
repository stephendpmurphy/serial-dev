const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const ansiRegex = require('ansi-regex');
const {remote} = require('electron');
const fs = require('fs');
const path = require('path');

var dataController = (function() {

    // Parser for turning a byte buffer into an ascii string
    var parser;
    var port;
    var portSettings = {
        path: null,
        baud: 9600
    };
    var CB_dataRcvd;

    var openPort = function(path, baud) {
        port = new SerialPort(path, {autoOpen: false, baudRate: baud}, (err) => {
            if(err) {
                console.log("Error: ", err.message);
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
            return portSettings;
        },
        updatePortSettings: function(path, baud) {
            if( (typeof(path) !== 'string') && path === "" )
                return false;

            if( (typeof(baud) !== 'number') || baud === 0 )
                return false;

            portSettings.path = path;
            portSettings.baud = baud;

            this.portDisconnect();

            openPort(portSettings.path, portSettings.baud);

            parser = port.pipe(new Readline({delimeter: '\n'}))

            parser.on('data', (data) => {
                var newData = removeAnsiCodes(data);
                CB_dataRcvd(newData);
            })

            port.on('open', () => {
                console.log("Port opened.");
            })

            port.on('close', () => {
                console.log("Port closed.");
            })
        },
        portConnect: function() {
            try {
                openPort(portSettings.path, portSettings.baud);

                if( port !== undefined ) {
                    return port.open();
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
            try {
                if( port !== undefined ) {
                    return port.close();
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
        infoType: "infoType",
        infoTxt: "infoTxt"
    }

    var openSaveFileDialog = function() {
        var filePath = saveDialog.showSaveDialogSync(null);

        return filePath;
    }

    return {
        openSettingsWindow: function() {
            var settingsWin = new remote.BrowserWindow( {
                height: 320,
                width: 320,
                parent: parentWindow,
                modal: true
            });

            var htmlPath = path.join('file://', __dirname,'../settings.html');
            var parentPos = parentWindow.getPosition();
            settingsWin.removeMenu();
            settingsWin.on('close', () => { settingsWin = null });
            settingsWin.loadURL(htmlPath);
            settingsWin.once('ready-to-show', () => {
                settingsWin.show();
                settingsWin.setPosition(parentPos[0], parentPos[1]);
            })
        },
        openSaveDataWindow: function() {
            var dataOutput = document.getElementById(DOMstrings.serialData).textContent;

            if( dataOutput === "" ) {
                alert("There is no data to be saved.");
                return;
            }

            var filePath = openSaveFileDialog();

            if( filePath !== "" ) {
                fs.writeFile(filePath, dataOutput, (err) => {
                    if(err) {
                        alert(`Couldn't save file: ${err}`);
                    }
                })
            }
            else {
                alert("No filepath was given.");
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
        showInfoMsg: function(type, msg) {
            document.getElementById(DOMstrings.info_msg).style.opacity = 1;
            document.getElementById(DOMstrings.infoType).textContent = type;
            document.getElementById(DOMstrings.infoTxt).textContent = msg;
            setTimeout(() => {
                document.getElementById(DOMstrings.info_msg).style.opacity = 0;
            }, 4000);
        }

    }
})();

var controller = (function(dataCtrl, UICtrl) {

    var availablePorts = [];

    var CB_dataRcvd = function(incoming) {
        UICtrl.appendSerialData(incoming);
    }

    var createMenuBar = function() {
        var menu = remote.Menu.buildFromTemplate([
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Save output',
                        click() { UICtrl.openSaveDataWindow() }
                    },
                    {
                        label:'Quit',
                        click () { remote.app.quit() }
                    }
                ]
            },
            {
                label: 'Settings',
                submenu: [
                    {
                        label:'COM Settings',
                        click () { UICtrl.openSettingsWindow(); }
                    },
                    {
                        label:'Connect',
                        click () {
                            var settings = dataCtrl.getPortSettings();

                            if( dataCtrl.portConnect() ) {
                                UICtrl.showInfoMsg("CONNECTED", `Connected to ${settings.path} at ${settings.baud} baud.`);
                            }
                            else {
                                UICtrl.showInfoMsg("ERROR", `Could not connect to ${settings.path}`);
                            }
                        }
                    },
                    {
                        label:'Disconnect',
                        click() { dataCtrl.portDisconnect() }
                    },
                    {
                        label:'Refresh',
                        click () {
                            availablePorts = dataCtrl.getAvailableSerialPorts()
                            console.log("Available ports: ", availablePorts);
                        }
                    }
                ]
            }
        ])

        remote.Menu.setApplicationMenu(menu);
    };

    return {
        init: function() {
            // Create the top menu-bar
            createMenuBar();

            // Retrieve the currently available ports.
            // Wait until it finishes.
            dataCtrl.getAvailableSerialPorts();

            // Setup the callback for new data
            dataCtrl.setupDataCB( CB_dataRcvd );

            dataCtrl.updatePortSettings('/dev/ttyUSB0', 9600);
        }
    }
})(dataController, UIController);

controller.init();
