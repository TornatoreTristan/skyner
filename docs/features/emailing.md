# 📧 Système d'Emailing

Système d'envoi d'emails avec Resend, support des queues asynchrones et templates HTML.

## 🎯 Fonctionnalités

- ✅ Envoi synchrone et asynchrone via queue
- ✅ Templates HTML personnalisables
- ✅ Gestion des priorités (high, normal, low)
- ✅ Support des pièces jointes
- ✅ CC, BCC, Reply-To
- ✅ Tags pour tracking
- ✅ Retry automatique avec backoff exponentiel

## 📦 Configuration

### Variables d'environnement

```env
RESEND_API_KEY=re_your_api_key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Mon Application
```

## 🚀 Utilisation

### Envoi simple (synchrone)

```typescript
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import EmailService from '#mailing/services/email_service'

const emailService = getService<EmailService>(TYPES.EmailService)

await emailService.send({
  to: 'user@example.com',
  subject: 'Bienvenue !',
  html: '<h1>Bonjour</h1><p>Bienvenue sur notre plateforme</p>',
})
```

### Envoi asynchrone (via queue)

```typescript
const jobId = await emailService.queue({
  to: 'user@example.com',
  subject: 'Newsletter',
  html: '<p>Contenu de la newsletter</p>',
  priority: 'low',
  delay: 60000, // Délai en ms
})
```

### Templates prédéfinis

#### Welcome Email

```typescript
await emailService.sendWelcomeEmail('user@example.com', {
  userName: 'John Doe',
  loginUrl: 'https://app.example.com/login',
})
```

#### Password Reset Email

```typescript
await emailService.sendPasswordResetEmail('user@example.com', {
  userName: 'John Doe',
  resetUrl: 'https://app.example.com/reset/token123',
  expiresIn: '15 minutes',
})
```

### Options avancées

#### Destinataires multiples

```typescript
await emailService.send({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Notification',
  html: '<p>Message</p>',
})
```

#### CC et BCC

```typescript
await emailService.send({
  to: 'user@example.com',
  cc: 'manager@example.com',
  bcc: ['archive@example.com', 'audit@example.com'],
  subject: 'Rapport',
  html: '<p>Contenu du rapport</p>',
})
```

#### Pièces jointes

```typescript
await emailService.send({
  to: 'user@example.com',
  subject: 'Document',
  html: '<p>Voir pièce jointe</p>',
  attachments: [
    {
      filename: 'rapport.pdf',
      content: Buffer.from('...'), // ou base64 string
    },
  ],
})
```

#### Tags pour tracking

```typescript
await emailService.send({
  to: 'user@example.com',
  subject: 'Bienvenue',
  html: '<p>Message</p>',
  tags: {
    category: 'welcome',
    user_id: '123',
    campaign: 'onboarding',
  },
})
```

## 🎨 Créer un nouveau template

### 1. Créer le type

```typescript
// app/mailing/types/email.ts
export interface MyEmailData {
  userName: string
  actionUrl: string
}
```

### 2. Créer le template HTML

```typescript
// app/mailing/templates/my_email.ts
import type { MyEmailData } from '#mailing/types/email'

export function getMyEmailHtml(data: MyEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: sans-serif; background-color: #f6f9fc;">
  <table width="600" style="margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <tr>
      <td>
        <h1>Bonjour ${data.userName}</h1>
        <p>Votre message personnalisé ici.</p>
        <a href="${data.actionUrl}" style="display: inline-block; background-color: #5469d4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Action
        </a>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export default getMyEmailHtml
```

### 3. Ajouter une méthode au service (optionnel)

```typescript
// app/mailing/services/email_service.ts
async sendMyEmail(to: string, data: MyEmailData): Promise<EmailResult> {
  return this.send({
    to,
    subject: 'Mon Email',
    html: getMyEmailHtml(data),
    tags: { category: 'my-email' },
  })
}
```

## ⚙️ Queue et Retry

Les emails mis en queue bénéficient de :

- **3 tentatives** maximum
- **Backoff exponentiel** : 5s, 25s, 125s
- **Priorités** :
  - `high` = 1 (traité en premier)
  - `normal` = 2 (par défaut)
  - `low` = 3 (traité en dernier)

## 🔍 Monitoring

Les jobs d'email loggent automatiquement :

```
[SendEmailJob] Processing email to user@example.com
[SendEmailJob] Email sent successfully. ID: abc123
```

En cas d'erreur :

```
[SendEmailJob] Failed to send email: Invalid email address
```

## 📊 Architecture

```
app/mailing/
├── services/
│   └── email_service.ts       # Service principal
├── jobs/
│   └── send_email_job.ts      # Job queue processor
├── templates/
│   ├── welcome_email.ts       # Template bienvenue
│   └── password_reset_email.ts # Template reset password
└── types/
    └── email.ts               # Types TypeScript
```

## 🎯 Bonnes pratiques

1. **Toujours utiliser la queue** pour les envois non critiques
2. **Utiliser les tags** pour tracker les emails dans Resend
3. **Tester les templates** avec différentes tailles de données
4. **Limiter les pièces jointes** à 10MB max
5. **Valider les emails** avant envoi

## 🚨 Gestion d'erreurs

```typescript
const result = await emailService.send({...})

if (!result.success) {
  logger.error(`Email failed: ${result.error}`)
  // Gérer l'erreur
}
```

Pour les queues, les erreurs sont automatiquement retryées 3 fois avant d'échouer définitivement.

## 📝 Types disponibles

```typescript
interface SendEmailData {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: EmailAttachment[]
  tags?: Record<string, string>
}

interface EmailResult {
  id: string
  success: boolean
  error?: string
}

interface QueueEmailData extends SendEmailData {
  priority?: 'low' | 'normal' | 'high'
  delay?: number // en millisecondes
}
```

## 🔗 Ressources

- [Resend Documentation](https://resend.com/docs)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [HTML Email Best Practices](https://www.campaignmonitor.com/css/)