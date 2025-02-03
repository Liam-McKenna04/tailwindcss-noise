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
function generateNoisePattern(mean = 128, stdDev = 20) {
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
        data[i + 3] = 255;        // Full Opacity
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

  
    getFilename(mean, stdDev) {
        return `noise-${Math.round(mean)}-${Math.round(stdDev)}.png`;
    }

    getFilePath(filename) {
        return path.join(this.outputDir, filename);
    }

    exists(mean, stdDev) {
        const filename = this.getFilename(mean, stdDev);
        return fs.existsSync(this.getFilePath(filename));
    }

    generate(mean, stdDev) {
        const filename = this.getFilename(mean, stdDev);
        const filePath = this.getFilePath(filename);

        this.usedPatterns.add(filename);

        if (!this.exists(mean, stdDev)) {
            const pattern = generateNoisePattern(mean, stdDev);
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


/**
 * Tailwind CSS plugin that adds noise pattern utilities.
 * Provides classes for adding configurable noise patterns to elements.
 * 
 * Usage:
 * - Basic noise: class="noise"
 * - Custom noise: class="noise-[mean,stddev]"
 * - Preset noise: class="noise-subtle|medium|strong"
 * - Opacity control: class="noise-opacity-[value]"
 */
module.exports = plugin(({ addBase, matchUtilities, theme }) => {
    const cache = new NoiseCache();
    cache.cleanup();
    
    const defaultMean = 128;
    const defaultStdDev = 20;
    cache.generate(defaultMean, defaultStdDev);
    
    addBase({
        '.noise': {
            '--noise-mean': defaultMean,
            '--noise-dev': defaultStdDev,
            position: 'relative',
            isolation: 'isolate',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundImage: `url('/noise-patterns/${cache.getFilename(defaultMean, defaultStdDev)}')`,
                backgroundRepeat: 'repeat',
                pointerEvents: 'none',
                zIndex: '0',
                opacity: 'var(--noise-opacity, 0.05)',
            },
            '> *': {
                zIndex: '10'
            }



        }
    });

    matchUtilities(
        {
            'noise': (value) => {
                try {
                    if (!value || !value.includes(',')) {
                        throw new Error('Invalid format. Usage: noise-[mean,dev] (e.g., noise-[128,20])');
                    }

                    const [meanStr, stdDevStr] = value.split(',').map(v => v.trim());
                    const mean = parseInt(meanStr);
                    const stdDev = parseInt(stdDevStr);

                    if (isNaN(mean) || isNaN(stdDev)) {
                        throw new Error('Mean and Standard Deviation must be valid numbers');
                    }

                    const filename = cache.generate(mean, stdDev);
                    
                    return {
                        '--noise-mean': mean,
                        '--noise-dev': stdDev,
                        position: 'relative',
                        isolation: 'isolate',

                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url('/noise-patterns/${filename}')`,
                            backgroundRepeat: 'repeat',
                            pointerEvents: 'none',
                            zIndex: '0',
                            opacity: 'var(--noise-opacity, 0.05)',
                        },
                       '> *': {
                            zIndex: '10'
                        }
                    };
                } catch (error) {
                    console.warn(`Noise pattern error: ${error.message}. Using default pattern.`);
                    const filename = cache.generate(defaultMean, defaultStdDev);
                    
                    // Return default noise pattern instead of throwing, to ensure error is contained wihtin this utility
                    return {
                        '--noise-mean': defaultMean,
                        '--noise-dev': defaultStdDev,
                        position: 'relative',
                        isolation: 'isolate',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url('/noise-patterns/${filename}')`,
                            backgroundRepeat: 'repeat',
                            pointerEvents: 'none',
                            zIndex: '-1',                            
                            opacity: 'var(--noise-opacity, 0.2)',
                        },
                    '> *': {
                            zIndex: '10'
                     }
                    };
                }
            }
        },
        {
            values: theme('noise', {
                subtle: "100,20",
                medium: "128,50",
                strong: "128,100",
            }),
        }
    );

    matchUtilities(
        {
            'noise-opacity': (value) => ({
                '--noise-opacity': value
            })
        },
        {
            values: theme('opacity', {})
        }
    );

});