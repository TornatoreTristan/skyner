export interface VerificationEmailData {
  userName: string
  verificationUrl: string
  expiresIn: string
}

export function getVerificationEmailHtml(data: VerificationEmailData): string {
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
              <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Vérifiez votre adresse email</h1>

              <p style="color: #4a5568; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Bonjour${data.userName ? ` ${data.userName}` : ''},
              </p>

              <p style="color: #4a5568; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Merci de vous être inscrit ! Pour compléter votre inscription, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.verificationUrl}" style="display: inline-block; background-color: #5469d4; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 6px;">
                      Vérifier mon email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #718096; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                Ce lien expirera dans ${data.expiresIn}.
              </p>

              <p style="color: #718096; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #a0aec0; font-size: 12px; line-height: 18px; margin: 0;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                <a href="${data.verificationUrl}" style="color: #5469d4; word-break: break-all;">${data.verificationUrl}</a>
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

export default getVerificationEmailHtml
