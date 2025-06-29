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
  const child = spawn('./run', [command, ...args]);
  child.stdout.on('data', (data) => {
    res.write(`data: ${data.toString()}` + '\n\n');
  });
  child.stderr.on('data', (data) => {
    res.write(`data: ${data.toString()}` + '\n\n');
  });
  child.on('close', (code) => {
    res.write(`event: end\ndata: Command exited with code ${code}\n\n`);
    res.end();
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
