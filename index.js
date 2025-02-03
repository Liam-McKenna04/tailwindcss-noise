const plugin = require('tailwindcss/plugin');
const fs = require('fs');
const path = require('path');


/**
 * Implements the Box-Muller transform to generate normally distributed random numbers.
 * This algorithm converts uniformly distributed random numbers into a normal (Gaussian) distribution.
 * 
 * @returns {number} A random number from a standard normal distribution (mean = 0, stddev = 1)
 * @see https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
 */
function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num;
}


/**
 * Generates a noise pattern canvas using Gaussian distribution.
 * Creates a grayscale noise pattern with specified mean and standard deviation.
 * 
 * @param {number} mean - The mean value for the Gaussian distribution (default: 128)
 * @param {number} stdDev - The standard deviation for the Gaussian distribution (default: 20)
 * @returns {string} Base64 encoded data URL of the generated noise pattern
 */
function generateNoisePattern(mean = 128, stdDev = 20, opacity = 20) {
    const { createCanvas } = require('canvas');
    const CANVAS_SIZE = 256; // Chosen as a good balance between performance and noise repitition
    const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const ctx = canvas.getContext('2d');
    
    // Set black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;
    
    // Generate noise pixels using Gaussian distribution
    for (let i = 0; i < data.length; i += 4) {
        const Z = randn_bm();
        const pixelValue = Math.min(255, Math.max(0, Math.floor((Z * stdDev) + mean)));
        
        // Set RGB channels to same value for grayscale
        data[i] = pixelValue;     // R
        data[i + 1] = pixelValue; // G
        data[i + 2] = pixelValue; // B
        data[i + 3] = 255 * (opacity / 100); // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}



/**
 * Manages the generation, caching, and cleanup of noise pattern images.
 * Implements a simple file-based caching system to avoid regenerating patterns
 * and provides cleanup functionality to remove unused patterns.
 */
class NoiseCache {
    constructor() {
        this.outputDir = path.join(process.cwd(), 'public', 'noise-patterns');
        this.usedPatterns = new Set();
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

  
    getFilename(mean, stdDev, opacity) {
        return `noise-${Math.round(mean)}-${Math.round(stdDev)}-${Math.round(opacity)}.png`;
    }

    getFilePath(filename) {
        return path.join(this.outputDir, filename);
    }

    exists(mean, stdDev, opacity) {
        const filename = this.getFilename(mean, stdDev, opacity);
        return fs.existsSync(this.getFilePath(filename));
    }

    generate(mean, stdDev, opacity) {
        const filename = this.getFilename(mean, stdDev, opacity);
        const filePath = this.getFilePath(filename);

        this.usedPatterns.add(filename);

        if (!this.exists(mean, stdDev, opacity)) {
            const pattern = generateNoisePattern(mean, stdDev, opacity);
            const base64Data = pattern.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
        }

        return filename;
    }

    /**
     * Removes all cached noise patterns that weren't used in the current build.
     * Should be called at the start of each build to maintain clean assets.
     */
    cleanup() {
        const files = fs.readdirSync(this.outputDir);
        
        files.forEach(file => {
            if (file.startsWith('noise-') && file.endsWith('.png')) {
                if (!this.usedPatterns.has(file)) {
                    fs.unlinkSync(path.join(this.outputDir, file));
                }
            }
        });
        
        this.usedPatterns.clear();
    }
}

const noiseClassBase = (filename) => {
    return {
        'background-image': `url('/noise-patterns/${filename}')`,
        'background-repeat': 'repeat',
    };
}
/**
 * Tailwind CSS plugin that adds noise pattern utilities.
 * Provides classes for adding configurable noise patterns to elements.
 * 
 * Usage:
 * - Basic noise: class="noise"
 * - Custom noise: class="noise-[mean,stddev,opacity]" (e.g., noise-[128,20,20])
 * - Preset noise: class="noise-subtle|medium|strong"
 */
module.exports = plugin(({ addBase, matchUtilities, theme }) => {
    const cache = new NoiseCache();
    cache.cleanup();
    
    const defaultMean = 128;
    const defaultStdDev = 50;
    const defaultOpacity = 5;
    cache.generate(defaultMean, defaultStdDev, defaultOpacity);
    const filename = cache.getFilename(defaultMean, defaultStdDev, defaultOpacity)

    addBase({
        '.noise': noiseClassBase(filename)
    });

    matchUtilities(
        {
            'noise': (value) => {
                try {
                    if (!value || !value.includes(',')) {
                        throw new Error('Invalid format. Usage: noise-[mean,dev,opacity] (e.g., noise-[128,20,20])');
                    }
                    

                    const [meanStr, stdDevStr, opacityStr] = value.split(',').map(v => v.trim());
                    const mean = parseInt(meanStr.trim());
                    const stdDev = parseInt(stdDevStr.trim());
                    const opacity = parseInt(opacityStr.trim());

                    if (isNaN(mean) || isNaN(stdDev) || isNaN(opacity)) {
                        throw new Error('Mean, Standard Deviation, and Opacity must be valid numbers');
                    }

                    if (opacity < 0 || opacity > 100) {
                        throw new Error('Opacity must be between 0 and 100');
                    }

                    cache.generate(mean, stdDev, opacity);
                    const filename = cache.getFilename(mean, stdDev, opacity)
                    return noiseClassBase(filename);
                    
                } catch (error) {
                    console.warn(`Noise pattern error: ${error.message}. Using default pattern.`);
                    
                    // Return default noise pattern instead of throwing, to ensure error is contained wihtin this utility
                    const filename = cache.getFilename(defaultMean, defaultStdDev, defaultOpacity)
                    return noiseClassBase(filename);
                    
                }
            }
        },
        {
            values: theme('noise', {
                subtle: "100,20,5",
                medium: "128,50,5",
                strong: "128,100,5",
            }),
        }
    );

    

});