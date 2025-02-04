const plugin = require('tailwindcss/plugin');

/**
 * Implements the Box-Muller transform to generate normally distributed random numbers.
 * @returns {number} A random number from a standard normal distribution (mean = 0, stddev = 1)
 */
function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generates a noise pattern using Gaussian distribution.
 * @param {number} mean - The mean value for the Gaussian distribution
 * @param {number} stdDev - The standard deviation for the Gaussian distribution
 * @param {number} opacity - The opacity percentage (0-100)
 * @returns {string} Base64 encoded data URL of the generated noise pattern
 */
function generateNoisePattern(mean = 128, stdDev = 20, opacity = 20) {
    const { createCanvas } = require('canvas');
    const CANVAS_SIZE = 256;
    const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const Z = randn_bm();
        const pixelValue = Math.min(255, Math.max(0, Math.floor((Z * stdDev) + mean)));
        
        data[i] = pixelValue;     // R
        data[i + 1] = pixelValue; // G
        data[i + 2] = pixelValue; // B
        data[i + 3] = 255 * (opacity / 100); // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

/**
 * Manages a cache of generated noise patterns
 */
class NoisePatternCache {
    constructor() {
        this.patterns = new Map();
    }

    getKey(mean, stdDev, opacity) {
        return `${Math.round(mean)}-${Math.round(stdDev)}-${Math.round(opacity)}`;
    }

    getPattern(mean, stdDev, opacity) {
        const key = this.getKey(mean, stdDev, opacity);
        
        if (!this.patterns.has(key)) {
            const pattern = generateNoisePattern(mean, stdDev, opacity);
            this.patterns.set(key, pattern);
        }
        
        return this.patterns.get(key);
    }
}

/**
 * Tailwind CSS plugin that adds noise pattern utilities.
 * 
 * Usage:
 * - Basic noise: class="noise"
 * - Custom noise: class="noise-[mean,stddev,opacity]" (e.g., noise-[128,20,20])
 * - Preset noise: class="noise-subtle|medium|strong"
 */
module.exports = plugin(({ addBase, matchUtilities, theme }) => {
    const patternCache = new NoisePatternCache();
    
    const defaultMean = 128;
    const defaultStdDev = 50;
    const defaultOpacity = 5;
    
    const defaultPattern = patternCache.getPattern(defaultMean, defaultStdDev, defaultOpacity);

    addBase({
        '.noise': {
            'background-image': `url('${defaultPattern}')`,
            'background-repeat': 'repeat',
        }
    });

    matchUtilities(
        {
            'noise': (value) => {
                try {
                    if (!value || !value.includes(',')) {
                        throw new Error('Invalid format. Usage: noise-[mean,dev,opacity]');
                    }

                    const [meanStr, stdDevStr, opacityStr] = value.split(',').map(v => v.trim());
                    const mean = parseInt(meanStr);
                    const stdDev = parseInt(stdDevStr);
                    const opacity = parseInt(opacityStr);

                    if (isNaN(mean) || isNaN(stdDev) || isNaN(opacity)) {
                        throw new Error('Mean, Standard Deviation, and Opacity must be valid numbers');
                    }

                    if (opacity < 0 || opacity > 100) {
                        throw new Error('Opacity must be between 0 and 100');
                    }

                    const pattern = patternCache.getPattern(mean, stdDev, opacity);
                    return {
                        'background-image': `url('${pattern}')`,
                        'background-repeat': 'repeat',
                    };
                } catch (error) {
                    console.warn(`Noise pattern error: ${error.message}. Using default pattern.`);
                    return {
                        'background-image': `url('${defaultPattern}')`,
                        'background-repeat': 'repeat',
                    };
                }
            }
        },
        {
            values: theme('noise', {
                subtle: "100,20,5",
                medium: "128,50,5",
                strong: "128,100,10",
            }),
        }
    );
});