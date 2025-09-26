// Simple login check for checkout page
function isLoggedIn() {
    return localStorage.getItem('loggedIn') === 'true';
}

document.addEventListener('DOMContentLoaded', function() {
    if (!isLoggedIn()) {
        window.location.href = 'auth.html';
        return;
    }
    const form = document.getElementById('checkout-form');
    const message = document.getElementById('checkout-message');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const order = {
            action: 'checkout',
            name: formData.get('name'),
            address: formData.get('address'),
            city: formData.get('city'),
            zip: formData.get('zip'),
            card: formData.get('card'),
            expiry: formData.get('expiry'),
            cvv: formData.get('cvv'),
            email: formData.get('email') || ''
        };
        const res = await fetch('/api/server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        const data = await res.json();
        if (res.ok) {
            message.textContent = data.message || 'Order placed!';
            message.style.color = 'green';
            form.reset();
        } else {
            message.textContent = data.message || 'Order failed.';
            message.style.color = 'red';
        }
    });
});
