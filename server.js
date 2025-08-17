import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
const app = express();
app.use(cors());
app.use(express.json());
app.post('/run-command', (req, res) => {
    const { command, args = [] } = req.body;
    if (!command) {
        return res.status(400).json({ error: 'No command provided' });
    }
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    const flatArgs = [];
    args.forEach(arg => {
        const parts = arg.split(' ');
        flatArgs.push(...parts);
    });
    const commandParts = command.split(' ');
    const child = spawn('./run', [...commandParts, ...flatArgs]);
    child.stdout?.on('data', (data) => {
        res.write(`data: ${data.toString()}` + '\n\n');
    });
    child.stderr?.on('data', (data) => {
        res.write(`data: ${data.toString()}` + '\n\n');
    });
    child.on('close', (code) => {
        res.write(`event: end\ndata: Command exited with code ${code}\n\n`);
        res.end();
    });
});
const PORT = parseInt(process.env.PORT || '10000');
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`🚀 Fulcrum CLI Backend Server running on ${HOST}:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://${HOST}:${PORT}/run-command`);
});
