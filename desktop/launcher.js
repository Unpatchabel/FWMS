const button = document.querySelector('#start');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
button.addEventListener('click', async () => {
  button.disabled = true;
  error.hidden = true;
  status.textContent = 'Preparing your private database and starting FWMS…';
  try {
    const result = await window.fwms.start();
    if (!result.ok) throw new Error(result.error);
  } catch (failure) {
    status.textContent = '';
    error.textContent = failure.message || 'Could not start FWMS.';
    error.hidden = false;
    button.disabled = false;
  }
});
