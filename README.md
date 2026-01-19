# YukBor Platform - Web Application

A logistics platform connecting cargo owners with transport providers in Uzbekistan.

## New Feature: Haydovchilarim (My Drivers)

This version includes a new feature for **LOGIST** role users to manage their invited drivers.

### Feature Highlights:
- ✅ View list of invited drivers
- ✅ See driver online/offline status
- ✅ View driver contact information and balance
- ✅ Check driver transport details and location
- ✅ Find suitable orders for specific drivers
- ✅ Send order offers to drivers directly
- ✅ Role-based visibility (ONLY for LOGIST role)

## Requirements

- Node.js 18+ or higher
- npm 9+ or higher

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create environment configuration:

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

3. Update environment variables in `.env`:

```env
VITE_API_URL=http://your-api-url/api
VITE_TELEGRAM_BOT_USERNAME=yukbor_global_bot
VITE_ENCRYPTION_KEY=your-secret-key-here
VITE_APP_ENV=development
```

## Running the Project

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Changes Made

### New Files:
- `src/pages/MyDriversPage.jsx` - Driver management page for LOGIST role

### Updated Files:
- `src/App.jsx` - Added MyDriversPage route
- `src/components/Navigation.jsx` - Added Haydovchilarim tab for LOGIST
- `src/components/CargoCard.jsx` - Added offer button functionality
- `src/pages/SearchPage.jsx` - Added driver filter support
- `src/services/api.js` - Added getMyInvitedUsers endpoint

## Features by Role

### Logist (Logistics Coordinator)
- View and manage cargo orders
- Browse available transport
- **Manage invited drivers (Haydovchilarim)** ← NEW
- **Find orders for drivers** ← NEW
- **Send offers to drivers** ← NEW
- Create harbinger notifications

### Driver
- View available cargo
- Manage transport availability
- Update driver status (online/offline)
- Receive job offers

### Shipper
- Create cargo orders
- Browse available transport
- View order status

## Technologies

- React 18.2.0
- React Router 6.20.0
- Vite 5.0.8
- Axios 1.6.0
- React Hot Toast 2.4.1
- React Hook Form 7.49.2
- Zod 3.22.4
- DOMPurify 3.0.8
- CryptoJS 4.2.0

## License

Proprietary
