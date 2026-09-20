const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

const getLineConfig = () => ({
  accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  defaultRecipient: process.env.LINE_USER_ID,
});

const sendLineNotification = async (message, recipient) => {
  const { accessToken, defaultRecipient } = getLineConfig();
  const target = recipient || defaultRecipient;

  if (!accessToken || !target) {
    console.warn("LINE notification skipped: LINE environment variables are not configured");
    return { skipped: true };
  }

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: target,
      messages: [{ type: "text", text: String(message).slice(0, 5_000) }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE API ${response.status}: ${detail}`);
  }

  return { success: true };
};

module.exports = { sendLineNotification };
