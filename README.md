# Renew Dental Clinic Management System

A comprehensive web application for managing dental clinic operations, including appointment scheduling, patient records, and automated SMS reminders.

## Features

- **Daily Agenda & Weekly View**: Efficiently manage and visualize clinic schedules.
- **Patient Management**: Centralized database for patient records and history.
- **Automated SMS Reminders**: Reliability-tested notification system with 24h, 2h, and 1h alerts.
- **Secure Authentication**: Role-based access control for clinic staff.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Radix UI.
- **Backend**: Node.js, Express, MySQL.
- **Tools**: node-cron (for reminders), Textbee API (for SMS).

## Getting Started

### Prerequisites

- Node.js & npm
- MySQL Database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd renewdental-a87f972d
   ```

2. **Frontend Setup**
   ```bash
   npm install
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

### Running the Application

- **Frontend (Root Level)**:
  ```bash
  npm run dev
  ```

- **Backend (Backend Directory)**:
  ```bash
  npm run dev
  ```

## Development

Pushed changes are automatically integrated. For reminder service diagnostics, use `npm run diagnose-reminders` in the backend directory.
