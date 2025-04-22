var express = require('express');
var router = express.Router();
const os = require('os');

// Variáveis de estado da aplicação
let isHealth = true;
let readTime = new Date(Date.now());
let latencyMs = 0; // Nova variável para controlar o atraso de latência

// Função corrigida: retorna true quando a aplicação está pronta para receber tráfego
let isRead = () => { 
    return readTime <= new Date(Date.now());
};

// Endpoint para verificar se a aplicação está pronta para receber tráfego
router.get('/ready', (req, res) => {
    if (isRead()) {
        res.status(200).send('Ok');
    } else {
        res.status(500).send('Application not ready');
    }   
});

// Endpoint para verificar o estado de saúde da aplicação
router.get('/health', (req, res) => {
    if (isHealth) {
        res.json({
            state: 'up',
            machine: os.hostname(),
            latency: `${latencyMs}ms`
        });
    } else {
        res.status(500).json({
            state: 'down',
            machine: os.hostname(),
            latency: `${latencyMs}ms`
        });
    }
});

// Endpoint para marcar a aplicação como não saudável
router.put('/unhealthy', (req, res) => {
    isHealth = false;
    console.log(`[${new Date().toISOString()}] Application marked as unhealthy`);
    res.send("OK");
});

// Endpoint para restaurar a saúde da aplicação
router.put('/healthy', (req, res) => {
    isHealth = true;
    console.log(`[${new Date().toISOString()}] Application marked as healthy`);
    res.send("OK");
});

// Endpoint para marcar a aplicação como não pronta por um período específico
router.put('/unreadyfor/:seconds', (req, res) => {
    const seconds = parseInt(req.params.seconds);
    
    if (isNaN(seconds) || seconds < 0) {
        return res.status(400).send('Invalid seconds parameter');
    }
    
    readTime = new Date(Date.now() + (1000 * seconds));
    console.log(`[${new Date().toISOString()}] Application marked as not ready until ${readTime.toISOString()}`);
    res.send("OK");
});

// Endpoint para configurar a latência artificial
router.put('/latency/:milliseconds', (req, res) => {
    const milliseconds = parseInt(req.params.milliseconds);
    
    if (isNaN(milliseconds) || milliseconds < 0) {
        return res.status(400).send('Invalid milliseconds parameter');
    }
    
    latencyMs = milliseconds;
    console.log(`[${new Date().toISOString()}] Artificial latency set to ${latencyMs}ms`);
    res.json({
        message: 'Latency configured',
        latency: `${latencyMs}ms`,
        timestamp: new Date().toISOString()
    });
});

// Middleware para verificação de saúde e aplicação de latência artificial
var healthMid = function (req, res, next) {
    // Verifica se é o endpoint /metrics, que deve ser isento do atraso
    if (req.path === '/metrics') {
        if (isHealth) {
            return next();
        } else {
            return res.status(500).send('Service unavailable - health check failed');
        }
    }
    
    // Para outros endpoints, verifica saúde primeiro
    if (!isHealth) {
        return res.status(500).send('Service unavailable - health check failed');
    }
    
    // Se latência estiver configurada, aplica o atraso
    if (latencyMs > 0) {
        console.log(`[${new Date().toISOString()}] Adding ${latencyMs}ms latency to request: ${req.method} ${req.path}`);
        setTimeout(next, latencyMs);
    } else {
        next();
    }
};

exports.routers = router;
exports.middlewares = { healthMid };