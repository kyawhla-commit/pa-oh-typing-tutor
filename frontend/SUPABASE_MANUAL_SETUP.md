# Supabase: remaining manual setup

Prepared on 6 October 2026. You can test locally before publishing the app.

## Already completed

- Supabase project **typing**, reference `tuulerfxlnehpwcqgqup`, is linked to the CLI.
- All three database migrations are applied and recorded.
- Database checks verified RLS on six application tables, blocked anonymous access to private learner tables, and rejected forged ownership and non-admin lesson writes.
- Email sign-up is enabled; email confirmation remains enabled.
- Google Cloud project **Pa-O Typing Tutor**, ID `pa-o-typing-tutor`, exists.
- Web OAuth client **Typing Tutor Web** is created and configured in Supabase.
- Google audience is **External**, publishing status **Testing**.
- `bwarpay.bp8@gmail.com` is saved as a Google test user.
- Local Supabase Auth configuration:
  - Site URL: `http://127.0.0.1:5173`
  - Redirect allow list: `http://127.0.0.1:5173/**` and `http://localhost:5173/**`

Google browser sign-in, learner data sync across browsers, and email delivery still need verification. Custom SMTP is not configured.

## Demo User and Admin password accounts

Dedicated, email-confirmed Supabase demo accounts are now provisioned through the [server-side Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser). Their private credentials are in `DEMO_ACCOUNTS.local.md` (ignored by Git). Restart the development server, open `/login`, and use **Demo user login** or **Demo admin login**. These buttons authenticate real Supabase accounts; the admin has lesson-management access. They are excluded from production builds and pilot mode.

Both password accounts were verified against Supabase and through the app's browser buttons. The user reached the dashboard and was denied admin access; the admin reached the shared lesson workspace. Both workspaces reported cloud data synced.

The `.example` email addresses are test identifiers and do not receive messages. Password login works without custom SMTP; recovery email does not work for these addresses. Demo activity is saved in the real project. Sign out before trying the other account.

## 1. Test Google sign-in in Firefox

- [ ] Open a terminal in the frontend directory:

  ```sh
  cd /home/kyawhla/Desktop/workspace/test/other/webAppCollection/typingTutor/pa-oh-typing-tutor/frontend
  pnpm dev --strictPort --port 5173
  ```

  If Vite is already running on this port, use the existing server. Keep its terminal open.

- [ ] In **Firefox**, open [the local login page](http://127.0.0.1:5173/login).
- [ ] Click **Continue with Google**.
- [ ] Choose `bwarpay.bp8@gmail.com` and complete Google's sign-in/consent prompts.
- [ ] Confirm you return to the typing tutor dashboard and the app shows your signed-in account.
- [ ] Refresh the page and confirm you remain signed in.
- [ ] Sign out and sign in again to check the flow repeats successfully.

The Codex in-app browser previously failed during the redirect with `ERR_QUIC_PROTOCOL_ERROR`. Terminal requests also returned `ECONNREFUSED`. Firefox reached the Supabase endpoint successfully, so use Firefox for this check. The cause of the other connection failures has not been established.

## 2. Verify learner data sync

- [ ] While signed in, change a preference and complete a short lesson or typing session. Save a Test result if testing the manual Test-save flow.
- [ ] Open the [Supabase project](https://supabase.com/dashboard/project/tuulerfxlnehpwcqgqup).
- [ ] In **Authentication → Users**, confirm your signed-in account exists.
- [ ] In **Table Editor**, check for your corresponding rows in `learning_preferences`, `completed_lessons`, or `practice_sessions`, depending on the action performed.
- [ ] Confirm the app shows no cloud-sync warning.
- [ ] For a stronger check, sign into the same account in another browser and verify the saved preference/history appears there.

Refreshing the same browser alone is insufficient to prove cloud sync because the app also caches data locally. Adaptive recommendations and pilot-study evidence remain local and are not expected in Supabase.

## 3. Configure custom SMTP for email sign-up and recovery

Supabase's default email service only sends to project organization team members and has restrictive limits. Configure custom SMTP to deliver confirmation and recovery emails to ordinary users. [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp)

- [ ] Choose an email provider that supports SMTP, create its account, and obtain its SMTP settings. Examples include Resend, Brevo, Postmark, SendGrid, and Amazon SES.
- [ ] Complete the provider's sender/domain verification. Add any required SPF/DKIM DNS records and follow its DMARC guidance. A sending domain can be configured before the web app is published.
- [ ] In Supabase, open **Authentication → Emails → SMTP Settings**. Dashboard labels may vary; look for **Custom SMTP**.
- [ ] Enable custom SMTP and enter these values from the provider:
  - SMTP host and port
  - SMTP username and password
  - Verified sender email
  - Sender name, for example **Pa-O Typing Tutor**
- [ ] Save the settings. Keep email confirmation enabled.
- [ ] Test a new email/password sign-up using an email address you control. Confirm the message arrives and its link returns you to the local app.
- [ ] Test **Forgot password**, follow the recovery email, set a new password, and verify sign-in works.

For missing emails, check spam, the provider's delivery logs, and Supabase Auth logs. Use the SMTP port and credentials supplied by the provider; do not assume an API key is also its SMTP password.

## 4. Add other Google test accounts when needed

- [ ] Open [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience?project=pa-o-typing-tutor).
- [ ] Under **Test users**, click **Add users**, enter the Google email addresses that will test the app, and save.
- [ ] Keep the app in Testing mode during development.

Google test-user access and Supabase's default email-delivery restriction are separate settings.

## Troubleshooting Google sign-in

### `redirect_uri_mismatch`

Open [Google → Clients](https://console.cloud.google.com/auth/clients?project=pa-o-typing-tutor), select **Typing Tutor Web**, and confirm the authorized redirect URI is exactly:

```text
https://tuulerfxlnehpwcqgqup.supabase.co/auth/v1/callback
```

The configured JavaScript origins are:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Google redirects to the hosted Supabase callback; Supabase then returns the user to the app's `/auth/callback` route. [Supabase Google setup guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

### Access blocked or account not allowed

Use the configured test account, or add the account under Google's **Audience → Test users**. If settings were just changed, allow time for propagation before retrying.

### Wrong local address after sign-in

Check Supabase **Authentication → URL Configuration** against the local URLs above. Run Vite on port 5173 or update both services for the actual port.

### “No API key found” when opening the Supabase URL directly

This is expected for a direct browser visit to `/auth/v1/settings` without an API-key header. It shows that the endpoint responded. The app supplies its configured publishable key automatically.

### Connection refused or QUIC network error

Try the local app in Firefox. If Firefox also cannot reach Supabase, compare another network and check the project status. These transport errors do not establish that the OAuth credentials are wrong. Keep certificate validation enabled.

### Firefox “NetworkError when attempting to fetch resource” during password login

The login page now distinguishes connection failures, incorrect credentials,
unconfirmed email, rate limits and HTTP server failures. Connection failures do
not establish whether the password is correct. Google and password-recovery
requests also restore their controls after a thrown fetch error.
The on-page alert is a short message with one suggested action; detailed network
troubleshooting stays in this guide.

On 7 October 2026, the linked CLI reported project `tuulerfxlnehpwcqgqup` as
`ACTIVE_HEALTHY`. This machine reached `supabase.com` and `api.supabase.com`,
but requests to the project’s `/auth/v1/settings` and `/auth/v1/health` failed
with connection refused before receiving an HTTP response, including a settings
request with the configured public key. The user also reported that allowing
the project host in NoScript did not resolve Firefox’s error. The precise network
cause remains unverified; the project is not paused.

- Allow the project host in any browser request blocker for the local app.
- Compare the same login on another network, such as a phone hotspot. If it
  works there, investigate the original network’s DNS, proxy or firewall with
  its administrator.
- If both networks fail, compare another browser and inspect the failed request
  in Firefox Developer Tools → Network. Record the HTTP status or transport
  error, without sharing passwords, request authorization headers or tokens.
- Retry the existing demo button once the endpoint is reachable. A separate
  incorrect-password message, if returned, should then be investigated as an
  account issue.

See [Supabase Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes)
for server error references. A frontend error-message change cannot repair an
unreachable network route.

## 5. Before public launch

- [ ] Deploy the frontend and confirm its HTTPS address.
- [ ] Set Supabase's Site URL to the production address.
- [ ] Add the app's actual production callback URLs to Supabase, including the callback query strings used for dashboard and password-recovery navigation. Use exact production redirects where possible. Preserve local redirects if development still needs them. [Redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls)
- [ ] Update `supabase/config.toml` to preserve the intended URLs before a future CLI config push. Always inspect `config diff` first.
- [ ] Add the production origin to the Google web client. The hosted Supabase redirect URI remains the same while you use this Supabase project.
- [ ] Complete Google's required Branding information and review its publishing/verification requirements before switching the audience to Production.
- [ ] Repeat Google sign-in, email confirmation, password recovery, and cloud-sync checks on the deployed app.

## Credential storage

The Google credentials were backed up locally with owner-only permissions at:

```text
/home/kyawhla/.config/pa-o-typing-tutor/google-oauth-credentials.json
```

Keep that file and any downloaded Google JSON private. Google client secrets, SMTP passwords, and Supabase service-role keys must stay out of Git, screenshots, chat, and `VITE_*` variables. The frontend needs only the Supabase project URL and publishable/anon key. The Google provider secret is already configured in hosted Supabase; it does not need to be added to frontend `.env`.

## Completion checklist

- [ ] Google sign-in reaches the dashboard in Firefox.
- [ ] Account data is confirmed in Supabase and appears in a second browser.
- [ ] Custom SMTP is saved and email confirmation works.
- [ ] Password recovery works.
- [ ] Production URLs and Google publishing settings are completed when launching.
