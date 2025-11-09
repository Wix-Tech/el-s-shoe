// frontend/config.js

(function(window) {
    const localApiUrl = 'http://localhost:3000';
    // Replace this with your actual Render backend URL
    const productionApiUrl = 'https://your-backend-app-name.onrender.com'; 

    window.API_CONFIG = {
        API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? localApiUrl : productionApiUrl
    };
})(window);