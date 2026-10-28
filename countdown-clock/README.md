# Countdown Clock

A premium dark-theme countdown dashboard. Express + Mongoose + MongoDB on the back end, plain HTML/CSS/JavaScript on the front end. Every countdown is stored in MongoDB, so a browser refresh never loses data.

```
countdown-clock/
  models/Countdown.js          Mongoose model
  routes/countdownRoutes.js    REST endpoints and validation
  public/index.html            Page markup
  public/styles.css            Styling
  public/app.js                Fetch API client and live timers
  server.js                    Express server and MongoDB connection
  .env.example  .gitignore  package.json  README.md
```

## 1. Install Node.js and MongoDB

**Node.js (version 18 or newer)**
1. Download the LTS installer from https://nodejs.org and run it.
2. Check it worked: `node --version` and `npm --version`.

**Option A: local MongoDB**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community and install it.
2. Windows: choose "Run service as Network Service user" so it starts automatically.
3. macOS (Homebrew): `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
4. Ubuntu/Debian: follow the official guide for your release, then `sudo systemctl start mongod`.
5. Check it is running: `mongosh` should open a shell.

**Option B: MongoDB Atlas (cloud)**
1. Create a free account and a free cluster at https://www.mongodb.com/atlas.
2. Under *Database Access*, add a database user with a password.
3. Under *Network Access*, add your current IP address (use `0.0.0.0/0` only for quick testing).
4. Click *Connect* on the cluster, choose *Drivers*, and copy the `mongodb+srv://...` string.
5. Replace `<username>` and `<password>` in it (URL-encode special characters in the password) and add `/countdown_clock` before the `?`.

## 2. Open the project in VS Code
Unzip the project, then in VS Code choose *File > Open Folder* and select `countdown-clock`. Open the built-in terminal with *Terminal > New Terminal*.

## 3. Install dependencies
```
npm install
```

## 4. Create the `.env` file
Copy the example file:

```
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Edit `.env`:

```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/countdown_clock
```

For Atlas, paste your Atlas connection string as `MONGODB_URI`. The `.env` file is listed in `.gitignore`, so credentials are never committed.

## 5. Start the server
```
npm start
```
For auto-restart while editing: `npm run dev`.
You should see `Connected to MongoDB.` and `Countdown Clock running at http://localhost:3000`.

## 6. Open the app
Visit **http://localhost:3000**.

## 7. Test every API endpoint
Dates must be in the future. Use a date later than today in the examples below.

**Create** (201 Created):
```
curl -X POST http://localhost:3000/api/countdowns \
  -H "Content-Type: application/json" \
  -d '{"title":"Launch day","description":"Ship it","targetDate":"2030-01-01T09:00:00.000Z"}'
```
Copy the `_id` from the response and use it as `ID` below.

**List all** (200):
```
curl http://localhost:3000/api/countdowns
```

**Get one** (200, or 404 if missing, 400 if the id is malformed):
```
curl http://localhost:3000/api/countdowns/ID
```

**Update** (200):
```
curl -X PUT http://localhost:3000/api/countdowns/ID \
  -H "Content-Type: application/json" \
  -d '{"title":"Launch day (moved)","description":"","targetDate":"2030-02-01T09:00:00.000Z"}'
```

**Delete** (200):
```
curl -X DELETE http://localhost:3000/api/countdowns/ID
```

**Validation check** (400 with details):
```
curl -X POST http://localhost:3000/api/countdowns \
  -H "Content-Type: application/json" -d '{"title":"","targetDate":"2001-01-01"}'
```
On Windows PowerShell use `curl.exe` instead of `curl`, or test with Postman or the VS Code REST Client extension.

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | /api/countdowns | 200 | 500 |
| GET | /api/countdowns/:id | 200 | 400, 404, 500 |
| POST | /api/countdowns | 201 | 400, 500 |
| PUT | /api/countdowns/:id | 200 | 400, 404, 500 |
| DELETE | /api/countdowns/:id | 200 | 400, 404, 500 |

## 8. Troubleshooting MongoDB connection errors

| Message | Likely cause and fix |
|---------|----------------------|
| `Missing MONGODB_URI` | `.env` does not exist or is misnamed. Create it from `.env.example` in the project root. |
| `ECONNREFUSED 127.0.0.1:27017` | Local MongoDB is not running. Start the service (`brew services start mongodb-community`, `sudo systemctl start mongod`, or start the *MongoDB* service on Windows). |
| `Server selection timed out` | Wrong host, or on Atlas your IP is not in *Network Access*. Add your IP and retry. |
| `Authentication failed` | Wrong Atlas username or password. Check *Database Access* and URL-encode special characters (`@` becomes `%40`). |
| `querySrv ENOTFOUND` | `mongodb+srv` URL is mistyped, or DNS/VPN is blocking it. Re-copy the string from Atlas. |
| `EADDRINUSE :::3000` | Port 3000 is taken. Change `PORT` in `.env` and open that port instead. |
| Page loads but shows "Cannot reach the server" | The server stopped. Check the terminal for errors and restart with `npm start`. |

## Features
- Create, edit and delete countdowns (delete asks for confirmation).
- Live days, hours, minutes and seconds computed from the target timestamp, so timers stay accurate.
- Automatic "Completed" status, live progress bar, sorted by target date.
- Validation on both client and server, including rejecting past dates.
- Duplicate submissions are blocked while a request is running.
- Keyboard-friendly dialogs, visible focus, skip link, reduced-motion support.
