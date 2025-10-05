import { BaseCommand } from '@adonisjs/core/ace'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import QueueService from '#shared/services/queue_service'
import { sendEmailJob } from '#mailing/jobs/send_email_job'

export default class QueueListen extends BaseCommand {
  static commandName = 'queue:listen'
  static description = 'Listen to queue jobs and process them'

  async run() {
    const queueService = getService<QueueService>(TYPES.QueueService)

    this.logger.info('Starting queue worker...')

    // Register job processors
    queueService.registerProcessor('send-email', sendEmailJob, 'emails')

    this.logger.success('Queue worker started successfully')
    this.logger.info('Listening for jobs... Press CTRL+C to stop')

    // Keep the process running
    process.on('SIGINT', async () => {
      this.logger.info('Shutting down queue worker...')
      await queueService.closeAll()
      process.exit(0)
    })

    await new Promise(() => {})
  }
}
