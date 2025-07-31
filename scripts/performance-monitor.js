// Performance monitoring script
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: {},
            apiCalls: [],
            userInteractions: [],
            errors: []
        };
        
        this.init();
    }

    init() {
        // Monitor page load performance
        this.monitorPageLoad();
        
        // Monitor API calls
        this.monitorApiCalls();
        
        // Monitor user interactions
        this.monitorUserInteractions();
        
        // Monitor errors
        this.monitorErrors();
        
        // Monitor Core Web Vitals
        this.monitorWebVitals();
        
        // Send metrics periodically
        this.startPeriodicReporting();
    }

    monitorPageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            
            this.metrics.pageLoad = {
                timestamp: Date.now(),
                totalLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                url: window.location.href,
                userAgent: navigator.userAgent
            };
        });
    }

    monitorApiCalls() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                
                this.metrics.apiCalls.push({
                    url,
                    duration: endTime - startTime,
                    status: response.status,
                    timestamp: Date.now(),
                    method: args[1]?.method || 'GET'
                });
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                
                this.metrics.apiCalls.push({
                    url,
                    duration: endTime - startTime,
                    status: 'error',
                    error: error.message,
                    timestamp: Date.now(),
                    method: args[1]?.method || 'GET'
                });
                
                throw error;
            }
        };
    }

    monitorUserInteractions() {
        let lastInteraction = Date.now();
        
        const events = ['click', 'input', 'scroll', 'keydown'];
        events.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                const now = Date.now();
                const timeSinceLastInteraction = now - lastInteraction;
                
                this.metrics.userInteractions.push({
                    type: eventType,
                    target: e.target.tagName,
                    timestamp: now,
                    timeSinceLastInteraction
                });
                
                lastInteraction = now;
            }, { passive: true });
        });
    }

    monitorErrors() {
        window.addEventListener('error', (e) => {
            this.metrics.errors.push({
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                timestamp: Date.now()
            });
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.metrics.errors.push({
                type: 'unhandledrejection',
                reason: e.reason,
                timestamp: Date.now()
            });
        });
    }

    monitorWebVitals() {
        // LCP (Largest Contentful Paint)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                this.metrics.lcp = {
                    value: lastEntry.startTime,
                    timestamp: Date.now()
                };
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            
            // FID (First Input Delay)
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    this.metrics.fid = {
                        value: entry.processingStart - entry.startTime,
                        timestamp: Date.now()
                    };
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            
            // CLS (Cumulative Layout Shift)
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                
                this.metrics.cls = {
                    value: clsValue,
                    timestamp: Date.now()
                };
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
    }

    startPeriodicReporting() {
        setInterval(() => {
            this.reportMetrics();
        }, 30000); // Report every 30 seconds
    }

    reportMetrics() {
        const report = {
            timestamp: Date.now(),
            url: window.location.href,
            metrics: this.metrics
        };
        
        // Send to analytics endpoint
        fetch('/api/performance-metrics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(report)
        }).catch(error => {
            console.error('Failed to send performance metrics:', error);
        });
        
        // Clear old data
        this.clearOldData();
    }

    clearOldData() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        this.metrics.apiCalls = this.metrics.apiCalls.filter(
            call => now - call.timestamp < maxAge
        );
        
        this.metrics.userInteractions = this.metrics.userInteractions.filter(
            interaction => now - interaction.timestamp < maxAge
        );
        
        this.metrics.errors = this.metrics.errors.filter(
            error => now - error.timestamp < maxAge
        );
    }

    getMetrics() {
        return this.metrics;
    }

    // Custom metric tracking
    trackCustomMetric(name, value, tags = {}) {
        this.metrics.custom = this.metrics.custom || [];
        this.metrics.custom.push({
            name,
            value,
            tags,
            timestamp: Date.now()
        });
    }

    // Performance mark and measure
    mark(name) {
        performance.mark(name);
    }

    measure(name, startMark, endMark) {
        try {
            const measure = performance.measure(name, startMark, endMark);
            this.trackCustomMetric(name, measure.duration);
        } catch (error) {
            console.error('Failed to measure performance:', error);
        }
    }
}

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Export for use in other modules
window.performanceMonitor = performanceMonitor;

// Example usage:
// performanceMonitor.mark('app-start');
// performanceMonitor.measure('app-initialization', 'app-start', 'app-ready');
// performanceMonitor.trackCustomMetric('cache-hit-rate', 0.85, { cache: 'memory' });

console.log('Performance monitor initialized'); 