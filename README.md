# MasterSplitter 💸

A trip expense-splitting web application that helps groups of friends track shared expenses during trips and calculate who owes whom.

## Features

- 🔐 **User Authentication** — signup/login with hashed passwords
- ✈️ **Multi-trip support** — create and manage multiple trips
- 👥 **Trip members** — add registered users and local (unregistered) participants
- 💰 **Expense tracking** — add expenses with categories (food, lodging, transport, attractions, general)
- 📊 **Balance calculation** — automatic per-person split and balance summary
- 🗑️ **Expense deletion** — remove expenses with ownership checks
- 📱 **Mobile-first UI** — RTL Hebrew interface, bottom navigation, responsive design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python Flask |
| Frontend | Vanilla HTML/CSS/JS |
| Database | SQLite |
| Auth | Flask sessions + werkzeug password hashing |

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. (Optional) Set a secret key for sessions
#    On Windows PowerShell:
$env:SECRET_KEY = "your-secret-key-here"

# 3. Run the server
python Server.py

# 4. Open in browser
# http://localhost:5000
```

## Project Structure

```
Master_splitter/
├── Server.py              # Flask backend (API + routes)
├── Templates/
│   ├── login.html         # Login/signup page
│   └── app.html           # Main application (SPA)
├── Static/
│   ├── css/style.css      # All styles
│   └── js/main.js         # Frontend logic
├── master_splitter.db     # SQLite database (auto-created)
├── requirements.txt       # Python dependencies
├── check_schema.py        # DB schema inspection utility
└── init_travel_db.py      # DB initialization with sample data
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/signup` | Register a new user |
| `POST` | `/api/login` | Log in |
| `POST` | `/api/logout` | Log out |
| `GET` | `/api/me` | Get current user |
| `GET` | `/api/trips` | List user's trips |
| `POST` | `/api/trips` | Create a trip |
| `GET` | `/api/trip_members/<id>` | Get trip participants |
| `GET` | `/api/expenses/<id>` | List trip expenses |
| `POST` | `/api/expenses` | Add an expense |
| `DELETE` | `/api/expenses/<id>` | Delete an expense |
| `GET` | `/api/balances/<id>` | Get balance summary |
| `GET` | `/api/health` | Health check |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | Random (per restart) | Flask session secret key |
| `FLASK_DEBUG` | `false` | Enable debug mode |
| `PORT` | `5000` | Server port |

## License

Private project.
