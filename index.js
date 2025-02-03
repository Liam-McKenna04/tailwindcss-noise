const plugin = require('tailwindcss/plugin');
const fs = require('fs');
const path = require('path');

function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num;
}

function generateNoiseDataURL(mean = 128, stdDev = 20) {
    // Note: Using Node Canvas for SSR/build time generation
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
        data[i + 3] = 255;        // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Cache for storing generated patterns
const noisePatternCache = new Map();

// Function to generate or retrieve cached pattern
function getNoisePattern(mean, stdDev) {
    const key = `${mean}-${stdDev}`;
    if (!noisePatternCache.has(key)) {
        noisePatternCache.set(key, generateNoiseDataURL(mean, stdDev));
    }
    return noisePatternCache.get(key);
}

// Ensure output directory exists
const outputDir = path.join(process.cwd(), 'public', 'noise-patterns');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

module.exports = plugin(({ matchUtilities, theme }) => {
    // Generate preset patterns at build time
    const presetPatterns = theme('noise', {});
    Object.entries(presetPatterns).forEach(([key, { mean, stdDev }]) => {
        const pattern = getNoisePattern(mean, stdDev);
        const fileName = `noise-${key}.png`;
        // Convert data URL to buffer and save
        const base64Data = pattern.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(path.join(outputDir, fileName), buffer);
    });
    // Add noise utilities
    matchUtilities(
        {
            'noise': (value) => {
                if (typeof value === 'string' && presetPatterns[value]) {
                    // Use pre-generated pattern for preset values
                    return {
                        backgroundImage: `url('/noise-patterns/noise-${value}.png')`
                    };
                } else {
                    // Generate pattern for arbitrary values at build time
                    console.log(value);
                    const mean = parseInt(value?.mean ?? 128);
                    const stdDev = parseInt(value?.stdDev ?? 20);
                    const pattern = getNoisePattern(mean, stdDev);
                    const fileName = `noise-${mean}-${stdDev}.png`;
                    
                    // Save the pattern
                    const base64Data = pattern.replace(/^data:image\/\w+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    fs.writeFileSync(path.join(outputDir, fileName), buffer);
                    
                    return {
                        backgroundImage: `url('/noise-patterns/${fileName}')`
                    };
                }
            }
        },
        {
            values: theme('noise', {}),
            type: ['color', 'any']
        }
    );
});