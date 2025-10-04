# ✈️ Skyner - Flight Price Tracker

> Application intelligente de suivi et d'analyse des prix de billets d'avion

[![AdonisJS](https://img.shields.io/badge/AdonisJS-6.x-purple.svg)](https://adonisjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)

**Project start:** 4 oct 2025 | **Last update:** 4 oct 2025 | **Version:** 0.0.1

## 🎯 Objectif

Skyner permet de suivre l'évolution des prix des billets d'avion pour trouver le meilleur moment pour réserver vos voyages. L'application analyse quotidiennement les tarifs de toutes les compagnies aériennes et vous alerte des bons plans.

## ✨ Fonctionnalités

### 🔍 Recherche & Suivi

- **Recherche multi-critères** - Dates flexibles, budget max, compagnies préférées
- **Comparateur de prix** - Toutes les compagnies en temps réel
- **Destinations favorites** - Sauvegardez vos recherches personnalisées
- **Historique de prix** - Courbes d'évolution sur plusieurs mois

### 📊 Analytics & Insights

- **Tendances de prix** - Visualisation graphique de l'évolution
- **Périodes optimales** - Algorithme de détection des meilleurs moments
- **Prédictions** - Estimation des variations futures basée sur l'historique
- **Statistiques** - Prix moyen, min/max, volatilité par destination

### 🔔 Alertes Intelligentes

- **Alertes prix** - Notification quand le prix passe sous votre seuil
- **Bons plans** - Détection automatique des promotions
- **Alertes tendances** - "Le prix va probablement augmenter bientôt"
- **Notifications multi-canal** - Email, push, in-app

### ⚡ Automatisation

- **Scan quotidien** - Vérification automatique de tous vos suivis
- **Multi-sources** - Agrégation de plusieurs APIs (Amadeus, Skyscanner, Kiwi)
- **Cache intelligent** - Optimisation des requêtes avec Redis
- **Jobs planifiés** - Bull queues pour le scraping asynchrone

## 🛠️ Stack Technique

### Backend

- **Framework:** AdonisJS 6 + TypeScript
- **Base de données:** PostgreSQL avec Lucid ORM
- **Cache:** Redis avec stratégie de tags
- **Queues:** Bull pour les jobs asynchrones
- **DI Container:** Inversify pour l'injection de dépendances

### APIs de Vols

- **Amadeus API** - Données officielles des compagnies
- **Skyscanner API** - Agrégateur de vols
- **Kiwi.com (Tequila API)** - Low-cost et charter
- **Google Flights** - Scraping complémentaire (optionnel)

### Frontend

- **Framework:** Inertia.js + React 19
- **UI:** TailwindCSS 4 + Radix UI
- **Charts:** Recharts pour les graphiques de prix
- **State:** React Query pour le cache client

### Infrastructure

- **Authentification:** Sessions sécurisées + Google OAuth
- **Notifications:** Système personnalisable avec templates
- **Rate Limiting:** Protection contre les abus
- **Tests:** Japa avec couverture complète

## 🚀 Installation

### Prérequis

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optionnel)

### Installation rapide

```bash
# 1. Clone et installation
git clone https://github.com/TornatoreTristan/skyner.git
cd skyner
npm install

# 2. Configuration
cp .env.example .env
# Configurez vos clés API (Amadeus, Skyscanner, etc.)
node ace generate:key

# 3. Services (Docker)
docker-compose up -d

# 4. Base de données
node ace migration:run

# 5. Démarrage
npm run dev
```

L'application sera accessible sur `http://localhost:3333`

## 🏗️ Architecture du Projet

```
app/
├── auth/                 # Authentification & OAuth
├── users/               # Gestion utilisateurs
├── flights/             # Module principal vols
│   ├── models/          # Flight, PriceHistory
│   ├── services/        # FlightSearchService, PriceTrackerService
│   ├── jobs/            # DailyPriceScanJob
│   └── repositories/    # FlightRepository, PriceHistoryRepository
├── destinations/        # Destinations favorites
│   ├── models/          # Destination, SearchPreference
│   └── services/        # DestinationService
├── alerts/              # Système d'alertes
│   ├── models/          # Alert, AlertRule
│   ├── services/        # AlertService, NotificationService
│   └── jobs/            # AlertCheckJob
├── analytics/           # Tendances & prédictions
│   ├── services/        # TrendAnalysisService, PredictionService
│   └── types/           # AnalyticsData, Trend
├── integrations/        # APIs externes
│   ├── amadeus/         # AmadeusClient
│   ├── skyscanner/      # SkyscannerClient
│   └── kiwi/            # KiwiClient
├── shared/              # Code partagé
│   ├── container/       # IoC Container
│   ├── repositories/    # BaseRepository
│   ├── services/        # CacheService, QueueService
│   └── exceptions/      # Gestion erreurs
└── notifications/       # Système de notifications
```

## 📊 Modèle de Données (Simplifié)

```typescript
// Destination favorite
Destination {
  id, userId, origin, destination,
  flexibility, maxBudget, preferences
}

// Vol trouvé
Flight {
  id, destinationId, airline, price,
  departureDate, returnDate, url
}

// Historique de prix
PriceHistory {
  id, flightId, price, scannedAt
}

// Alerte personnalisée
Alert {
  id, userId, destinationId,
  priceThreshold, active
}
```

## 🔧 Configuration APIs

### Amadeus API (Gratuit jusqu'à 2000 req/mois)

```env
AMADEUS_API_KEY=your_api_key
AMADEUS_API_SECRET=your_api_secret
```

### Skyscanner API

```env
SKYSCANNER_API_KEY=your_api_key
```

### Kiwi.com API

```env
KIWI_API_KEY=your_api_key
```

## 🧪 Tests

```bash
# Tous les tests
npm run test

# Tests avec watch (TDD)
npm run test -- --watch

# Tests spécifiques
npm run test -- --grep "FlightService"
```

## 📈 Roadmap

### Phase 1 - MVP (v0.1) - En cours

- [ ] Authentification utilisateur
- [ ] Intégration Amadeus API
- [ ] Recherche de vols basique
- [ ] Sauvegarde de destinations
- [ ] Historique de prix
- [ ] Graphiques d'évolution

### Phase 2 - Alertes (v0.2)

- [ ] Système d'alertes prix
- [ ] Jobs quotidiens de scan
- [ ] Notifications email
- [ ] Détection de bons plans

### Phase 3 - Analytics (v0.3)

- [ ] Analyse de tendances
- [ ] Périodes optimales
- [ ] Prédictions de prix
- [ ] Statistiques avancées

### Phase 4 - Multi-sources (v0.4)

- [ ] Intégration Skyscanner
- [ ] Intégration Kiwi.com
- [ ] Agrégation multi-sources
- [ ] Comparaison de prix

### Phase 5 - Mobile (v0.5)

- [ ] API REST complète
- [ ] Application mobile React Native
- [ ] Push notifications
- [ ] Mode hors-ligne

## 📖 Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Flight APIs Integration](docs/integrations/flight-apis.md)
- [Price Tracking Algorithm](docs/features/price-tracking.md)
- [Alert System](docs/features/alerts.md)
- [Analytics & Predictions](docs/features/analytics.md)

## 🤝 Contribution

Ce projet est personnel mais les contributions sont bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

**Développé avec ❤️ par Tristan Tornatore**
