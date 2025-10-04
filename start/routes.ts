import router from '@adonisjs/core/services/router'

// Import all routes files
import './routes/auth_routes.js'
import './routes/session_routes.js'
import './routes/google_auth_routes.js'
import './routes/email_verification_routes.js'
import './routes/notification_routes.js'
import './routes/upload_routes.js'
import { middleware } from './kernel.js'

router.on('/').renderInertia('home')

// Route temporaire pour tester le middleware
router
  .get('/debug/current-organization', async ({ organization, response }) => {
    return response.json({
      id: organization.id,
      name: organization.name,
    })
  })
  .use([middleware.auth(), middleware.organizationContext()])
