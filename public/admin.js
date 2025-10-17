// Check admin session
fetch('/admin/users').then(async r => {
  if (r.status === 401) {
    // Not logged in, show login form
    const s = document.createElement('script');
    s.src = 'admin-login.js';
    document.body.innerHTML = '';
    document.body.appendChild(s);
    return;
  }
  const users = await r.json();
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = users.map(u => `<tr><td>${u.email}</td><td>${u.username}</td></tr>`).join('');
  fetch('/admin/logs').then(r => r.json()).then(logs => {
    const logList = document.getElementById('log-list');
    logList.innerHTML = logs.map(l => `<div>${l}</div>`).join('');
  });
});
