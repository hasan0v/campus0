# Ubuntu/Linux Setup Troubleshooting

## Error: "Permission denied" when running `./run.sh`

### Solution 1: Make Script Executable (Recommended)

```bash
chmod +x run.sh
./run.sh
```

**Explanation:**
- `chmod +x` adds execute permission to the script
- `./run.sh` runs the script directly

### Solution 2: Run with Bash Directly (No Permission Change Needed)

```bash
bash run.sh
```

This works without needing to change file permissions.

### Solution 3: Manual Setup (If Both Above Fail)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev
```

Then open http://localhost:3000 in your browser.

---

## Other Common Ubuntu Issues

### Node.js Not Installed

If you get "node: command not found":

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nodejs npm

# Verify installation
node --version
npm --version
```

### npm Permission Errors

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to .bashrc to make permanent
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Port 3000 Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace PID with the number)
kill -9 <PID>

# Or use a different port
PORT=5000 npm run dev
```

### Build Fails with TypeScript Errors

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Permission Issues with node_modules

```bash
# Fix ownership
sudo chown -R $USER:$USER node_modules
npm install
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bash run.sh` | Run the app (easiest for permission issues) |
| `chmod +x run.sh && ./run.sh` | Make script executable and run |
| `npm install` | Install dependencies |
| `npm run build` | Build TypeScript |
| `npm run dev` | Start development server |
| `PORT=5000 npm run dev` | Start on custom port |

---

## Need More Help?

Check the main `SETUP.md` file for detailed installation instructions for your operating system.
