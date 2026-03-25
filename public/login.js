document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const msg = document.getElementById('login-message');
  const submitBtn = e.target.querySelector('button');

  submitBtn.disabled = true;
  submitBtn.innerText = 'Logging in...';
  msg.innerText = '';

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      msg.style.color = 'var(--color-success)';
      msg.innerText = 'Login successful! Redirecting...';
      setTimeout(() => (window.location.href = '/'), 1000);
    } else {
      msg.style.color = 'var(--color-danger)';
      msg.innerText = data.error || 'Invalid credentials or permission denied.';
      submitBtn.disabled = false;
      submitBtn.innerText = 'Login to Dashboard';
    }
  } catch (err) {
    msg.style.color = 'var(--color-danger)';
    msg.innerText = 'Server error. Please try again.';
    submitBtn.disabled = false;
    submitBtn.innerText = 'Login to Dashboard';
  }
});
