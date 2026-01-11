# 👔 AI Wardrobe | Armario AR

A modern, AI-powered wardrobe management application that helps you organize your clothing, create outfits, and get personalized style recommendations.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Cloud-3FCF8E?logo=supabase&logoColor=white)

## ✨ Features

### 📦 Wardrobe Management
- **Add & Organize Clothing**: Upload photos and details of your clothing items
- **Categories & Filters**: Organize by category (tops, bottoms, footwear, accessories)
- **Favorites**: Mark your favorite pieces for quick access
- **Search & Filter**: Quickly find items with smart search and category filters

### 👗 Outfit Creation
- **Manual Outfit Builder**: Combine clothing items to create and save outfits
- **AI Outfit Generator**: Get AI-powered outfit suggestions based on occasion, weather, and mood
- **Outfit Tags**: Tag outfits for easy categorization (casual, formal, date night, etc.)
- **AI Upgrade Suggestions**: Get recommendations to improve existing outfits

### 🌟 Inspiration Feed
- **Community Feed**: Share your outfits and discover styles from others
- **Fit Checks**: Post outfit photos and get community feedback
- **For You Tab**: Personalized content based on your style preferences
- **Like System**: Engage with posts you love
- **Privacy Controls**: Choose what to share publicly

### 👤 Profile & Personalization
- **Style Preferences**: Select from 80+ style tags (streetwear, minimalist, y2k, etc.)
- **Body Measurements**: Optional height and weight for better recommendations
- **Bilingual Support**: Full English and Spanish localization

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (Lovable Cloud)
  - PostgreSQL database
  - Row Level Security (RLS)
  - Edge Functions
  - File Storage
- **AI**: Lovable AI integration for outfit generation
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Lovable account (for cloud features)

### Installation

1. Clone the repository:
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:8080](http://localhost:8080) in your browser.

## 📁 Project Structure

```
src/
├── components/
│   ├── inspiration/     # Inspiration feed components
│   ├── layout/          # Layout components (MainLayout, etc.)
│   ├── onboarding/      # User onboarding flow
│   ├── outfits/         # Outfit management components
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   └── wardrobe/        # Wardrobe management components
├── contexts/            # React contexts (Auth, Language)
├── hooks/               # Custom React hooks
├── integrations/        # External integrations (Supabase)
├── lib/                 # Utility functions and i18n
├── pages/               # Route pages
└── main.tsx             # App entry point

supabase/
├── functions/           # Edge Functions
│   ├── auth-proxy/      # Authentication proxy
│   ├── generate-outfit/ # AI outfit generation
│   ├── seed-inspiration/# Dev tool for sample data
│   ├── seed-test-clothing/
│   └── upgrade-outfit/  # AI outfit upgrade suggestions
└── migrations/          # Database migrations
```

## 🔐 Security

- **Row Level Security (RLS)**: All database tables are protected with RLS policies
- **Authentication**: Secure email/password authentication
- **Privacy**: Users control what content is shared publicly
- **Protected Endpoints**: Edge Functions require authentication

## 🌍 Localization

The app supports:
- 🇬🇧 English
- 🇪🇸 Spanish (Español)

Language can be changed in the profile settings.

## 🧪 Developer Tools

In development mode, the Profile page includes developer tools for:
- Seeding test clothing data
- Generating inspiration feed content

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using [Lovable](https://lovable.dev)
