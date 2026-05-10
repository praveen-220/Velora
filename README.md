<<<<<<< HEAD
# Velora 🚗✨

Velora is a next-generation ride-sharing and carpooling platform tailored for the Indian market. It combines the speed and reliability of services like **Uber** and **Rapido** with the cost-effective intercity carpooling model of **BlaBlaCar**.

![Velora Gold Logo](frontend/public/velora_gold_logo.png)

## 🚀 Features

- **Premium UI/UX**: minimalist, high-tech design inspired by Uber's design language.
- **Dual-Mode Platform**: Seamlessly switch between **Booking a Ride** and **Offering a Ride** (Carpooling).
- **Secure Authentication**: 
  - Phone/Email OTP verification via **Nodemailer**.
  - **Google OAuth** integration for quick signup.
- **Real-Time Experience**: Live driver tracking using **Socket.io**.
- **Dual Database Support**: 
  - **MongoDB Atlas** for flexible, fast ride and user data.
  - **PostgreSQL** (Sequelize) for structured transaction and identity data.
- **Multi-Platform**:
  - **Web**: Next.js (ReactJS) with Vanilla CSS.
  - **Mobile**: React Native (Android & iOS) with shared TypeScript logic.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, Vanilla CSS.
- **Backend**: Node.js, Express, TypeScript.
- **Mobile**: React Native, TypeScript.
- **Databases**: MongoDB Atlas, PostgreSQL.
- **Real-time**: Socket.io.
- **Mailing**: Nodemailer (Gmail App Passwords).
- **Authentication**: JWT, Google OAuth 2.0.

## 📦 Project Structure

```text
Velora/
├── frontend/           # Next.js 14 Web Application
├── backend/            # Express TypeScript API
└── mobile/             # React Native Mobile Application
```

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account
- Google Cloud Console Account (for OAuth)

### 2. Backend Setup
1. Navigate to `/backend`.
2. Create a `.env` file based on the provided template.
3. Add your `MONGODB_URI`, `GOOGLE_CLIENT_ID`, and `EMAIL_PASS`.
4. Run:
   ```bash
   npm install
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to `/frontend`.
2. Run:
   ```bash
   npm install
   npm run dev
   ```
3. Visit `http://localhost:3000`.

### 4. Mobile Setup
1. Navigate to `/mobile/VeloraMobile`.
2. Run:
   ```bash
   npm install
   npx react-native run-android  # or run-ios
   ```

## 🛡️ Safety & Roadmap
- [ ] **KYC Verification**: Aadhaar-based identity checks for carpoolers.
- [ ] **Payment Gateway**: Seamless Razorpay integration for Indian UPI/Cards.
- [ ] **In-App Chat**: Secure communication between riders and drivers.

---
Built with ❤️ for the future of travel in India.
=======
# Velora Ultimate Mobility Platform

Velora is a premium, full-stack ride-sharing platform built for scalability and performance.

## 🚀 Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB (Mongoose)
- **Auth**: Firebase Authentication (OTP Support)

## 📂 Folder Structure
- `/client`: Next.js frontend with App Router and Tailwind.
- `/server`: Express backend with TypeScript and Clean Architecture.

## 🛠️ Getting Started

### 1. Backend Setup
```bash
cd server
npm install
# Copy .env.example to .env and fill in your keys
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```

## ✨ Key Features
- **Intelligent Pricing**: Real-time distance and tenure-based fare calculation.
- **Verified Network**: Mandatory driver document verification.
- **Premium UI**: Glassmorphism, smooth animations, and dark mode.
- **Real Maps**: Interactive Leaflet/Google Maps integration with real road paths.
- **Wallet Ecosystem**: Digital wallet for seamless, cash-free transactions.
>>>>>>> d4dae3e02ee3628f59b1a4f5bf3a09846ca47b54
