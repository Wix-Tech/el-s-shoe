// Utility: Password strength checker
function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return score;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
}

function getStrengthText(score) {
    switch(score) {
        case 5: return 'Very Strong';
        case 4: return 'Strong';
        case 3: return 'Medium';
        case 2: return 'Weak';
        default: return 'Very Weak';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    let isLogin = true;
    const form = document.getElementById('auth-form');
    const toggleLink = document.getElementById('toggle-link');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');
    const authMessage = document.getElementById('auth-message');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordStrength = document.getElementById('password-strength');
    const forgotPassword = document.getElementById('forgot-password');
    const otpSection = document.getElementById('otp-section');
    const otpInput = document.getElementById('otp');
    let otpSent = false;

    function showLogin() {
        isLogin = true;
        formTitle.textContent = 'Login';
        submitBtn.textContent = 'Login';
        toggleText.innerHTML = "Don't have an account? <a href='#' id='toggle-link'>Sign Up</a>";
        document.getElementById('username-group').style.display = 'none';
        document.getElementById('confirm-password-group').style.display = 'none';
        document.getElementById('password-strength-group').style.display = 'none';
        forgotPassword.style.display = 'block';
        otpSection.style.display = 'none';
        authMessage.textContent = '';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
    }
    function showSignUp() {
        isLogin = false;
        formTitle.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        toggleText.innerHTML = "Already have an account? <a href='#' id='toggle-link'>Login</a>";
        document.getElementById('username-group').style.display = 'block';
        document.getElementById('confirm-password-group').style.display = 'block';
        document.getElementById('password-strength-group').style.display = 'block';
        forgotPassword.style.display = 'none';
        otpSection.style.display = otpSent ? 'block' : 'none';
        authMessage.textContent = '';
        document.getElementById('email').value = '';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
    }

    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'toggle-link') {
            e.preventDefault();
            if (isLogin) showSignUp(); else showLogin();
        }
    });

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (!isLogin) {
                const score = checkPasswordStrength(passwordInput.value);
                passwordStrength.textContent = getStrengthText(score);
                passwordStrength.style.color = ['#e53e3e','#ed8936','#ecc94b','#38a169','#3182ce'][score];
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (isLogin) {
                // Login
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                authMessage.textContent = data.message;
                authMessage.style.color = res.ok ? 'green' : 'red';
                if (res.ok) {
                    // Clear cart on login
                    localStorage.removeItem('elsWearsCart');
                    localStorage.setItem('loggedIn', 'true');
                    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                }
            } else {
                // Sign Up
                const username = document.getElementById('username').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                if (password !== confirmPassword) {
                    authMessage.textContent = 'Passwords do not match!';
                    authMessage.style.color = 'red';
                    return;
                }
                if (!otpSent) {
                    // Send OTP
                    const otpRes = await fetch('/send-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const otpData = await otpRes.json();
                    if (otpRes.ok) {
                        otpSent = true;
                        otpSection.style.display = 'block';
                        authMessage.textContent = 'OTP sent to your email.';
                        authMessage.style.color = 'green';
                    } else {
                        authMessage.textContent = otpData.message || 'Failed to send OTP.';
                        authMessage.style.color = 'red';
                    }
                    return;
                }
                // Verify OTP and sign up
                const otp = otpInput.value;
                const res = await fetch('/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, username, password, otp })
                });
                const data = await res.json();
                authMessage.textContent = data.message;
                authMessage.style.color = res.ok ? 'green' : 'red';
                if (res.ok) {
                    // Clear cart on signup
                    localStorage.removeItem('elsWearsCart');
                    localStorage.setItem('loggedIn', 'true');
                    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                }
    // Clear cart on logout (if you have a logout button/link)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('elsWearsCart');
        });
    }
            }
        });
    }

    if (forgotPassword) {
        forgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('reset-modal').style.display = 'flex';
        });
    }

    // Password reset modal logic (3-step)
    const resetModal = document.getElementById('reset-modal');
    const resetForm = document.getElementById('reset-form');
    const resetMessage = document.getElementById('reset-message');
    const resetCancelBtn = document.getElementById('reset-cancel-btn');
    const stepEmail = document.getElementById('reset-step-email');
    const stepOtp = document.getElementById('reset-step-otp');
    const stepPassword = document.getElementById('reset-step-password');
    const requestOtpBtn = document.getElementById('reset-request-otp-btn');
    const confirmOtpBtn = document.getElementById('reset-confirm-otp-btn');
    let resetEmail = '';
    let otpConfirmed = false;
    if (resetForm) {
        // Step 1: Request OTP
        requestOtpBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            resetEmail = document.getElementById('reset-email').value;
            if (!resetEmail) {
                resetMessage.textContent = 'Please enter your email.';
                resetMessage.style.color = 'red';
                return;
            }
            const res = await fetch('/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await res.json();
            resetMessage.textContent = data.message;
            resetMessage.style.color = res.ok ? 'green' : 'red';
            if (res.ok) {
                stepEmail.style.display = 'none';
                stepOtp.style.display = 'block';
            }
        });
        // Step 2: Confirm OTP
        confirmOtpBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const otp = document.getElementById('reset-otp').value;
            if (!otp) {
                resetMessage.textContent = 'Please enter the OTP.';
                resetMessage.style.color = 'red';
                return;
            }
            otpConfirmed = true;
            stepOtp.style.display = 'none';
            stepPassword.style.display = 'block';
            resetMessage.textContent = '';
        });
        // Step 3: Reset password
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!otpConfirmed) {
                resetMessage.textContent = 'Please confirm your OTP before resetting your password.';
                resetMessage.style.color = 'red';
                return;
            }
            const otp = document.getElementById('reset-otp').value;
            const password = document.getElementById('reset-password').value;
            const confirmPassword = document.getElementById('reset-confirm-password').value;
            if (password !== confirmPassword) {
                resetMessage.textContent = 'Passwords do not match!';
                resetMessage.style.color = 'red';
                return;
            }
            const res2 = await fetch('/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, otp, newPassword: password })
            });
            const data2 = await res2.json();
            if (res2.ok) {
                resetMessage.textContent = 'Password reset successful! You can now log in.';
                resetMessage.style.color = 'green';
                setTimeout(() => {
                    resetModal.style.display = 'none';
                    stepEmail.style.display = 'block';
                    stepOtp.style.display = 'none';
                    stepPassword.style.display = 'none';
                    otpConfirmed = false;
                    resetForm.reset();
                    resetMessage.textContent = '';
                }, 2000);
            } else {
                resetMessage.textContent = data2.message;
                resetMessage.style.color = 'red';
            }
        });
    }
    if (resetCancelBtn) {
        resetCancelBtn.addEventListener('click', function() {
            resetModal.style.display = 'none';
            stepEmail.style.display = 'block';
            stepOtp.style.display = 'none';
            stepPassword.style.display = 'none';
            otpConfirmed = false;
            resetForm.reset();
            resetMessage.textContent = '';
        });
    }
});
