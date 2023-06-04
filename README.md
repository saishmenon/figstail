# Figstail

Figstail is a comprehensive starter project for developing Figma plugins using Svelte and TailwindCSS. It provides a solid foundation and preconfigured setup to help you quickly start building powerful Figma plugins with a streamlined development experience.

## Features

-   Easy setup and installation
-   Bundling of JS, CSS, SVG, and image assets during the build process
-   Automatic compilation of TypeScript and app on save during development
-   Minification of code during the build phase
-   Preconfigured integration with Figma Plugin DS Svelte
-   Access to a wide range of components and icons that match the Figma UI
-   Small bundle size by including only what you import/use

## Getting Started
1. Clone the repository and open the project:
```
git clone https://github.com/saishmenon/figstail.git figma-plugin
cd figma-plugin
```

2. Install the dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```
This will launch the development server and provide you with a local URL where you can preview your plugin during development.

4. Build your plugin:
```
npm run build
```
This command will generate a production-ready build of your plugin, which can then be used to publish the plugin to the Figma Community.

## Connecting your plugin to Figma 

After installing, open your Figma desktop app and right click on the canvas and select `Plugins > Development > Import plugin from manifest...` and find the `manifest.json` inside the project directory `figma-plugin/public/manifest.json` and select it to link it.

You also can just type "New Plugin" in Figma global search `Cmd + /` or `Ctrl + /` to get there.

Now edit the below line in the manifest.json file to give your plugin a new name.
```
"name": "Figstail Plugin Template",
```

## Acknowledgements

- [Figsvelte](https://github.com/thomas-lowry/figsvelte) - A boilerplate for creating Figma plugins with Svelte built by [Tom Lowry](https://github.com/thomas-lowry).
