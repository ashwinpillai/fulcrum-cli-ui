import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/run-command', (req, res) => {
  const { command, args = [] } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'No command provided' });
  }
  // Construct the full command string
  const fullCommand = `./run ${command} ${args.join(' ')}`;
  exec(fullCommand, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ output: stdout });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
