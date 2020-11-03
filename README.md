# serial-monitor

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)

Cross Platform Serial Monitor written using Electron and NodeJS

## Retrieving Source
The source is located on Github and can be retrieved by executing the following:
```bash
$ git clone https://github.com/stephendpmurphy/serial-monitor.git
```

## Initializing the project
After your first time of retrieving the source. You will need to install the needed node modules:
```bash
$ npm install
```

## Development
The application styling is done in SASS and requires compiling for changes to become effective and visible on the application.
To compile the SASS:
```bash
$ npm run compile:sass
```

The application can be launched using:
```bash
$ npm start
```

## Debugging
Two configurations are used in debugging the application within VScode. One for debugging the main process (main.js) and another for debugging the renderer process (index.js). In order to debug the renderer process, you will need to install the Chrome Debugging Extension for VScode.