# Starscape OBS Manager Electron

## Introduction

This is the Electron side of Starscape OBS Manager, it provides base functions to manage obs plugins. For example, detect、install、update、uninstall a 3rd plugin.


This rep don't contain UI page, all webpage of Starscape OBS Manager is available in [starscape-obs-manager-webside](https://github.com/Starscapelive/starscape-obs-manager-webside) 

The serversid is available in [starscape-obs-manager-serverside](https://github.com/Starscapelive/starscape-obs-manager-serverside)


## Tech
- electron
- nodejs
- typescript
## Usage

1. clone this rep 

```
npm install
```

2. configration 

Your webpage address for example: process.env.ORIGIN_PATH = 'your-domain'\
Your serverside address for example: process.env.API_URL =  "your-api-url"

3. run

```
npm run dev
```

4. packing
```
npm run pack:win
```

## License
GPL-2.0 License