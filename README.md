# Tailwind CSS Noise Plugin

A Tailwind CSS plugin for adding noise effects to your designs using a Gaussian distribution.

## Installation

To install the plugin, you need to have Tailwind CSS and Node.js installed. Then, you can add the plugin to your project:

```bash
npm install tailwindcss-noise
```

## Usage

### Tailwind 4.x.x

```css 
@import "tailwindcss";
@plugin "tailwindcss-noise";
```


### Tailwind 3.x.x

Add the plugin to your `tailwind.config.js` file:

```js
const noisePlugin = require('tailwindcss-noise');

module.exports = {
    // ...
    plugins: [
        noisePlugin,
        // other plugins
    ],
};
```



### Basic Noise

To apply a basic noise effect, use the `noise` class:

```html
<div class="noise"></div>
```

### Custom Noise

You can customize the noise effect by specifying the mean, standard deviation, and opacity:


```html
<div class="noise-[128,20,20]"></div>
```

### Preset Noise

Use preset noise effects for subtle, medium, or strong noise:

```html
<div class="noise-subtle"></div>
<div class="noise-medium"></div>
<div class="noise-strong"></div>
```

## Testing Combinations

You can test different combinations of noise effects on [this website](https://liammckenna.dev).

## Examples of Sites Using Gaussian Textures

- [My Personal Website](https://www.liam-mckenna.dev/)
- [Relume](https://relume-library-cloneable.webflow.io/)
- [Happygolucky Framer Template](https://happygolucky.framer.website/)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

Liam McKenna
