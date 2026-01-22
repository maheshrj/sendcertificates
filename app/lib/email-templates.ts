export function getVerificationEmailTemplate(userName: string, verifyLink: string) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Email</title>

  <!-- Fira Sans -->
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600;700&display=swap" rel="stylesheet">

  <!-- Tell clients we support both -->
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">

  <!-- Dark mode ONLY when device is dark -->
  <style>
    @media (prefers-color-scheme: dark) {
      .bg-main {
        background-color: #121212 !important;
      }
      .container {
        background-color: #1a1a1a !important;
        border-color: #2a2a2a !important;
      }
      .text {
        color: #f1f1f1 !important;
      }
      .muted {
        color: #a0a0a0 !important;
      }
      .footer {
        color: #8a8a8a !important;
      }
    }
  </style>

  <!--[if mso]>
  <style>
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>

<body class="bg-main" style="margin:0; padding:0; background-color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#ffffff;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               class="container"
               style="border:1px solid #e6e6e6;
                      padding:40px 0;
                      background-color:#ffffff;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <img src="https://sendcertificates.s3.ap-south-1.amazonaws.com/SendCertificates+(Only+Logo).webp"
                   alt="SendCertificates"
                   width="178"
                   style="display:block;">
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center"
                class="text"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:28px;
                       font-weight:700;
                       color:#000000;
                       padding-bottom:16px;">
              Verify your email
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td align="center"
                class="text"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:14px;
                       line-height:22px;
                       color:#333333;
                       padding:0 60px 32px 60px;">
              Hi ${userName},<br><br>
              To complete your registration, click the<br>
              button below to verify your email address.<br>
              This link will expire in 24 hrs.
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                href="${verifyLink}"
                style="height:48px;v-text-anchor:middle;width:260px;"
                arcsize="25%" stroke="f" fillcolor="#0a4cff">
                <w:anchorlock/>
                <center style="color:#ffffff;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">
                  Verify your email
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${verifyLink}"
                 style="display:inline-block;
                        background:#0a4cff;
                        color:#ffffff;
                        font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                        font-size:14px;
                        font-weight:700;
                        line-height:48px;
                        text-align:center;
                        width:260px;
                        border-radius:12px;
                        text-decoration:none;">
                Verify your email
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Ignore text -->
          <tr>
            <td align="center"
                class="muted"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:12px;
                       line-height:18px;
                       color:#b3b3b3;
                       padding:0 60px 40px 60px;">
              If you did not create an account or didn't request<br>
              email verification, you can safely ignore and<br>
              delete this email.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                class="footer"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:11px;
                       line-height:16px;
                       color:#b3b3b3;
                       padding-bottom:6px;">
              Send Certificates is a simple tool to create and send certificates quickly.<br>
              You can design certificates and emails. Just upload a list of names & email,<br>
              and our system will create personalized certificates for everyone.
            </td>
          </tr>

          <tr>
            <td align="center"
                class="footer"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:11px;
                       color:#b3b3b3;">
              SendCertificates © All rights reserved
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getResetPasswordEmailTemplate(userName: string, resetLink: string) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>

  <!-- Fira Sans -->
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600;700&display=swap" rel="stylesheet">

  <!-- Theme support -->
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">

  <!-- Dark mode ONLY when device is dark -->
  <style>
    @media (prefers-color-scheme: dark) {
      .bg-main {
        background-color: #121212 !important;
      }
      .container {
        background-color: #1a1a1a !important;
        border-color: #2a2a2a !important;
      }
      .text {
        color: #f1f1f1 !important;
      }
      .muted {
        color: #a0a0a0 !important;
      }
      .footer {
        color: #8a8a8a !important;
      }
    }
  </style>

  <!--[if mso]>
  <style>
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>

<body class="bg-main" style="margin:0; padding:0; background-color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#ffffff;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               class="container"
               style="border:1px solid #e6e6e6;
                      padding:40px 0;
                      background-color:#ffffff;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <img src="https://sendcertificates.s3.ap-south-1.amazonaws.com/SendCertificates+(Only+Logo).webp"
                   alt="SendCertificates"
                   width="178"
                   style="display:block;">
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center"
                class="text"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:28px;
                       font-weight:700;
                       color:#000000;
                       padding-bottom:16px;">
              Forgot your password?
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td align="center"
                class="text"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:14px;
                       line-height:22px;
                       color:#333333;
                       padding:0 60px 32px 60px;">
              Hi ${userName},<br><br>
              To reset your password, click the<br>
              button below. The link will expire<br>
              automatically in 24 hrs.
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                href="${resetLink}"
                style="height:48px;v-text-anchor:middle;width:260px;"
                arcsize="25%" stroke="f" fillcolor="#0a4cff">
                <w:anchorlock/>
                <center style="color:#ffffff;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">
                  Reset your password
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${resetLink}"
                 style="display:inline-block;
                        background:#0a4cff;
                        color:#ffffff;
                        font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                        font-size:14px;
                        font-weight:700;
                        line-height:48px;
                        text-align:center;
                        width:260px;
                        border-radius:12px;
                        text-decoration:none;">
                Reset your password
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Ignore text -->
          <tr>
            <td align="center"
                class="muted"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:12px;
                       line-height:18px;
                       color:#b3b3b3;
                       padding:0 60px 40px 60px;">
              If you did not request a password reset,<br>
              you can safely ignore and delete<br>
              this email.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                class="footer"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:11px;
                       line-height:16px;
                       color:#b3b3b3;
                       padding-bottom:6px;">
              Send Certificates is a simple tool to create and send certificates quickly.<br>
              You can design certificates and emails. Just upload a list of names & email,<br>
              and our system will create personalized certificates for everyone.
            </td>
          </tr>

          <tr>
            <td align="center"
                class="footer"
                style="font-family:'Fira Sans', Arial, Helvetica, sans-serif;
                       font-size:11px;
                       color:#b3b3b3;">
              SendCertificates © All rights reserved
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
