const net = require('net');

const hosts = [
    'ac-xp4gzvx-shard-00-00.eryeltv.mongodb.net',
    'ac-xp4gzvx-shard-00-01.eryeltv.mongodb.net',
    'ac-xp4gzvx-shard-00-02.eryeltv.mongodb.net'
];

const port = 27017;

const checkHost = (host) => {
    return new Promise((resolve) => {
        const client = new net.Socket();
        client.setTimeout(5000);
        client.on('connect', () => {
            console.log(`✅ Connection to ${host}:${port} successful.`);
            client.destroy();
            resolve(true);
        });
        client.on('error', (err) => {
            console.log(`❌ Connection to ${host}:${port} failed: ${err.message}`);
            client.destroy();
            resolve(false);
        });
        client.on('timeout', () => {
            console.log(`❌ Connection to ${host}:${port} timed out.`);
            client.destroy();
            resolve(false);
        });
        client.connect(port, host);
    });
};

async function runDiagnostics() {
    console.log('Running MongoDB Atlas connection diagnostics...');
    for (const host of hosts) {
        await checkHost(host);
    }
}

runDiagnostics();
