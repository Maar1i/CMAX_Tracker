// Manejo de autenticación y recuperación de contraseña

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const verifyCodeModal = document.getElementById('verifyCodeModal');
    const resetPasswordModal = document.getElementById('resetPasswordModal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const verifyCodeForm = document.getElementById('verifyCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    // Login
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(loginForm);
        
        fetch('/login', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.text().then(html => {
                    // Manejar error de login
                    document.body.innerHTML = html;
                });
            }
        });
    });

    // Mostrar modal de recuperación
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        forgotPasswordModal.style.display = 'block';
    });

    // Solicitar código de verificación
    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('resetUsername').value;
        
        fetch('/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(username)}`
        })
        .then(response => response.json())
        .then(data => {
            const messageDiv = document.getElementById('forgotPasswordMessage');
            if (data.success) {
                messageDiv.innerHTML = '<div class="message success">' + data.message + '</div>';
                forgotPasswordModal.style.display = 'none';
                verifyCodeModal.style.display = 'block';
            } else {
                messageDiv.innerHTML = '<div class="message error">' + data.message + '</div>';
            }
        });
    });

    // Verificar código
    verifyCodeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const code = document.getElementById('verificationCode').value;
        
        fetch('/verify-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `code=${encodeURIComponent(code)}`
        })
        .then(response => response.json())
        .then(data => {
            const messageDiv = document.getElementById('verifyCodeMessage');
            if (data.success) {
                messageDiv.innerHTML = '<div class="message success">Código verificado correctamente</div>';
                verifyCodeModal.style.display = 'none';
                resetPasswordModal.style.display = 'block';
            } else {
                messageDiv.innerHTML = '<div class="message error">' + data.message + '</div>';
            }
        });
    });

    // Cambiar contraseña
    resetPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        
        fetch('/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `new_password=${encodeURIComponent(newPassword)}`
        })
        .then(response => response.json())
        .then(data => {
            const messageDiv = document.getElementById('resetPasswordMessage');
            if (data.success) {
                messageDiv.innerHTML = '<div class="message success">' + data.message + '</div>';
                setTimeout(() => {
                    resetPasswordModal.style.display = 'none';
                    window.location.reload();
                }, 2000);
            } else {
                messageDiv.innerHTML = '<div class="message error">' + data.message + '</div>';
            }
        });
    });

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target === forgotPasswordModal) {
            forgotPasswordModal.style.display = 'none';
        }
        if (e.target === verifyCodeModal) {
            verifyCodeModal.style.display = 'none';
        }
        if (e.target === resetPasswordModal) {
            resetPasswordModal.style.display = 'none';
        }
    });
});