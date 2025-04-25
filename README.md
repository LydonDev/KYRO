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

## Frequently Asked Questions (FAQ)

- **Why is the panel so slow?**
  - Kyro is built with a modern frontend (Vite) and a fast backend (Bun). If you experience performance issues, try clearing your browser cache/cookies, ensure you are running in production mode, and check your system resources. Running on older hardware or with too many background processes may impact speed.

- **How do I change the panel's name?**
  - Set the `VITE_APP_NAME` variable in all `.env` files to your desired name. **Note:** This will also rename all Kyro commands and require you to stop all running Kyro processes and rename your Kyro database accordingly.

- **Can I install a theme or plugins?**
  - Not at this time. Kyro does not currently support themes or plugins. To customize the look, you must manually edit the frontend files.

- **How do I set up email verification?**
  - You must register a resend account for an api key and register a domain and link it to resend. This enables email verification for user registration and password resets.

- **The application won't start. What should I check?**
  - Ensure all dependencies are installed with `bun install` in each repo (`KRYPTON`, `KYRO`, and `core`). Also, verify your `.env` files are present and correctly configured. Check the logs with `kyro logs` for specific errors.

- **How do I contribute to Kyro?**
  - Fork the repository, create a new branch for your changes, and submit a pull request. Please ensure your code follows the existing style and includes tests where appropriate.

- **How do I update Kyro to the latest version?**
  - Pull the latest changes from the repository, reinstall dependencies with `bun install`, and run any new migrations with `kyro migrate --force`.

- **Where can I get help or report bugs?**
  - Open an issue on the GitHub repository or check the Discussions section for community support.

- **Can I run Kyro in Docker?**
  - Yes, Docker is supported for running containers. See the installation section for details.

- **Is there a way to clear logs?**
  - Yes, use the command `kyro logs clear` to clear all Kyro logs.

If your question is not answered here, please refer to the documentation or open an issue on GitHub.

---

## License

(C) This dashboard is provided free of charge, with no warranties, support, or liability. You are welcome to use, modify, and share this project for any purpose, commercial or non-commercial. Attribution is appreciated but not required. Please respect the spirit of open source—do not sell this project as your own proprietary work.

---
