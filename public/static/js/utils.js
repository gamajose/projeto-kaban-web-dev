/**
 * ClickUp Clone - Utility Functions
 * Funções utilitárias reutilizáveis em toda a aplicação
 */

// Global utilities object
window.utils = {
    // String utilities
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    slugify(text) {
        return text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    },

    truncate(text, length = 100, suffix = '...') {
        if (!text || text.length <= length) return text;
        return text.substring(0, length).trim() + suffix;
    },

    capitalize(text) {
        if (!text) return text;
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    titleCase(text) {
        if (!text) return text;
        return text.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },

    sanitizeHtml(text) {
        const temp = document.createElement('div');
        temp.textContent = text;
        return temp.innerHTML;
    },

    stripHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    },

    // Number utilities
    formatNumber(num, locale = 'pt-BR') {
        if (num == null) return '-';
        return new Intl.NumberFormat(locale).format(num);
    },

    formatCurrency(amount, currency = 'BRL', locale = 'pt-BR') {
        if (amount == null) return '-';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Date utilities
    formatDate(date, format = 'relative', locale = 'pt-BR') {
        if (!date) return '';
        
        const d = dayjs(date);
        
        switch (format) {
            case 'relative':
                return d.fromNow();
            case 'calendar':
                return d.calendar();
            case 'short':
                return d.format('DD/MM');
            case 'medium':
                return d.format('DD/MM/YYYY');
            case 'long':
                return d.format('DD/MM/YYYY HH:mm');
            case 'time':
                return d.format('HH:mm');
            case 'iso':
                return d.toISOString();
            default:
                return d.format(format);
        }
    },

    isToday(date) {
        return dayjs(date).isSame(dayjs(), 'day');
    },

    isTomorrow(date) {
        return dayjs(date).isSame(dayjs().add(1, 'day'), 'day');
    },

    isYesterday(date) {
        return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
    },

    isOverdue(date) {
        return dayjs(date).isBefore(dayjs(), 'day');
    },

    getDaysUntil(date) {
        return dayjs(date).diff(dayjs(), 'day');
    },

    // Array utilities
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    },

    unique(array, key = null) {
        if (!key) return [...new Set(array)];
        
        const seen = new Set();
        return array.filter(item => {
            const val = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        });
    },

    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    // Object utilities
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    merge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.merge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.merge(target, ...sources);
    },

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },

    isEmpty(value) {
        if (value == null) return true;
        if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    pick(obj, keys) {
        const result = {};
        keys.forEach(key => {
            if (key in obj) result[key] = obj[key];
        });
        return result;
    },

    omit(obj, keys) {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    },

    // DOM utilities
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else if (key in element) {
                element[key] = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    },

    // Event utilities
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Local storage utilities
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Error writing to localStorage:', error);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Error removing from localStorage:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Error clearing localStorage:', error);
                return false;
            }
        }
    },

    // URL utilities
    getUrlParams(url = window.location.href) {
        const params = new URLSearchParams(new URL(url).search);
        const result = {};
        for (const [key, value] = params) {
            result[key] = value;
        }
        return result;
    },

    setUrlParam(key, value, url = window.location.href) {
        const urlObj = new URL(url);
        urlObj.searchParams.set(key, value);
        return urlObj.toString();
    },

    removeUrlParam(key, url = window.location.href) {
        const urlObj = new URL(url);
        urlObj.searchParams.delete(key);
        return urlObj.toString();
    },

    // Color utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("");
    },

    lightenColor(color, percent) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const { r, g, b } = rgb;
        const amount = Math.round(2.55 * percent);
        
        return this.rgbToHex(
            Math.min(255, r + amount),
            Math.min(255, g + amount),
            Math.min(255, b + amount)
        );
    },

    darkenColor(color, percent) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const { r, g, b } = rgb;
        const amount = Math.round(2.55 * percent);
        
        return this.rgbToHex(
            Math.max(0, r - amount),
            Math.max(0, g - amount),
            Math.max(0, b - amount)
        );
    },

    getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        
        const { r, g, b } = rgb;
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        
        return brightness > 125 ? '#000000' : '#ffffff';
    },

    // Validation utilities
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    isValidPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    },

    // File utilities
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    getFileName(filepath) {
        return filepath.split('/').pop();
    },

    isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        const extension = this.getFileExtension(filename);
        return imageExtensions.includes(extension);
    },

    downloadFile(data, filename, type = 'application/octet-stream') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    // Performance utilities
    measurePerformance(fn, label = 'Operation') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${label} took ${end - start} milliseconds`);
        return result;
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                console.error('Failed to copy text:', fallbackError);
                return false;
            }
        }
    },

    // Random utilities
    randomId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    randomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // Feature detection
    supports: {
        webgl: (() => {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
            } catch {
                return false;
            }
        })(),

        localStorage: (() => {
            try {
                const test = 'localStorage-test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch {
                return false;
            }
        })(),

        touchEvents: 'ontouchstart' in window,
        
        webWorkers: typeof Worker !== 'undefined',
        
        webSockets: typeof WebSocket !== 'undefined',
        
        notifications: 'Notification' in window,
        
        geolocation: 'geolocation' in navigator,
        
        camera: navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    },

    // Device detection
    device: {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isTablet: /iPad|Android(?=.*\bMobile\b)(?=.*\b(?:Tablet|Tab)\b)/i.test(navigator.userAgent),
        isDesktop() {
            return !this.isMobile && !this.isTablet;
        },
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent),
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent),
        isFirefox: /Firefox/.test(navigator.userAgent)
    }
};

// Polyfills for older browsers
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString || ' ');
        if (this.length > targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}

// Console utilities for development
if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    window.debug = {
        log: console.log.bind(console, '🐛'),
        info: console.info.bind(console, 'ℹ️'),
        warn: console.warn.bind(console, '⚠️'),
        error: console.error.bind(console, '❌'),
        table: console.table.bind(console),
        trace: console.trace.bind(console)
    };
} else {
    // Disable console in production
    window.debug = {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        table: () => {},
        trace: () => {}
    };
}