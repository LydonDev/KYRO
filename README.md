# KYRO

Kyro is a high-performance, modern, and user-friendly server management platform—an alternative to Pterodactyl—designed for speed, reliability, and great UX.

---

## Features

- **Fast backend** powered by Bun
- **Integrated CLI** for migrations, database management, and utilities
- **SQLite** database (easy to set up, portable)
- **Modern UI/UX** (frontend in `/core`)
- **Full authentication** with JWT and email verification (Resend API)
- **Role-based permissions** and access control
- **Server management** (create, update, power actions, etc.)
- **Project, node, and unit management**

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.2.10 or newer)
- [Node.js](https://nodejs.org) (for some frontend dependencies)
- [Docker](https://www.docker.com) (optional, for running containers)
- [Git](https://git-scm.com) (for version control)
- [Unzip](https://www.info-zip.org/UnZip.html) (for extracting files)
- [Resend API key](https://resend.com) (for email verification)

### Installation

1. **Clone the repositories:**

   ```bash
   git clone https://github.com/LydonDev/KRYPTON.git
   git clone https://github.com/LydonDev/KYRO.git
   ```

2. **Install dependencies:**

   ```bash
   cd KRYPTON
   bun install
   cd ../KYRO
   bun install
   cd core
   bun install
   ```

3. **Copy environment variables:**

   ```bash
   cd ../KRYPTON
   cp .env.example .env
   cd ../KYRO
   cp .env.example .env
   cd core
   cp .env.example .env
   ```

4. **Run migrations:**

   ```bash
   cd ../KYRO
   kyro unit seed
   kyro migrate --force
   ```

5. **Run the application:**

   - **Development:**

     ```bash
     kyro development
     ```

   - **Production:**

     ```bash
     kyro production
     ```

6. **Configure Krypton:**

   ```bash
   cd ../KRYPTON
   bun run configure
   ```

---

## Usage

- Access the UI at [http://localhost:5173](http://localhost:5173) (default)
- Use the CLI (`kyro --help`) for migrations, DB management, and utilities
- Authenticate via email (verification required)
- Manage servers, projects, nodes, units from the web UI or API
- Logs will be created for kyro backend, frontend and kyro and are viewable with `kyro logs` and clearable with `kyro logs clear`

---

## Configuration

- **.env** files are required in both `KYRO` and `KRYPTON` directories. Example files are provided as `.env.example`.
- **RESEND_API_KEY** is required for email verification (set `RESEND_API_KEY` in `.env`).
- **VITE_APP_NAME** Can be set in enviroment variables to set the name of the application (IE change kyro to wtv you would want)

---

## Authentication & Permissions

- JWT-based authentication
- Email verification required (Resend integration)
- Role-based permissions (admin & user)
- Password reset and email notifications

---

## Questions & Answers

- **Why is the panel so slow?**
  - The panel is built with a modern frontend framework (Vite) and a fast backend (Bun). If you're experiencing performance issues, try clearing your browser cache and cookies and running in production mode.
- **How do i name the panel?**
  - You can go into all the envs and set VITE_APP_NAME to set the name of the application **THIS WILL ALSO RENAME ALL THE KYRO COMMANDS AND YOU WIL NEED TO MAKE SURE TO STOP EVERYTHING AND ALSO RENAME THE Kyro DATABASE**
- **Can i install a theme?**
  - No, Kyro does not currently support Addons or such themes, if you would like to change the theme you will need to do so manually by editing each file.
- **

---

## License

(C) This dashboard is provided free of charge, with no warranties, support, or liability. You are welcome to use, modify, and share this project for any purpose, commercial or non-commercial. Attribution is appreciated but not required. Please respect the spirit of open source—do not sell this project as your own proprietary work.

---
