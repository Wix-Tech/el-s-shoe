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
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        message.textContent = 'Order placed! (Demo: no real payment processed)';
        message.style.color = 'green';
        form.reset();
    });
});
