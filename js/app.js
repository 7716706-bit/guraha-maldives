/**
 * GurahaMaldives - CO2 Laser Design Studio
 * Main Application JavaScript
 */

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initNavigation();
    initConverter();
    initBoxMaker();
    initLineArt();
    initClipArt();
    initTrophies();
});

// ===========================
// LOADER
// ===========================
function initLoader() {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 2000);
}

// ===========================
// NAVIGATION
// ===========================
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.section');
    const hamburger = document.querySelector('.hamburger');
    const navLinksContainer = document.querySelector('.nav-links');
    const featureCards = document.querySelectorAll('[data-goto]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.section;
            switchSection(target);
            navLinksContainer.classList.remove('active');
        });
    });

    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            switchSection(card.dataset.goto);
        });
    });

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }
}

function switchSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const section = document.getElementById(id);
    const link = document.querySelector(`[data-section="${id}"]`);
    if (section) section.classList.add('active');
    if (link) link.classList.add('active');
}

// ===========================
// NOTIFICATION SYSTEM
// ===========================
function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// ===========================
// IMAGE TO VECTOR CONVERTER
// ===========================
function initConverter() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const convertBtn = document.getElementById('convertBtn');
    const resetBtn = document.getElementById('resetConverter');
    const detailSlider = document.getElementById('detailLevel');
    const simplifySlider = document.getElementById('simplifyLevel');
    const strokeSlider = document.getElementById('strokeWidth');

    if (!uploadArea) return;

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleConverterImage(file);
        }
    });

    uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            imageInput.click();
        }
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleConverterImage(e.target.files[0]);
        }
    });

    if (detailSlider) {
        detailSlider.addEventListener('input', (e) => {
            document.getElementById('detailValue').textContent = e.target.value;
        });
    }

    if (simplifySlider) {
        simplifySlider.addEventListener('input', (e) => {
            document.getElementById('simplifyValue').textContent = e.target.value;
        });
    }

    if (strokeSlider) {
        strokeSlider.addEventListener('input', (e) => {
            document.getElementById('strokeValue').textContent = e.target.value;
        });
    }

    if (convertBtn) {
        convertBtn.addEventListener('click', convertToVector);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetConverter);
    }

    const downloadSVG = document.getElementById('downloadSVG');
    const downloadDXF = document.getElementById('downloadDXF');
    const copySVG = document.getElementById('copySVG');

    if (downloadSVG) downloadSVG.addEventListener('click', () => downloadFile('svg'));
    if (downloadDXF) downloadDXF.addEventListener('click', () => downloadFile('dxf'));
    if (copySVG) copySVG.addEventListener('click', copySVGCode);
}

let converterImageData = null;

function handleConverterImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('originalImage').src = e.target.result;
        document.getElementById('converterPreview').style.display = 'grid';
        document.getElementById('vectorResult').style.display = 'none';
        converterImageData = e.target.result;
        loadImageForProcessing(e.target.result);
    };
    reader.readAsDataURL(file);
}

let processingCanvas, processingCtx;

function loadImageForProcessing(src) {
    const img = new Image();
    img.onload = () => {
        processingCanvas = document.createElement('canvas');
        processingCanvas.width = img.width;
        processingCanvas.height = img.height;
        processingCtx = processingCanvas.getContext('2d');
        processingCtx.drawImage(img, 0, 0);
    };
    img.src = src;
}

function convertToVector() {
    if (!processingCanvas) {
        showNotification('Please upload an image first');
        return;
    }

    const mode = document.getElementById('conversionMode').value;
    const detail = parseInt(document.getElementById('detailLevel').value);
    const simplify = parseInt(document.getElementById('simplifyLevel').value);
    const strokeWidth = parseFloat(document.getElementById('strokeWidth').value);
    const colorMode = document.getElementById('colorMode').value;

    const width = processingCanvas.width;
    const height = processingCanvas.height;
    const imageData = processingCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let grayData = [];
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        grayData.push(avg);
    }

    const edges = sobelEdgeDetection(grayData, width, height, detail / 100);

    let paths = [];
    if (mode === 'outline' || mode === 'silhouette') {
        paths = traceContours(edges, width, height, simplify / 100);
    } else if (mode === 'fill') {
        paths = traceFilled(edges, width, height, simplify / 100);
    } else {
        paths = traceDetailed(edges, grayData, width, height, simplify / 100);
    }

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    if (colorMode === 'bw') {
        svgContent += `  <rect width="100%" height="100%" fill="white"/>\n`;
        paths.forEach(path => {
            svgContent += `  <path d="${path}" fill="none" stroke="black" stroke-width="${strokeWidth}"/>\n`;
        });
    } else if (colorMode === 'grayscale') {
        svgContent += `  <rect width="100%" height="100%" fill="white"/>\n`;
        paths.forEach((path, i) => {
            const shade = Math.floor(50 + (i % 5) * 40);
            svgContent += `  <path d="${path}" fill="none" stroke="rgb(${shade},${shade},${shade})" stroke-width="${strokeWidth}"/>\n`;
        });
    } else {
        svgContent += `  <rect width="100%" height="100%" fill="white"/>\n`;
        paths.forEach((path, i) => {
            const hue = (i * 30) % 360;
            svgContent += `  <path d="${path}" fill="none" stroke="hsl(${hue},70%,50%)" stroke-width="${strokeWidth}"/>\n`;
        });
    }

    svgContent += `</svg>`;

    document.getElementById('svgOutput').innerHTML = svgContent;
    document.getElementById('vectorResult').style.display = 'block';
    document.getElementById('vectorStats').innerHTML = `
        <span>${paths.length}</span> paths |
        <span>${width}x${height}</span>px |
        <span>${(svgContent.length / 1024).toFixed(1)}</span>KB
    `;

    showNotification('Vector conversion complete!');
}

function sobelEdgeDetection(grayData, width, height, threshold) {
    const edges = new Float32Array(width * height);
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sumX = 0, sumY = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const ki = (ky + 1) * 3 + (kx + 1);
                    sumX += grayData[idx] * gx[ki];
                    sumY += grayData[idx] * gy[ki];
                }
            }
            const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
            edges[y * width + x] = magnitude > (255 * threshold) ? 255 : 0;
        }
    }
    return edges;
}

function traceContours(edges, width, height, simplify) {
    const paths = [];
    const visited = new Uint8Array(width * height);
    const minPathLength = Math.max(5, Math.floor(10 * (1 - simplify)));

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (edges[idx] > 0 && !visited[idx]) {
                const path = tracePath(edges, visited, x, y, width, height);
                if (path.length >= minPathLength) {
                    paths.push(smoothPath(path, simplify));
                }
            }
        }
    }
    return paths;
}

function tracePath(edges, visited, startX, startY, width, height) {
    const path = [];
    let x = startX, y = startY;

    while (true) {
        const idx = y * width + x;
        if (visited[idx]) break;
        visited[idx] = 1;
        path.push({ x, y });

        let found = false;
        for (let dy = -1; dy <= 1 && !found; dy++) {
            for (let dx = -1; dx <= 1 && !found; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (edges[nIdx] > 0 && !visited[nIdx]) {
                        x = nx;
                        y = ny;
                        found = true;
                    }
                }
            }
        }
        if (!found) break;
    }
    return path;
}

function smoothPath(path, simplify) {
    if (path.length < 3) {
        return `M${path[0].x},${path[0].y}` + path.slice(1).map(p => `L${p.x},${p.y}`).join('');
    }

    const step = Math.max(1, Math.floor(path.length * simplify * 0.5));
    let d = `M${path[0].x},${path[0].y}`;

    for (let i = step; i < path.length - step; i += step) {
        const p0 = path[Math.max(0, i - step)];
        const p1 = path[i];
        const p2 = path[Math.min(path.length - 1, i + step)];
        d += `Q${p1.x},${p1.y} ${p2.x},${p2.y}`;
    }

    const last = path[path.length - 1];
    d += `L${last.x},${last.y}`;
    return d;
}

function traceFilled(edges, width, height, simplify) {
    const paths = [];
    const visited = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (edges[idx] > 0 && !visited[idx]) {
                const region = floodFill(edges, visited, x, y, width, height);
                if (region.length > 10) {
                    const hull = convexHull(region);
                    paths.push(smoothPath(hull, simplify));
                }
            }
        }
    }
    return paths;
}

function floodFill(edges, visited, startX, startY, width, height) {
    const region = [];
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
        const { x, y } = stack.pop();
        const idx = y * width + x;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (visited[idx] || edges[idx] === 0) continue;

        visited[idx] = 1;
        region.push({ x, y });

        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x, y: y + 1 });
        stack.push({ x, y: y - 1 });
    }
    return region;
}

function convexHull(points) {
    if (points.length < 3) return points;
    points.sort((a, b) => a.x - b.x || a.y - b.y);

    const cross = (O, A, B) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
    const lower = [];
    for (const p of points) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper = [];
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function traceDetailed(edges, grayData, width, height, simplify) {
    const paths = traceContours(edges, width, height, simplify);

    const step = Math.max(5, Math.floor(20 * (1 - simplify)));
    for (let y = step; y < height; y += step) {
        let linePath = [];
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (grayData[idx] < 128) {
                linePath.push({ x, y });
            } else if (linePath.length > 3) {
                paths.push(smoothPath(linePath, simplify));
                linePath = [];
            }
        }
        if (linePath.length > 3) {
            paths.push(smoothPath(linePath, simplify));
        }
    }
    return paths;
}

function resetConverter() {
    document.getElementById('converterPreview').style.display = 'none';
    document.getElementById('vectorResult').style.display = 'none';
    document.getElementById('imageInput').value = '';
    converterImageData = null;
    processingCanvas = null;
}

let currentSVGContent = '';

function downloadFile(format) {
    const svgOutput = document.getElementById('svgOutput');
    const svg = svgOutput.querySelector('svg');
    if (!svg) {
        showNotification('No vector to download');
        return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    currentSVGContent = svgData;

    if (format === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'laser-vector.svg';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('SVG downloaded!');
    } else if (format === 'dxf') {
        const dxf = svgToDXF(svg);
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'laser-vector.dxf';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('DXF downloaded!');
    }
}

function svgToDXF(svg) {
    let dxf = '0\nSECTION\n2\nENTITIES\n';
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
        const d = path.getAttribute('d');
        const points = parseSVGPath(d);
        if (points.length > 1) {
            for (let i = 0; i < points.length - 1; i++) {
                dxf += `0\nLINE\n8\n0\n10\n${points[i].x}\n20\n${points[i].y}\n30\n0\n11\n${points[i + 1].x}\n21\n${points[i + 1].y}\n31\n0\n`;
            }
        }
    });
    dxf += '0\nENDSEC\n0\nEOF\n';
    return dxf;
}

function parseSVGPath(d) {
    const points = [];
    const regex = /[MLQCZ]([-\d.,\s]*)/gi;
    let match;
    let currentX = 0, currentY = 0;

    while ((match = regex.exec(d)) !== null) {
        const cmd = match[0][0].toUpperCase();
        const nums = match[1].trim().split(/[\s,]+/).map(Number);

        if (cmd === 'M') {
            currentX = nums[0];
            currentY = nums[1];
            points.push({ x: currentX, y: currentY });
        } else if (cmd === 'L') {
            currentX = nums[0];
            currentY = nums[1];
            points.push({ x: currentX, y: currentY });
        } else if (cmd === 'Q') {
            const cp1x = nums[0], cp1y = nums[1];
            currentX = nums[2];
            currentY = nums[3];
            points.push({ x: currentX, y: currentY });
        }
    }
    return points;
}

function copySVGCode() {
    const svgOutput = document.getElementById('svgOutput');
    const svg = svgOutput.querySelector('svg');
    if (svg) {
        navigator.clipboard.writeText(new XMLSerializer().serializeToString(svg));
        showNotification('SVG code copied!');
    }
}

// ===========================
// BOX MAKER
// ===========================
function initBoxMaker() {
    const generateBtn = document.getElementById('generateBox');
    const addEngraving = document.getElementById('addEngraving');
    const boxType = document.getElementById('boxType');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const downloadBoxSVG = document.getElementById('downloadBoxSVG');
    const downloadBoxDXF = document.getElementById('downloadBoxDXF');

    if (!generateBtn) return;

    generateBtn.addEventListener('click', generateBox);

    if (addEngraving) {
        addEngraving.addEventListener('change', (e) => {
            document.getElementById('engravingSettings').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.querySelector('.preview-2d').style.display = tab === '2d' ? 'flex' : 'none';
            document.querySelector('.preview-3d').style.display = tab === '3d' ? 'flex' : 'none';
            if (tab === '3d') render3DPreview();
        });
    });

    if (downloadBoxSVG) downloadBoxSVG.addEventListener('click', () => downloadBoxFile('svg'));
    if (downloadBoxDXF) downloadBoxDXF.addEventListener('click', () => downloadBoxFile('dxf'));
}

let boxData = {};

function generateBox() {
    const width = parseFloat(document.getElementById('boxWidth').value);
    const height = parseFloat(document.getElementById('boxHeight').value);
    const depth = parseFloat(document.getElementById('boxDepth').value);
    const thickness = parseFloat(document.getElementById('materialThickness').value);
    const jointSize = parseFloat(document.getElementById('jointSize').value);
    const kerf = parseFloat(document.getElementById('kerf').value);
    const type = document.getElementById('boxType').value;
    const engraving = document.getElementById('addEngraving').checked;
    const engravingText = document.getElementById('engravingText').value;

    boxData = { width, height, depth, thickness, jointSize, kerf, type, engraving, engravingText };

    const svg = generateBoxSVG(boxData);
    document.getElementById('boxSVG').innerHTML = svg;
    showNotification('Box layout generated!');
}

function generateBoxSVG(data) {
    const { width, height, depth, thickness, jointSize, kerf, type, engraving, engravingText } = data;
    const kerfComp = kerf;

    let svg = '';
    const panels = [];

    if (type === 'open-top') {
        panels.push({ name: 'Front', w: width, h: height, x: 0, y: 0 });
        panels.push({ name: 'Back', w: width, h: height, x: width + 20, y: 0 });
        panels.push({ name: 'Left', w: depth, h: height, x: (width + 20) * 2, y: 0 });
        panels.push({ name: 'Right', w: depth, h: height, x: (width + 20) * 3, y: 0 });
        panels.push({ name: 'Bottom', w: width, h: depth, x: 0, y: height + 20 });
    } else if (type === 'closed') {
        panels.push({ name: 'Front', w: width, h: height, x: 0, y: 0 });
        panels.push({ name: 'Back', w: width, h: height, x: width + 20, y: 0 });
        panels.push({ name: 'Left', w: depth, h: height, x: (width + 20) * 2, y: 0 });
        panels.push({ name: 'Right', w: depth, h: height, x: (width + 20) * 3, y: 0 });
        panels.push({ name: 'Bottom', w: width, h: depth, x: 0, y: height + 20 });
        panels.push({ name: 'Top', w: width, h: depth, x: width + 20, y: height + 20 });
    } else if (type === 'drawer') {
        panels.push({ name: 'Front', w: width, h: height, x: 0, y: 0 });
        panels.push({ name: 'Back', w: width - thickness * 2, h: height, x: width + 20, y: 0 });
        panels.push({ name: 'Left', w: depth - thickness, h: height, x: (width + 20) * 2, y: 0 });
        panels.push({ name: 'Right', w: depth - thickness, h: height, x: (width + 20) * 3, y: 0 });
        panels.push({ name: 'Bottom', w: width - thickness * 2, h: depth - thickness, x: 0, y: height + 20 });
    } else if (type === 'hexagonal') {
        const side = width / 2;
        for (let i = 0; i < 6; i++) {
            panels.push({ name: `Side ${i + 1}`, w: side, h: height, x: (side + 20) * i, y: 0, hex: true });
        }
        panels.push({ name: 'Bottom', w: width, h: width, x: 0, y: height + 20, hexBottom: true });
    }

    panels.forEach(panel => {
        svg += generatePanelSVG(panel, thickness, jointSize, kerfComp, engraving, engravingText);
    });

    const totalW = Math.max(...panels.map(p => p.x + p.w)) + 40;
    const totalH = Math.max(...panels.map(p => p.y + p.h)) + 40;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
        <rect width="100%" height="100%" fill="white"/>
        ${svg}
    </svg>`;
}

function generatePanelSVG(panel, thickness, jointSize, kerf, engraving, engravingText) {
    const { name, w, h, x, y, hex, hexBottom } = panel;
    let svg = `<g transform="translate(${x + 20}, ${y + 20})">`;

    if (hex) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            points.push(`${(w / 2) * Math.cos(angle) + w / 2},${(w / 2) * Math.sin(angle) + w / 2}`);
        }
        svg += `<polygon points="${points.join(' ')}" fill="none" stroke="black" stroke-width="0.5"/>`;
    } else if (hexBottom) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            points.push(`${(w / 2) * Math.cos(angle) + w / 2},${(w / 2) * Math.sin(angle) + w / 2}`);
        }
        svg += `<polygon points="${points.join(' ')}" fill="none" stroke="black" stroke-width="0.5"/>`;
    } else {
        let path = `M0,0 `;

        const jointsH = Math.floor(w / jointSize);
        const jointsV = Math.floor(h / jointSize);

        for (let i = 0; i < jointsH; i++) {
            const xPos = i * jointSize;
            path += `L${xPos + jointSize * 0.25},0 L${xPos + jointSize * 0.25},${thickness + kerf} `;
            path += `L${xPos + jointSize * 0.75},${thickness + kerf} L${xPos + jointSize * 0.75},0 `;
            path += `L${xPos + jointSize},0 `;
        }

        path += `L${w},0 `;

        for (let i = 0; i < jointsV; i++) {
            const yPos = i * jointSize;
            path += `L${w},${yPos + jointSize * 0.25} L${w - thickness - kerf},${yPos + jointSize * 0.25} `;
            path += `L${w - thickness - kerf},${yPos + jointSize * 0.75} L${w},${yPos + jointSize * 0.75} `;
            path += `L${w},${yPos + jointSize} `;
        }

        path += `L${w},${h} `;

        for (let i = jointsH - 1; i >= 0; i--) {
            const xPos = i * jointSize;
            path += `L${xPos + jointSize * 0.75},${h} L${xPos + jointSize * 0.75},${h - thickness - kerf} `;
            path += `L${xPos + jointSize * 0.25},${h - thickness - kerf} L${xPos + jointSize * 0.25},${h} `;
            path += `L${xPos},${h} `;
        }

        path += `L0,${h} `;

        for (let i = jointsV - 1; i >= 0; i--) {
            const yPos = i * jointSize;
            path += `L0,${yPos + jointSize * 0.75} L${thickness + kerf},${yPos + jointSize * 0.75} `;
            path += `L${thickness + kerf},${yPos + jointSize * 0.25} L0,${yPos + jointSize * 0.25} `;
            path += `L0,${yPos} `;
        }

        path += 'Z';

        svg += `<path d="${path}" fill="none" stroke="black" stroke-width="0.5"/>`;

        svg += `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#999">${name}</text>`;

        if (engraving && engravingText && (name === 'Front' || name === 'Top')) {
            svg += `<text x="${w / 2}" y="${h / 2 + 20}" text-anchor="middle" font-size="6" fill="#666">${engravingText}</text>`;
        }
    }

    svg += '</g>';
    return svg;
}

function render3DPreview() {
    const canvas = document.getElementById('boxCanvas3D');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    const { width, height, depth } = boxData;
    const scale = Math.min(300 / width, 300 / height, 300 / depth);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a25';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const w = width * scale;
    const h = height * scale;
    const d = depth * scale;

    const dx = w * 0.5;
    const dy = -h * 0.3;
    const dz = d * 0.3;

    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 1;

    const front = [
        [cx - w / 2, cy + h / 2],
        [cx + w / 2, cy + h / 2],
        [cx + w / 2, cy - h / 2],
        [cx - w / 2, cy - h / 2]
    ];

    const back = front.map(([x, y]) => [x + dx * 0.3, y + dy * 0.3]);

    drawFace(ctx, front);
    drawFace(ctx, back);

    ctx.beginPath();
    ctx.moveTo(front[0][0], front[0][1]);
    ctx.lineTo(back[0][0], back[0][1]);
    ctx.moveTo(front[1][0], front[1][1]);
    ctx.lineTo(back[1][0], back[1][1]);
    ctx.moveTo(front[2][0], front[2][1]);
    ctx.lineTo(back[2][0], back[2][1]);
    ctx.moveTo(front[3][0], front[3][1]);
    ctx.lineTo(back[3][0], back[3][1]);
    ctx.stroke();

    ctx.fillStyle = '#ff3333';
    ctx.font = '14px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText(`3D Preview: ${boxData.width}x${boxData.height}x${boxData.depth}mm`, cx, canvas.height - 20);
}

function drawFace(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
}

function downloadBoxFile(format) {
    const svg = document.getElementById('boxSVG').querySelector('svg');
    if (!svg) {
        showNotification('Generate a box first');
        return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);

    if (format === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'laser-box.svg';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Box SVG downloaded!');
    } else {
        const dxf = svgToDXF(svg);
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'laser-box.dxf';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Box DXF downloaded!');
    }
}

// ===========================
// LINE ART GENERATOR
// ===========================
function initLineArt() {
    const uploadArea = document.getElementById('lineartUploadArea');
    const lineartInput = document.getElementById('lineartInput');
    const generateBtn = document.getElementById('generateLineArt');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const densitySlider = document.getElementById('lineDensity');
    const contrastSlider = document.getElementById('lineContrast');
    const brightnessSlider = document.getElementById('lineBrightness');
    const thicknessSlider = document.getElementById('lineThickness');

    if (!uploadArea) return;

    uploadArea.addEventListener('click', () => lineartInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleLineArtImage(e.dataTransfer.files[0]);
    });

    lineartInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleLineArtImage(e.target.files[0]);
    });

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    if (densitySlider) densitySlider.addEventListener('input', (e) => document.getElementById('densityValue').textContent = e.target.value);
    if (contrastSlider) contrastSlider.addEventListener('input', (e) => document.getElementById('contrastValue').textContent = e.target.value);
    if (brightnessSlider) brightnessSlider.addEventListener('input', (e) => document.getElementById('brightnessValue').textContent = e.target.value);
    if (thicknessSlider) thicknessSlider.addEventListener('input', (e) => document.getElementById('thicknessValue').textContent = e.target.value);

    if (generateBtn) generateBtn.addEventListener('click', generateLineArt);

    const downloadLineArt = document.getElementById('downloadLineArt');
    const downloadLineArtPNG = document.getElementById('downloadLineArtPNG');

    if (downloadLineArt) downloadLineArt.addEventListener('click', () => downloadLineArtFile('svg'));
    if (downloadLineArtPNG) downloadLineArtPNG.addEventListener('click', () => downloadLineArtFile('png'));
}

let lineartSourceImage = null;

function handleLineArtImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('lineartSource').src = e.target.result;
        document.getElementById('lineartEditor').style.display = 'block';
        document.getElementById('lineartResult').style.display = 'none';
        lineartSourceImage = e.target.result;
    };
    reader.readAsDataURL(file);
}

function generateLineArt() {
    if (!lineartSourceImage) {
        showNotification('Please upload an image first');
        return;
    }

    const effect = document.querySelector('.tool-btn.active').dataset.effect;
    const density = parseInt(document.getElementById('lineDensity').value);
    const contrast = parseInt(document.getElementById('lineContrast').value);
    const brightness = parseInt(document.getElementById('lineBrightness').value);
    const invert = document.getElementById('invertColors').checked;
    const thickness = parseInt(document.getElementById('lineThickness').value);

    const canvas = document.getElementById('lineartCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            gray = ((gray - 128) * (contrast / 50)) + 128 + brightness;
            gray = Math.max(0, Math.min(255, gray));
            if (invert) gray = 255 - gray;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        const outputCtx = outputCanvas.getContext('2d');

        outputCtx.fillStyle = 'white';
        outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        switch (effect) {
            case 'pencil':
                drawPencilEffect(outputCtx, imageData, density, thickness);
                break;
            case 'hatch':
                drawHatchEffect(outputCtx, imageData, density, thickness);
                break;
            case 'stipple':
                drawStippleEffect(outputCtx, imageData, density);
                break;
            case 'woodburn':
                drawWoodburnEffect(outputCtx, imageData, density, thickness);
                break;
            case 'contour':
                drawContourEffect(outputCtx, imageData, canvas.width, canvas.height, density, thickness);
                break;
        }

        const resultDiv = document.getElementById('lineartOutput');
        resultDiv.innerHTML = '';
        resultDiv.appendChild(outputCanvas);

        document.getElementById('lineartResult').style.display = 'block';

        window.lineartOutputCanvas = outputCanvas;
        showNotification('Line art generated!');
    };

    img.src = lineartSourceImage;
}

function drawPencilEffect(ctx, imageData, density, thickness) {
    const { width, height, data } = imageData;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = thickness;

    for (let y = 0; y < height; y += Math.max(2, Math.floor(10 - density / 12))) {
        ctx.beginPath();
        let started = false;
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx] < 180) {
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
    }
}

function drawHatchEffect(ctx, imageData, density, thickness) {
    const { width, height, data } = imageData;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = thickness;

    const spacing = Math.max(3, Math.floor(15 - density / 8));

    for (let y = -height; y < height * 2; y += spacing) {
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
            const sampleY = Math.floor(y + x * 0.5);
            if (sampleY >= 0 && sampleY < height) {
                const idx = (sampleY * width + x) * 4;
                if (data[idx] < 150) {
                    ctx.moveTo(x, sampleY);
                    ctx.lineTo(x + 1, sampleY);
                }
            }
        }
        ctx.stroke();
    }

    for (let y = -height; y < height * 2; y += spacing) {
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
            const sampleY = Math.floor(y - x * 0.5 + height);
            if (sampleY >= 0 && sampleY < height) {
                const idx = (sampleY * width + x) * 4;
                if (data[idx] < 150) {
                    ctx.moveTo(x, sampleY);
                    ctx.lineTo(x + 1, sampleY);
                }
            }
        }
        ctx.stroke();
    }
}

function drawStippleEffect(ctx, imageData, density) {
    const { width, height, data } = imageData;
    ctx.fillStyle = 'black';

    const spacing = Math.max(2, Math.floor(12 - density / 10));

    for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
            const idx = (y * width + x) * 4;
            const brightness = data[idx];
            const dotSize = ((255 - brightness) / 255) * (spacing / 2);

            if (dotSize > 0.5) {
                ctx.beginPath();
                ctx.arc(x, y, dotSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawWoodburnEffect(ctx, imageData, density, thickness) {
    const { width, height, data } = imageData;

    for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
            const idx = (y * width + x) * 4;
            const val = data[idx];

            if (val < 200) {
                const darkness = Math.floor(((200 - val) / 200) * 40);
                ctx.fillStyle = `rgba(80, 40, 0, ${1 - val / 200})`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = thickness;

    for (let y = 0; y < height; y += Math.max(2, Math.floor(8 - density / 15))) {
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx] < 160) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + 1, y);
            }
        }
        ctx.stroke();
    }
}

function drawContourEffect(ctx, imageData, width, height, density, thickness) {
    const { data } = imageData;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = thickness;

    const levels = Math.floor(3 + (density / 20));
    const thresholdStep = 255 / levels;

    for (let level = 0; level < levels; level++) {
        const threshold = thresholdStep * (level + 1);

        ctx.beginPath();
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const val = data[idx];
                const right = data[idx + 4];
                const bottom = data[idx + width * 4];

                if ((val < threshold && right >= threshold) || (val >= threshold && right < threshold)) {
                    ctx.moveTo(x + 0.5, y);
                    ctx.lineTo(x + 0.5, y + 1);
                }
                if ((val < threshold && bottom >= threshold) || (val >= threshold && bottom < threshold)) {
                    ctx.moveTo(x, y + 0.5);
                    ctx.lineTo(x + 1, y + 0.5);
                }
            }
        }
        ctx.stroke();
    }
}

function downloadLineArtFile(format) {
    const canvas = window.lineartOutputCanvas;
    if (!canvas) {
        showNotification('Generate line art first');
        return;
    }

    if (format === 'png') {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'line-art.png';
        a.click();
        showNotification('PNG downloaded!');
    } else {
        const svgData = rasterToSVG(canvas);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'line-art.svg';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('SVG downloaded!');
    }
}

function rasterToSVG(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imageData;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
    svg += '<rect width="100%" height="100%" fill="white"/>';

    for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
            const idx = (y * width + x) * 4;
            if (data[idx] < 200) {
                svg += `<rect x="${x}" y="${y}" width="2" height="2" fill="rgb(${data[idx]},${data[idx + 1]},${data[idx + 2]})"/>`;
            }
        }
    }

    svg += '</svg>';
    return svg;
}

// ===========================
// CLIP ART LIBRARY
// ===========================
const clipArtLibrary = [
    { id: 1, name: 'Simple Cat', category: 'animals', complexity: 'simple', style: 'outline', svg: generateCatSVG() },
    { id: 2, name: 'Mountain Scene', category: 'nature', complexity: 'medium', style: 'outline', svg: generateMountainSVG() },
    { id: 3, name: 'Geometric Circle', category: 'geometric', complexity: 'simple', style: 'filled', svg: generateGeometricCircle() },
    { id: 4, name: 'Christmas Tree', category: 'holidays', complexity: 'simple', style: 'outline', svg: generateTreeSVG() },
    { id: 5, name: 'Star Badge', category: 'logos', complexity: 'simple', style: 'filled', svg: generateStarSVG() },
    { id: 6, name: 'Floral Pattern', category: 'patterns', complexity: 'complex', style: 'outline', svg: generateFloralSVG() },
    { id: 7, name: 'Ornate Frame', category: 'frames', complexity: 'complex', style: 'outline', svg: generateFrameSVG() },
    { id: 8, name: 'Eagle', category: 'animals', complexity: 'complex', style: 'detailed', svg: generateEagleSVG() },
    { id: 9, name: 'Rose', category: 'nature', complexity: 'medium', style: 'outline', svg: generateRoseSVG() },
    { id: 10, name: 'Hexagon Pattern', category: 'geometric', complexity: 'medium', style: 'filled', svg: generateHexSVG() },
    { id: 11, name: 'Snowflake', category: 'holidays', complexity: 'medium', style: 'outline', svg: generateSnowflakeSVG() },
    { id: 12, name: 'Heart Design', category: 'logos', complexity: 'simple', style: 'filled', svg: generateHeartSVG() },
    { id: 13, name: 'Celtic Knot', category: 'patterns', complexity: 'complex', style: 'outline', svg: generateCelticSVG() },
    { id: 14, name: 'Photo Frame', category: 'frames', complexity: 'medium', style: 'outline', svg: generatePhotoFrameSVG() },
    { id: 15, name: 'Wolf', category: 'animals', complexity: 'complex', style: 'detailed', svg: generateWolfSVG() },
    { id: 16, name: 'Tree of Life', category: 'nature', complexity: 'complex', style: 'outline', svg: generateTreeOfLifeSVG() },
    { id: 17, name: 'Spiral', category: 'geometric', complexity: 'simple', style: 'outline', svg: generateSpiralSVG() },
    { id: 18, name: 'Gift Box', category: 'holidays', complexity: 'simple', style: 'outline', svg: generateGiftSVG() },
    { id: 19, name: 'Infinity Symbol', category: 'logos', complexity: 'simple', style: 'filled', svg: generateInfinitySVG() },
    { id: 20, name: 'Mandala', category: 'patterns', complexity: 'complex', style: 'detailed', svg: generateMandalaSVG() },
];

function initClipArt() {
    const searchInput = document.getElementById('clipartSearch');
    const categoryList = document.querySelectorAll('.category-list li');
    const gallery = document.getElementById('clipartGallery');
    const modal = document.getElementById('clipartModal');
    const closeModal = document.getElementById('closeModal');
    const complexityFilter = document.getElementById('complexityFilter');
    const styleFilter = document.getElementById('styleFilter');

    if (!gallery) return;

    renderClipArtGallery(clipArtLibrary);

    if (searchInput) {
        searchInput.addEventListener('input', filterClipArt);
    }

    categoryList.forEach(cat => {
        cat.addEventListener('click', () => {
            categoryList.forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            filterClipArt();
        });
    });

    if (complexityFilter) complexityFilter.addEventListener('change', filterClipArt);
    if (styleFilter) styleFilter.addEventListener('change', filterClipArt);

    if (closeModal) closeModal.addEventListener('click', () => modal.style.display = 'none');

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    const downloadClipart = document.getElementById('downloadClipart');
    if (downloadClipart) {
        downloadClipart.addEventListener('click', () => {
            const svg = document.querySelector('#modalPreview svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'clipart.svg';
                a.click();
                URL.revokeObjectURL(url);
                showNotification('Clip art downloaded!');
            }
        });
    }
}

function filterClipArt() {
    const searchTerm = document.getElementById('clipartSearch').value.toLowerCase();
    const activeCategory = document.querySelector('.category-list li.active').dataset.category;
    const complexity = document.getElementById('complexityFilter').value;
    const style = document.getElementById('styleFilter').value;

    let filtered = clipArtLibrary.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchTerm);
        const matchCategory = activeCategory === 'all' || item.category === activeCategory;
        const matchComplexity = complexity === 'all' || item.complexity === complexity;
        const matchStyle = style === 'all' || item.style === style;
        return matchSearch && matchCategory && matchComplexity && matchStyle;
    });

    renderClipArtGallery(filtered);
}

function renderClipArtGallery(items) {
    const gallery = document.getElementById('clipartGallery');
    gallery.innerHTML = items.map(item => `
        <div class="clipart-item" data-id="${item.id}">
            <div class="clipart-preview">${item.svg}</div>
            <div class="clipart-info">
                <h4>${item.name}</h4>
                <p>${item.category} • ${item.complexity}</p>
            </div>
        </div>
    `).join('');

    gallery.querySelectorAll('.clipart-item').forEach(item => {
        item.addEventListener('click', () => openClipartModal(parseInt(item.dataset.id)));
    });
}

function openClipartModal(id) {
    const item = clipArtLibrary.find(c => c.id === id);
    if (!item) return;

    document.getElementById('modalPreview').innerHTML = item.svg;
    document.getElementById('modalTitle').textContent = item.name;
    document.getElementById('modalCategory').textContent = `${item.category} • ${item.complexity} • ${item.style}`;
    document.getElementById('clipartModal').style.display = 'flex';
}

// SVG Generators
function generateCatSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M30,70 Q30,50 40,40 L35,20 L45,35 L50,25 L55,35 L65,20 L60,40 Q70,50 70,70 Q70,85 50,85 Q30,85 30,70Z" fill="none" stroke="black" stroke-width="1.5"/>
        <circle cx="42" cy="55" r="3" fill="black"/>
        <circle cx="58" cy="55" r="3" fill="black"/>
        <path d="M47,62 Q50,65 53,62" fill="none" stroke="black" stroke-width="1"/>
        <path d="M35,60 Q25,55 20,58" fill="none" stroke="black" stroke-width="1"/>
        <path d="M35,62 Q25,62 18,65" fill="none" stroke="black" stroke-width="1"/>
        <path d="M65,60 Q75,55 80,58" fill="none" stroke="black" stroke-width="1"/>
        <path d="M65,62 Q75,62 82,65" fill="none" stroke="black" stroke-width="1"/>
    </svg>`;
}

function generateMountainSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M0,90 L25,30 L40,55 L55,20 L75,60 L100,90 Z" fill="none" stroke="black" stroke-width="1.5"/>
        <path d="M55,20 L50,35 L60,35 Z" fill="none" stroke="black" stroke-width="1"/>
        <circle cx="80" cy="25" r="8" fill="none" stroke="black" stroke-width="1.5"/>
        <path d="M10,90 Q30,85 50,90 Q70,95 90,90" fill="none" stroke="black" stroke-width="1"/>
    </svg>`;
}

function generateGeometricCircle() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="black" stroke-width="1.5"/>
        <circle cx="50" cy="50" r="35" fill="none" stroke="black" stroke-width="1"/>
        <circle cx="50" cy="50" r="25" fill="none" stroke="black" stroke-width="1"/>
        <circle cx="50" cy="50" r="15" fill="none" stroke="black" stroke-width="1"/>
        <line x1="50" y1="5" x2="50" y2="95" stroke="black" stroke-width="0.5"/>
        <line x1="5" y1="50" x2="95" y2="50" stroke="black" stroke-width="0.5"/>
        <line x1="18" y1="18" x2="82" y2="82" stroke="black" stroke-width="0.5"/>
        <line x1="82" y1="18" x2="18" y2="82" stroke="black" stroke-width="0.5"/>
    </svg>`;
}

function generateTreeSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M50,10 L30,45 L38,45 L25,70 L35,70 L20,90 L80,90 L65,70 L75,70 L62,45 L70,45 Z" fill="none" stroke="black" stroke-width="1.5"/>
        <rect x="45" y="90" width="10" height="8" fill="none" stroke="black" stroke-width="1.5"/>
    </svg>`;
}

function generateStarSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="none" stroke="black" stroke-width="1.5"/>
        <circle cx="50" cy="50" r="15" fill="none" stroke="black" stroke-width="1"/>
    </svg>`;
}

function generateFloralSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r="8" fill="none" stroke="black" stroke-width="1.5"/>
        ${[0, 60, 120, 180, 240, 300].map(angle => {
            const x = 50 + 20 * Math.cos(angle * Math.PI / 180);
            const y = 50 + 20 * Math.sin(angle * Math.PI / 180);
            return `<ellipse cx="${x}" cy="${y}" rx="12" ry="6" transform="rotate(${angle},${x},${y})" fill="none" stroke="black" stroke-width="1"/>`;
        }).join('')}
        ${[30, 90, 150, 210, 270, 330].map(angle => {
            const x = 50 + 30 * Math.cos(angle * Math.PI / 180);
            const y = 50 + 30 * Math.sin(angle * Math.PI / 180);
            return `<ellipse cx="${x}" cy="${y}" rx="8" ry="4" transform="rotate(${angle},${x},${y})" fill="none" stroke="black" stroke-width="0.8"/>`;
        }).join('')}
    </svg>`;
}

function generateFrameSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="black" stroke-width="2"/>
        <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="1"/>
        <path d="M5,5 Q15,15 5,25" fill="none" stroke="black" stroke-width="1"/>
        <path d="M95,5 Q85,15 95,25" fill="none" stroke="black" stroke-width="1"/>
        <path d="M5,95 Q15,85 5,75" fill="none" stroke="black" stroke-width="1"/>
        <path d="M95,95 Q85,85 95,75" fill="none" stroke="black" stroke-width="1"/>
        <circle cx="15" cy="15" r="3" fill="none" stroke="black" stroke-width="0.8"/>
        <circle cx="85" cy="15" r="3" fill="none" stroke="black" stroke-width="0.8"/>
        <circle cx="15" cy="85" r="3" fill="none" stroke="black" stroke-width="0.8"/>
        <circle cx="85" cy="85" r="3" fill="none" stroke="black" stroke-width="0.8"/>
    </svg>`;
}

function generateEagleSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M50,15 Q60,10 65,20 Q70,15 75,25 Q80,20 85,30 Q75,35 70,40 Q80,45 90,50 Q75,55 65,50 Q60,55 50,60 Q55,70 50,85 Q45,70 50,60 Q40,55 35,50 Q25,55 10,50 Q20,45 30,40 Q25,35 15,30 Q20,20 25,25 Q30,15 35,20 Q40,10 50,15Z" fill="none" stroke="black" stroke-width="1.5"/>
        <circle cx="45" cy="25" r="2" fill="black"/>
        <path d="M50,30 L55,35 L50,33" fill="none" stroke="black" stroke-width="1"/>
    </svg>`;
}

function generateRoseSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M50,85 L50,45" fill="none" stroke="black" stroke-width="1.5"/>
        <path d="M50,65 Q35,55 30,45" fill="none" stroke="black" stroke-width="1"/>
        <path d="M50,55 Q65,45 70,35" fill="none" stroke="black" stroke-width="1"/>
        <path d="M50,45 Q40,35 35,25 Q45,15 55,25 Q65,15 70,30 Q60,45 50,45Z" fill="none" stroke="black" stroke-width="1.5"/>
        <ellipse cx="42" cy="30" rx="5" ry="8" transform="rotate(-20,42,30)" fill="none" stroke="black" stroke-width="0.8"/>
        <ellipse cx="58" cy="30" rx="5" ry="8" transform="rotate(20,58,30)" fill="none" stroke="black" stroke-width="0.8"/>
    </svg>`;
}

function generateHexSVG() {
    let hexes = '';
    const size = 12;
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const x = 15 + col * 20 + (row % 2 ? 10 : 0);
            const y = 15 + row * 18;
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                points.push(`${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`);
            }
            hexes += `<polygon points="${points.join(' ')}" fill="none" stroke="black" stroke-width="0.8"/>`;
        }
    }
    return `<svg viewBox="0 0 100 100" width="100" height="100">${hexes}</svg>`;
}

function generateSnowflakeSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        ${[0, 60, 120, 180, 240, 300].map(angle => {
            const rad = angle * Math.PI / 180;
            const x2 = 50 + 35 * Math.cos(rad);
            const y2 = 50 + 35 * Math.sin(rad);
            const bx1 = 50 + 20 * Math.cos(rad);
            const by1 = 50 + 20 * Math.sin(rad);
            return `<line x1="50" y1="50" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1.5"/>
                <line x1="${bx1}" y1="${by1}" x2="${bx1 + 8 * Math.cos(rad + 0.5)}" y2="${by1 + 8 * Math.sin(rad + 0.5)}" stroke="black" stroke-width="1"/>
                <line x1="${bx1}" y1="${by1}" x2="${bx1 + 8 * Math.cos(rad - 0.5)}" y2="${by1 + 8 * Math.sin(rad - 0.5)}" stroke="black" stroke-width="1"/>`;
        }).join('')}
    </svg>`;
}

function generateHeartSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M50,85 Q10,60 10,35 Q10,15 30,15 Q45,15 50,30 Q55,15 70,15 Q90,15 90,35 Q90,60 50,85Z" fill="none" stroke="black" stroke-width="1.5"/>
    </svg>`;
}

function generateCelticSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="black" stroke-width="1"/>
        <path d="M50,10 Q80,30 50,50 Q20,70 50,90 Q80,70 50,50 Q20,30 50,10" fill="none" stroke="black" stroke-width="1.5"/>
        <circle cx="50" cy="10" r="3" fill="black"/>
        <circle cx="50" cy="90" r="3" fill="black"/>
        <circle cx="10" cy="50" r="3" fill="black"/>
        <circle cx="90" cy="50" r="3" fill="black"/>
    </svg>`;
}

function generatePhotoFrameSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <rect x="5" y="5" width="90" height="90" rx="3" fill="none" stroke="black" stroke-width="2"/>
        <rect x="12" y="12" width="76" height="76" rx="2" fill="none" stroke="black" stroke-width="1"/>
        <path d="M12,12 Q30,20 50,12 Q70,20 88,12" fill="none" stroke="black" stroke-width="0.8"/>
        <path d="M12,88 Q30,80 50,88 Q70,80 88,88" fill="none" stroke="black" stroke-width="0.8"/>
    </svg>`;
}

function generateWolfSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M50,15 L35,5 L30,25 L20,15 L25,35 Q15,50 20,65 Q25,80 40,88 L50,95 L60,88 Q75,80 80,65 Q85,50 75,35 L80,15 L70,25 L65,5 Z" fill="none" stroke="black" stroke-width="1.5"/>
        <circle cx="38" cy="40" r="4" fill="none" stroke="black" stroke-width="1"/>
        <circle cx="62" cy="40" r="4" fill="none" stroke="black" stroke-width="1"/>
        <circle cx="38" cy="40" r="1.5" fill="black"/>
        <circle cx="62" cy="40" r="1.5" fill="black"/>
        <path d="M45,55 L50,60 L55,55" fill="none" stroke="black" stroke-width="1"/>
        <path d="M35,65 Q50,75 65,65" fill="none" stroke="black" stroke-width="1"/>
    </svg>`;
}

function generateTreeOfLifeSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="black" stroke-width="1.5"/>
        <path d="M50,85 L50,50" stroke="black" stroke-width="2" fill="none"/>
        <path d="M50,60 Q35,50 30,35 Q35,20 50,25" stroke="black" stroke-width="1.5" fill="none"/>
        <path d="M50,60 Q65,50 70,35 Q65,20 50,25" stroke="black" stroke-width="1.5" fill="none"/>
        <path d="M50,55 Q30,50 25,40" stroke="black" stroke-width="1" fill="none"/>
        <path d="M50,55 Q70,50 75,40" stroke="black" stroke-width="1" fill="none"/>
        <path d="M50,50 Q35,45 30,30" stroke="black" stroke-width="0.8" fill="none"/>
        <path d="M50,50 Q65,45 70,30" stroke="black" stroke-width="0.8" fill="none"/>
        <path d="M50,85 Q40,90 35,85" stroke="black" stroke-width="1" fill="none"/>
        <path d="M50,85 Q60,90 65,85" stroke="black" stroke-width="1" fill="none"/>
    </svg>`;
}

function generateSpiralSVG() {
    let path = 'M50,50 ';
    for (let i = 0; i < 360; i += 5) {
        const rad = i * Math.PI / 180;
        const r = 2 + i / 30;
        const x = 50 + r * Math.cos(rad);
        const y = 50 + r * Math.sin(rad);
        path += `L${x.toFixed(1)},${y.toFixed(1)} `;
    }
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="${path}" fill="none" stroke="black" stroke-width="1"/>
    </svg>`;
}

function generateGiftSVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="35" width="70" height="55" rx="3" fill="none" stroke="black" stroke-width="1.5"/>
        <rect x="10" y="25" width="80" height="15" rx="3" fill="none" stroke="black" stroke-width="1.5"/>
        <line x1="50" y1="25" x2="50" y2="90" stroke="black" stroke-width="1"/>
        <path d="M50,25 Q35,10 30,20 Q25,30 40,25" fill="none" stroke="black" stroke-width="1.5"/>
        <path d="M50,25 Q65,10 70,20 Q75,30 60,25" fill="none" stroke="black" stroke-width="1.5"/>
    </svg>`;
}

function generateInfinitySVG() {
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M50,50 Q25,25 15,50 Q25,75 50,50 Q75,25 85,50 Q75,75 50,50" fill="none" stroke="black" stroke-width="2"/>
    </svg>`;
}

function generateMandalaSVG() {
    let elements = '';
    for (let ring = 0; ring < 4; ring++) {
        const r = 10 + ring * 10;
        elements += `<circle cx="50" cy="50" r="${r}" fill="none" stroke="black" stroke-width="0.5"/>`;
        const petals = 6 + ring * 2;
        for (let i = 0; i < petals; i++) {
            const angle = (360 / petals) * i;
            const rad = angle * Math.PI / 180;
            const x = 50 + r * Math.cos(rad);
            const y = 50 + r * Math.sin(rad);
            elements += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="none" stroke="black" stroke-width="0.5"/>`;
        }
    }
    return `<svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="black" stroke-width="1"/>
        ${elements}
    </svg>`;
}

// ===========================
// TROPHY DESIGNER
// ===========================
function initTrophies() {
    const templates = document.getElementById('trophyTemplates');
    const typeSelect = document.getElementById('trophyType');
    const sizeSelect = document.getElementById('trophySize');
    const materialSelect = document.getElementById('trophyMaterial');
    const titleInput = document.getElementById('trophyTitle');
    const nameInput = document.getElementById('trophyName');
    const dateInput = document.getElementById('trophyDate');
    const messageInput = document.getElementById('trophyMessage');
    const borderSelect = document.getElementById('borderStyle');
    const decorationSelect = document.getElementById('decoration');
    const addImageBtn = document.getElementById('addTrophyImage');
    const trophyImageInput = document.getElementById('trophyImageInput');
    const downloadTrophy = document.getElementById('downloadTrophy');
    const downloadTrophyDXF = document.getElementById('downloadTrophyDXF');

    if (!templates) return;

    const trophyTemplates = [
        { id: 'plaque', name: 'Wall Plaque', icon: 'fa-award', desc: 'Classic wall-mounted award' },
        { id: 'standing', name: 'Standing Trophy', icon: 'fa-trophy', desc: 'Traditional trophy design' },
        { id: 'crystal', name: 'Crystal Award', icon: 'fa-gem', desc: 'Modern crystal-style award' },
        { id: 'wood', name: 'Wooden Trophy', icon: 'fa-tree', desc: 'Natural wood finish' },
        { id: 'acrylic', name: 'Acrylic Award', icon: 'fa-square', desc: 'Clear acrylic design' },
    ];

    templates.innerHTML = trophyTemplates.map(t => `
        <div class="template-card" data-template="${t.id}">
            <i class="fas ${t.icon}"></i>
            <h4>${t.name}</h4>
            <p>${t.desc}</p>
        </div>
    `).join('');

    templates.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            templates.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            document.getElementById('trophyEditor').style.display = 'grid';
            document.getElementById('trophyType').value = card.dataset.template;
            updateTrophyPreview();
        });
    });

    [typeSelect, sizeSelect, materialSelect, borderSelect, decorationSelect].forEach(el => {
        if (el) el.addEventListener('change', updateTrophyPreview);
    });

    [titleInput, nameInput, messageInput].forEach(el => {
        if (el) el.addEventListener('input', updateTrophyPreview);
    });

    if (dateInput) {
        dateInput.addEventListener('change', updateTrophyPreview);
    }

    if (addImageBtn) {
        addImageBtn.addEventListener('click', () => trophyImageInput.click());
    }

    if (trophyImageInput) {
        trophyImageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    window.trophyLogo = ev.target.result;
                    updateTrophyPreview();
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    if (downloadTrophy) downloadTrophy.addEventListener('click', () => downloadTrophyFile('svg'));
    if (downloadTrophyDXF) downloadTrophyDXF.addEventListener('click', () => downloadTrophyFile('dxf'));

    updateTrophyPreview();
}

let trophyLogoData = null;

function updateTrophyPreview() {
    const type = document.getElementById('trophyType').value;
    const size = document.getElementById('trophySize').value;
    const title = document.getElementById('trophyTitle').value || 'Award of Excellence';
    const name = document.getElementById('trophyName').value || 'John Doe';
    const date = document.getElementById('trophyDate').value || new Date().toLocaleDateString();
    const message = document.getElementById('trophyMessage').value || 'For outstanding achievement';
    const border = document.getElementById('borderStyle').value;
    const decoration = document.getElementById('decoration').value;

    let viewBoxW = 400, viewBoxH = 500;
    if (size === 'small') { viewBoxW = 300; viewBoxH = 400; }
    else if (size === 'large') { viewBoxW = 500; viewBoxH = 600; }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxW} ${viewBoxH}" width="${viewBoxW}" height="${viewBoxH}">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;

    const cx = viewBoxW / 2;
    const margin = 30;

    switch (type) {
        case 'plaque':
            svg += `<rect x="${margin}" y="${margin}" width="${viewBoxW - margin * 2}" height="${viewBoxH - margin * 2}" rx="5" fill="none" stroke="black" stroke-width="3"/>`;
            break;
        case 'standing':
            svg += `<rect x="${margin}" y="${margin + 80}" width="${viewBoxW - margin * 2}" height="${viewBoxH - margin * 2 - 80}" rx="3" fill="none" stroke="black" stroke-width="2"/>`;
            svg += `<rect x="${cx - 40}" y="${viewBoxH - margin - 10}" width="80" height="30" fill="none" stroke="black" stroke-width="2"/>`;
            svg += `<polygon points="${cx},${margin} ${cx - 50},${margin + 60} ${cx + 50},${margin + 60}" fill="none" stroke="black" stroke-width="2"/>`;
            break;
        case 'crystal':
            svg += `<polygon points="${cx},${margin} ${viewBoxW - margin},${margin + 100} ${viewBoxW - margin},${viewBoxH - margin} ${margin},${viewBoxH - margin} ${margin},${margin + 100}" fill="none" stroke="black" stroke-width="2"/>`;
            break;
        case 'wood':
            svg += `<rect x="${margin}" y="${margin}" width="${viewBoxW - margin * 2}" height="${viewBoxH - margin * 2}" fill="none" stroke="black" stroke-width="2"/>`;
            for (let i = 0; i < 8; i++) {
                const y = margin + 30 + i * 50;
                svg += `<path d="M${margin},${y} Q${cx},${y + 10} ${viewBoxW - margin},${y}" fill="none" stroke="black" stroke-width="0.3" opacity="0.3"/>`;
            }
            break;
        case 'acrylic':
            svg += `<rect x="${margin + 10}" y="${margin + 10}" width="${viewBoxW - margin * 2 - 20}" height="${viewBoxH - margin * 2 - 20}" rx="10" fill="none" stroke="black" stroke-width="1"/>`;
            svg += `<rect x="${margin}" y="${margin}" width="${viewBoxW - margin * 2}" height="${viewBoxH - margin * 2}" rx="12" fill="none" stroke="black" stroke-width="2"/>`;
            break;
    }

    if (border === 'ornate') {
        svg += `<rect x="${margin + 15}" y="${margin + 15}" width="${viewBoxW - margin * 2 - 30}" height="${viewBoxH - margin * 2 - 30}" fill="none" stroke="black" stroke-width="1" stroke-dasharray="5,5"/>`;
    } else if (border === 'rope') {
        svg += `<rect x="${margin + 10}" y="${margin + 10}" width="${viewBoxW - margin * 2 - 20}" height="${viewBoxH - margin * 2 - 20}" fill="none" stroke="black" stroke-width="2" stroke-dasharray="8,4,2,4"/>`;
    }

    const contentY = margin + (type === 'standing' ? 120 : 60);

    if (decoration === 'stars') {
        svg += `<text x="${cx}" y="${contentY - 20}" text-anchor="middle" font-size="24" fill="black">★ ★ ★</text>`;
    } else if (decoration === 'laurel') {
        svg += `<path d="M${cx - 40},${contentY - 10} Q${cx - 30},${contentY - 30} ${cx},${contentY - 35} Q${cx + 30},${contentY - 30} ${cx + 40},${contentY - 10}" fill="none" stroke="black" stroke-width="1.5"/>`;
    } else if (decoration === 'ribbon') {
        svg += `<path d="M${cx - 50},${contentY - 5} L${cx},${contentY + 5} L${cx + 50},${contentY - 5}" fill="none" stroke="black" stroke-width="1.5"/>`;
    } else if (decoration === 'shield') {
        svg += `<path d="M${cx},${contentY - 40} L${cx + 30},${contentY - 25} L${cx + 30},${contentY + 10} Q${cx},${contentY + 30} ${cx - 30},${contentY + 10} L${cx - 30},${contentY - 25} Z" fill="none" stroke="black" stroke-width="1.5"/>`;
    }

    svg += `<text x="${cx}" y="${contentY + 40}" text-anchor="middle" font-size="20" font-weight="bold" fill="black">${title}</text>`;

    svg += `<line x1="${cx - 80}" y1="${contentY + 55}" x2="${cx + 80}" y2="${contentY + 55}" stroke="black" stroke-width="1"/>`;

    svg += `<text x="${cx}" y="${contentY + 85}" text-anchor="middle" font-size="16" fill="black">${name}</text>`;

    svg += `<text x="${cx}" y="${contentY + 115}" text-anchor="middle" font-size="12" fill="black">${date}</text>`;

    const messageLines = wrapText(message, 40);
    messageLines.forEach((line, i) => {
        svg += `<text x="${cx}" y="${contentY + 150 + i * 18}" text-anchor="middle" font-size="11" fill="black">${line}</text>`;
    });

    svg += `</svg>`;

    document.getElementById('trophySVG').outerHTML = svg.replace('>', ` id="trophySVG">`);
}

function wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length <= maxChars) {
            currentLine = (currentLine + ' ' + word).trim();
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
}

function downloadTrophyFile(format) {
    const svg = document.getElementById('trophySVG');
    if (!svg) {
        showNotification('No trophy to download');
        return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);

    if (format === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trophy-design.svg';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Trophy SVG downloaded!');
    } else {
        const dxf = svgToDXF(svg);
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trophy-design.dxf';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Trophy DXF downloaded!');
    }
}

// Make functions available globally
window.switchSection = switchSection;
window.showNotification = showNotification;
