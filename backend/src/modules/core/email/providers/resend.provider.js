const { Resend } = require('resend');
const env = require('../../../../config/env');

let client = null;
function getClient() {
  if (!client) client = new Resend(env.email.resendApiKey);
  return client;
}

// Resend yêu cầu domain gửi đã được verify (DKIM/SPF) — xem ARCHITECTURE.md §6.
async function send({ to, subject, html }) {
  const { data, error } = await getClient().emails.send({
    from: env.email.from,
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message || 'Resend send failed');
  return { providerMessageId: data?.id };
}

module.exports = { send };
