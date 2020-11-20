[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<br />

<p align="center">
  <h3 align="center">⚡ Serial Dev</h3>
  <p align="center">
    Open-Source Cross-Platform Serial Monitor written using Electron and NodeJS
  </p>
</p>

<br />

## Table of Contents
* [About the Project](#about-the-project)
  * [Built With](#built-with)
* [Getting Started](#getting-started)
  * [Retrieving the Source](#retrieving-the-source)
  * [Installation](#installation)
  * [Building](#building)
  * [Debugging](#debuggin)
  * [Packaging](#packaging)
* [Contributing](#contributing)
* [License](#license)
* [Contact](#contact)
* [Acknowledgements](#acknowledgements)

## About the Project

<p align="center">
  <img src="./src/assets/imgs/screenshot.png">
</p>

Serial Dev is an open source serial port monitor built on ElectronJS and aims to provide an intuitive and uniform experience for monitoring and sending serial data on all of the users platforms.
The project is open source with the hope that others can get use, improve, and learn from it. Contributions are absolutely welcome and if you are interested in doing so, please visit the [Contributing](#contributing) section.

### Built With

The application is built with two primary tools. Both are required to build and develop this project.
* [NodeJS](https://nodejs.org/en/)
* [Electron](https://www.electronjs.org/)

## Getting Started

To get a local copy of the source up and running follow these simple steps

### Retrieving the Source

```sh
$ git clone https://github.com/stephendpmurphy/serial-dev.git
```

### Installation

```sh
$ npm install
```

### Building

To build the application, you will first need to compile the styling sass source. This will then watch the SASS source and recompile as changes are made. This command
should be executed once in a terminal and left open. Occasionally, sytnax errors in the SASS source will cause this command to hang and you will need to cancel and restart the command.
```bash
$ npm run compile:sass
```

Once complete, you can run the application. The app has a "live-reload" feature and will watch the source directory for changes, and reload as needed. This command
should be executed once in a terminal and left open.
```bash
$ npm start
```

### Debugging

You can debug the application within VScode by first installing the [**Chrome Debugging Extension for VScode**](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome). With the extension installed, you can debug both the Main and Renderer processes by using the "Electron: All" target.

### Packaging

To create a distributable package using electron-forge:
```bash
$ npm run make
```


## Contributing

Any contributions you make are **greatly appreciated**. You can contribute to the project by following this workflow
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Stephen Murphy - [@smurphy_iii](https://www.instagram.com/smurphy_iii/) - stephendpmurphy@msn.com

Project Link: [Serial Dev](https://github.com/stephendpmurphy/serial-dev)

## Acknowledgements
* [Node SerialPort](https://serialport.io/)
* [Feather Icons](https://feathericons.com/)
* [Nord Theme](https://www.nordtheme.com/)

[contributors-shield]: https://img.shields.io/github/contributors/stephendpmurphy/serial-dev.svg?style=flat-square
[contributors-url]: https://github.com/stephendpmurphy/serial-dev/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/stephendpmurphy/serial-dev.svg?style=flat-square
[forks-url]: https://github.com/stephendpmurphy/serial-dev/network/members
[stars-shield]: https://img.shields.io/github/stars/stephendpmurphy/serial-dev.svg?style=flat-square
[stars-url]: https://github.com/stephendpmurphy/serial-dev/stargazers
[issues-shield]: https://img.shields.io/github/issues/stephendpmurphy/serial-dev.svg?style=flat-square
[issues-url]: https://github.com/stephendpmurphy/serial-dev/issues
[license-shield]: https://img.shields.io/github/license/stephendpmurphy/serial-dev.svg?style=flat-square
[license-url]: https://github.com/stephendpmurphy/serial-dev/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=flat-square&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/smurphy129/
