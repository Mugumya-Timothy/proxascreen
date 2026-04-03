package services

import (
	"fmt"

	resend "github.com/resend/resend-go/v2"
)

const fromAddress = "ProxaScreen <noreply@proxascreen.me>"

type EmailService struct {
	client *resend.Client
	appURL string
}

func NewEmailService(resendAPIKey, appURL string) *EmailService {
	return &EmailService{client: resend.NewClient(resendAPIKey), appURL: appURL}
}

// SendWelcomeEmail sends a clinician their account credentials and instructs
// them to reset their password on first login.
func (s *EmailService) SendWelcomeEmail(to, fullName, tempPassword string) error {
	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    fromAddress,
		To:      []string{to},
		Subject: "Welcome to ProxaScreen — your account is ready",
		Html:    welcomeHTML(fullName, to, tempPassword, s.appURL),
	})
	if err != nil {
		return fmt.Errorf("send welcome email: %w", err)
	}
	return nil
}

// SendPasswordResetConfirmationEmail notifies the user that their password
// was changed successfully.
func (s *EmailService) SendPasswordResetConfirmationEmail(to, fullName string) error {
	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    fromAddress,
		To:      []string{to},
		Subject: "ProxaScreen — your password has been updated",
		Html:    passwordResetHTML(fullName, s.appURL),
	})
	if err != nil {
		return fmt.Errorf("send password reset confirmation: %w", err)
	}
	return nil
}

// ── HTML templates ────────────────────────────────────────────────────────────

func emailBase(title, previewText, bodyContent, appURL string) string {
	year := "2026"
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>%s</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin:0; padding:0; background:#f0f9fe; font-family:'Inter',ui-sans-serif,system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
    a { color:#5FB0E3; text-decoration:none; }
  </style>
</head>
<body>
  <span style="display:none;max-height:0;overflow:hidden;">%s</span>
  <table width="100%%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f9fe;padding:48px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(87,190,235,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#5FB0E3 0%%,#2aa8dd 100%%);padding:36px 40px 32px;">
            <table width="100%%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <p style="margin:0;font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">ProxaScreen</p>
                  <p style="margin:4px 0 0;font-family:'Inter',sans-serif;font-size:12px;color:rgba(255,255,255,0.80);letter-spacing:0.3px;text-transform:uppercase;">Prostate Cancer Risk Assessment</p>
                </td>
                <td align="right">
                  <div style="width:40px;height:40px;background:rgba(255,255,255,0.20);border-radius:10px;display:inline-block;line-height:40px;text-align:center;font-size:20px;">🩺</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            %s
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f9fe;border-top:1px solid #bbe3f8;padding:24px 40px;">
            <table width="100%%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <p style="margin:0;font-family:'Inter',sans-serif;font-size:12px;color:#8dd0f3;">
                    © %s ProxaScreen &nbsp;·&nbsp; This is an automated message, please do not reply.
                  </p>
                </td>
                <td align="right">
                  <a href="%s/sign-in" style="font-family:'Inter',sans-serif;font-size:12px;color:#5FB0E3;">Sign in →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`, title, previewText, bodyContent, year, appURL)
}

func welcomeHTML(fullName, email, tempPassword, appURL string) string {
	loginURL := appURL + "/sign-in"
	body := fmt.Sprintf(`
    <p style="margin:0 0 20px;font-family:'Inter',sans-serif;font-size:16px;color:#111827;">
      Hi <strong>%s</strong>,
    </p>
    <p style="margin:0 0 28px;font-family:'Inter',sans-serif;font-size:15px;color:#374151;line-height:1.7;">
      Your clinician account on <strong>ProxaScreen</strong> has been created by an administrator.
      Use the credentials below to sign in and complete your setup.
    </p>

    <!-- Credentials card -->
    <table width="100%%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f9fe;border:1.5px solid #bbe3f8;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 12px;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:#2aa8dd;text-transform:uppercase;letter-spacing:0.08em;">Your Login Credentials</p>
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding:4px 0;font-family:'Inter',sans-serif;font-size:13px;color:#6b7280;width:160px;">Email address</td>
              <td style="padding:4px 0;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;color:#111827;">%s</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-family:'Inter',sans-serif;font-size:13px;color:#6b7280;">Temporary password</td>
              <td style="padding:4px 0;">
                <span style="font-family:'Courier New',monospace;background:#bbe3f8;color:#1872a0;padding:3px 10px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.5px;">%s</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Warning -->
    <table width="100%%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff8e1;border:1.5px solid #fcd34d;border-radius:12px;margin-bottom:32px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-family:'Inter',sans-serif;font-size:13px;color:#92400e;line-height:1.6;">
            ⚠️ <strong>Action required:</strong> You will be prompted to reset your password on first login. Please do so immediately.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA button -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
      <tr>
        <td style="background:linear-gradient(135deg,#5FB0E3 0%%,#2aa8dd 100%%);border-radius:10px;">
          <a href="%s" style="display:inline-block;padding:14px 36px;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px;">Sign In to ProxaScreen →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:'Inter',sans-serif;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you have any issues accessing your account, please contact your system administrator. If the button above doesn't work, copy this link into your browser:<br>
      <a href="%s" style="color:#5FB0E3;word-break:break-all;">%s</a>
    </p>`, fullName, email, tempPassword, loginURL, loginURL, loginURL)

	return emailBase("Welcome to ProxaScreen", "Your ProxaScreen clinician account is ready — sign in now.", body, appURL)
}

func passwordResetHTML(fullName, appURL string) string {
	loginURL := appURL + "/sign-in"
	body := fmt.Sprintf(`
    <p style="margin:0 0 20px;font-family:'Inter',sans-serif;font-size:16px;color:#111827;">
      Hi <strong>%s</strong>,
    </p>

    <!-- Success card -->
    <table width="100%%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0fdf6;border:1.5px solid #86efac;border-radius:12px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;color:#166534;">
            ✅ Your password has been updated successfully.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 28px;font-family:'Inter',sans-serif;font-size:15px;color:#374151;line-height:1.7;">
      Your ProxaScreen account password was just changed. You can continue using the platform with your new credentials.
    </p>

    <!-- CTA button -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
      <tr>
        <td style="background:linear-gradient(135deg,#5FB0E3 0%%,#2aa8dd 100%%);border-radius:10px;">
          <a href="%s" style="display:inline-block;padding:14px 36px;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px;">Go to ProxaScreen →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:'Inter',sans-serif;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you did not make this change, please contact your system administrator immediately.
    </p>`, fullName, loginURL)

	return emailBase("ProxaScreen — Password Updated", "Your ProxaScreen password has been changed successfully.", body, appURL)
}
