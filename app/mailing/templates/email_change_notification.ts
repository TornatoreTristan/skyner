export interface EmailChangeNotificationData {
  userName: string
  oldEmail: string
  newEmail: string
  changeDate: string
}

export function getEmailChangeNotificationHtml(data: EmailChangeNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Votre adresse email a été modifiée</h1>

              <p style="color: #4a5568; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Bonjour${data.userName ? ` ${data.userName}` : ''},
              </p>

              <p style="color: #4a5568; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Ceci est une notification de sécurité pour vous informer que l'adresse email associée à votre compte a été modifiée le ${data.changeDate}.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="color: #2d3748; font-size: 14px; line-height: 20px; margin: 0 0 10px 0;">
                      <strong>Ancienne adresse :</strong> ${data.oldEmail}
                    </p>
                    <p style="color: #2d3748; font-size: 14px; line-height: 20px; margin: 0;">
                      <strong>Nouvelle adresse :</strong> ${data.newEmail}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #4a5568; font-size: 16px; line-height: 24px; margin: 20px 0;">
                Si vous n'avez pas effectué ce changement, veuillez contacter notre support immédiatement car votre compte pourrait être compromis.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef5e7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
                      <strong>⚠️ Mesure de sécurité :</strong> Si ce n'était pas vous, changez immédiatement votre mot de passe et contactez-nous.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #718096; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                Cet email a été envoyé à votre ancienne adresse pour des raisons de sécurité.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export default getEmailChangeNotificationHtml
