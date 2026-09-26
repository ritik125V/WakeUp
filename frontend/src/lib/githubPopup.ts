/**
 * Render-style Popup Window Manager for GitHub App Installation
 * Opens a focused browser popup window, listens for completion postMessage,
 * and falls back to polling when the popup closes.
 */
export function openGithubAppInstallPopup({
  installUrl,
  state,
  onSuccess,
  onError,
}: {
  installUrl: string;
  state: string;
  onSuccess: (data: { installationId: string }) => void;
  onError?: (err: any) => void;
}) {
  if (typeof window === 'undefined') return;

  const appUrl = installUrl || 'https://github.com/apps/letsWakeUp/installations/new';
  const targetUrl = `${appUrl}${appUrl.includes('?') ? '&' : '?'}state=${encodeURIComponent(state)}`;

  const width = 650;
  const height = 750;
  const left = Math.max(0, window.screenX + (window.innerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.innerHeight - height) / 2);

  const popup = window.open(
    targetUrl,
    'GitHubAppInstallPopup',
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
  );

  if (!popup) {
    // Popup blocked by browser, fallback to navigating directly
    window.location.href = targetUrl;
    return;
  }

  let messageHandled = false;

  const messageListener = (event: MessageEvent) => {
    if (event.data && event.data.type === 'GITHUB_APP_INSTALLED') {
      messageHandled = true;
      window.removeEventListener('message', messageListener);
      if (popup && !popup.closed) {
        try {
          popup.close();
        } catch (e) {
          // ignore
        }
      }
      onSuccess({ installationId: event.data.installationId || '' });
    }
  };

  window.addEventListener('message', messageListener);

  // Poll popup status in case message is blocked or user completes installation manually
  const pollInterval = setInterval(() => {
    if (!popup || popup.closed) {
      clearInterval(pollInterval);
      window.removeEventListener('message', messageListener);
      if (!messageHandled) {
        onSuccess({ installationId: '' });
      }
    }
  }, 1000);
}
