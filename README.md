> [!CAUTION]
> Kyro is under active development and may be unstable. 

# Kyro ⚡️

**Modern, High-Performance Server Management**

![Bun](https://img.shields.io/badge/Bun-1.2.10+-black?style=for-the-badge&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

[![License](https://img.shields.io/github/license/LydonDev/KYRO?style=flat-square)](https://github.com/LydonDev/KYRO/blob/main/LICENSE)
[![Discord](https://img.shields.io/discord/1302020587316707420?style=flat-square)](https://discord.gg/D8YbT9rDqz)

---

## 📖 Overview

Kyro is a high-performance, modern, and user-friendly server management platform—an alternative to Pterodactyl—designed for speed, reliability, and great UX. It features a fast Bun backend, modern Vite-powered frontend, integrated CLI, role-based permissions, and more.

---

## 🎁 Dependencies

- [Bun](https://bun.sh) (v1.2.10 or newer)
- [Node.js](https://nodejs.org) (for frontend dependencies)
- [Docker](https://www.docker.com) (optional, for containers)
- [Git](https://git-scm.com)
- [Unzip](https://www.info-zip.org/UnZip.html)
- [Resend API key](https://resend.com) (for email verification)

---

## 💾 Installation

1. **Clone the repositories:**
   ```bash
   git clone https://github.com/LydonDev/KRYPTON.git
   git clone https://github.com/LydonDev/KYRO.git
   ```
2. **Install dependencies in each repo:**
   ```bash
   cd KRYPTON
   bun install
   cd ../KYRO
   bun install
   ```
3. **Configure environment:**
   - Copy `.env.example` to `.env` in each repo and fill in required values (see docs for details).
4. **(Optional) Prepare Docker:**
   - If using Docker, follow instructions in the `docker/` directory.

---

## 🚀 Running Kyro

1. **Start the backend:**
   ```bash
   bun run start
   ```
2. **Start the frontend:**
   ```bash
   cd core
   bun run dev
   ```
3. **Access Kyro:**
   - Open your browser and navigate to the URL shown in the terminal (default: http://localhost:5173)

---

## 🧩 Features

- ⚡️ Fast backend powered by Bun
- 🛠 Integrated CLI for migrations, database, and utilities
- 🗄 SQLite database (portable, easy setup)
- 🎨 Modern UI/UX (Vite frontend in `/core`)
- 🔒 Full authentication (JWT, email verification)
- 🧑‍💼 Role-based permissions and access control
- 🖥 Server, project, node, and unit management
- 📦 Easy deployment and migration tools

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Contribution Guidelines:**
- Follow Bun/TypeScript best practices
- Write unit tests for new features
- Maintain clean, readable code
- Update documentation as needed

---

## ❓ FAQ

- **Kyro feels slow or laggy!**
  - Clear your browser cache/cookies, ensure you are running in production mode, and check your system resources. Running on older hardware or with too many background processes may impact speed.

- **How do I change the panel's name?**
  - Set the `VITE_APP_NAME` variable in all `.env` files to your desired name. This will also rename all Kyro commands and require you to stop all running Kyro processes and rename your Kyro database accordingly.

- **Can I install a theme or plugins?**
  - Not at this time. Kyro does not currently support themes or plugins. To customize the look, you must manually edit the frontend files.

- **How do I set up email verification?**
  - Register a Resend account for an API key and link your domain to Resend. This enables email verification for user registration and password resets.

- **The application won't start. What should I check?**
  - Ensure all dependencies are installed with `bun install` in each repo (`KRYPTON`, `KYRO`, and `core`). Verify your `.env` files are present and correctly configured. Check the logs with `kyro logs` for specific errors.

- **How do I contribute to Kyro?**
  - Fork the repository, create a new branch, and submit a pull request. Ensure your code follows the existing style and includes tests where appropriate.

- **How do I update Kyro to the latest version?**
  - Pull the latest changes from the repository, reinstall dependencies with `bun install`, and run any new migrations with `kyro migrate --force`.

- **Where can I get help or report bugs?**
  - Open an issue on the GitHub repository or check the Discussions section for community support.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  Made with ❤️ by the Kyro Team
</div>

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



(C) This dashboard is provided free of charge, with no warranties, support, or liability. You are welcome to use, modify, and share this project for any purpose, commercial or non-commercial. Attribution is appreciated but not required. Please respect the spirit of open source—do not sell this project as your own proprietary work.

---
