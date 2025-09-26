// Admin login logic
const loginForm = document.createElement('form');
loginForm.innerHTML = `
  <h2>Admin Login</h2>
  <input type="password" id="admin-password" placeholder="Admin Password" required style="width:100%;margin-bottom:12px;padding:8px;">
  <button type="submit" style="width:100%;padding:8px;">Login</button>
  <div id="admin-login-msg" style="color:red;margin-top:8px;"></div>
`;
document.body.innerHTML = '';
document.body.appendChild(loginForm);

loginForm.onsubmit = async e => {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;
  const msg = document.getElementById('admin-login-msg');
  msg.textContent = '';
  const res = await fetch('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (res.ok) {
    location.reload();
  } else {
    const data = await res.json();
    msg.textContent = data.message || 'Login failed';
  }
};
