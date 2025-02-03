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

function generateNoisePattern(mean = 128, stdDev = 20) {
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
        
        data[i] = pixelValue;
        data[i + 1] = pixelValue;
        data[i + 2] = pixelValue;
        data[i + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Cache management
class NoiseCache {
    constructor() {
        this.outputDir = path.join(process.cwd(), 'public', 'noise-patterns');
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

        if (!this.exists(mean, stdDev)) {
            console.log("generating new image!!")
            const pattern = generateNoisePattern(mean, stdDev);
            const base64Data = pattern.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
        }

        return filename;
    }
}

module.exports = plugin(({ addBase, matchUtilities, theme }) => {
    const cache = new NoiseCache();
    
    // Generate default pattern
    const defaultMean = 128;
    const defaultStdDev = 20;
    cache.generate(defaultMean, defaultStdDev);
    
    // Base styles
    addBase({
        '.noise': {
            '--noise-mean': defaultMean,
            '--noise-dev': defaultStdDev,
            position: 'relative',
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
            }
        }
    });

    // Dynamic utility that handles both mean and dev
    matchUtilities(
        {
            'noise': (value) => {
                let both = value.split(',')
                let mean = both[0]
                let stdDev = both[1]
                if (stdDev === undefined && mean === undefined) {
                    mean = defaultMean;
                    stdDev = defaultStdDev;
                } else if (stdDev === undefined || mean === undefined) {
                    throw new Error('Both Mean and Standard Deviation must be provided \n format: noise-[mean-dev]' + value);
                }
                console.log('hello!!')
                const filename = cache.generate(mean, stdDev);
                
                return {
                    '--noise-mean': mean,
                    '--noise-dev': stdDev,
                    position: 'relative',
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
                    }
            };
            }
        },
        {
            values: theme('noise', {
                subtle: { mean: 180, dev: 10 },
                medium: { mean: 128, dev: 20 },
                strong: { mean: 100, dev: 30 }
            }),
        }
    );

    // Opacity utility
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