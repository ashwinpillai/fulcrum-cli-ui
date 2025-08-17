import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawn, ChildProcess } from 'child_process';

interface CommandRequest {
  command: string;
  args?: string[];
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/run-command', (req: Request<{}, {}, CommandRequest>, res: Response) => {
  const { command, args = [] } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'No command provided' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const flatArgs: string[] = [];
  args.forEach(arg => {
    const parts = arg.split(' ');
    flatArgs.push(...parts);
  });

  const commandParts = command.split(' ');
  const child: ChildProcess = spawn('./run', [...commandParts, ...flatArgs]);

  child.stdout?.on('data', (data: Buffer) => {
    res.write(`data: ${data.toString()}` + '\n\n');
  });

  child.stderr?.on('data', (data: Buffer) => {
    res.write(`data: ${data.toString()}` + '\n\n');
  });

  child.on('close', (code: number | null) => {
    res.write(`event: end\ndata: Command exited with code ${code}\n\n`);
    res.end();
  });
});

const PORT: number = parseInt(process.env.PORT || '10000');
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
