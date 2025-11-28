from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_mail import Mail, Message
import json
import random
import secrets
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_aqui'

# Configuración de email (usando Gmail como ejemplo)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'inversion.cmax@gmail.com'
app.config['MAIL_PASSWORD'] = 'ftbq cidf qjoq cqls'

mail = Mail(app)

# Base de datos simple de usuarios
USERS_FILE = 'users.json'

def load_users():
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except:
        default_users = {
            "admin": {
                "password": "admin123",
                "email": "admin@cmax.com",
                "role": "admin"
            },
            "usuario1": {
                "password": "user123",
                "email": "usuario1@cmax.com", 
                "role": "user"
            }
        }
        save_users(default_users)
        return default_users

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)

def generate_verification_code():
    return str(random.randint(100000, 999999))

# Datos de bonos CMAX
BONDS_DATA = {
    "CMAX-2022-001": {
        "name": "Bono CMAX Corporativo 2022",
        "isin": "XS2337285865",
        "emission_date": "2020-05-15",
        "maturity_date": "2025-05-15",
        "coupon_rate": 4.5,
        "face_value": 1000,
        "currency": "MXN"
    },
    "CMAX-2022-002": {
        "name": "Bono CMAX Verde 2022", 
        "isin": "XS2337285866",
        "emission_date": "2020-06-01",
        "maturity_date": "2027-06-01",
        "coupon_rate": 3.8,
        "face_value": 1000,
        "currency": "MXN"
    }
}

def get_bond_history_by_period(bond_id, period="24h"):
    """Genera datos históricos según el período seleccionado"""
    base_prices = {
        "CMAX-2022-001": 975.50,
        "CMAX-2022-002": 962.75
    }
    
    base_price = base_prices.get(bond_id, 950.00)
    now = datetime.now()
    
    if period == "24h":
        points = 24
        time_format = '%H:%M'
        start_date = now - timedelta(hours=23)
        labels = [(start_date + timedelta(hours=i)).strftime(time_format) for i in range(points)]
        
    elif period == "7d":
        points = 7
        time_format = '%d/%m'
        start_date = now - timedelta(days=6)
        labels = [(start_date + timedelta(days=i)).strftime(time_format) for i in range(points)]
        
    elif period == "1m":
        points = 15
        time_format = '%d/%m'
        start_date = now - timedelta(days=28)
        labels = [(start_date + timedelta(days=i*2)).strftime(time_format) for i in range(points)]
    
    else:
        period = "24h"
        points = 24
        time_format = '%H:%M'
        start_date = now - timedelta(hours=23)
        labels = [(start_date + timedelta(hours=i)).strftime(time_format) for i in range(points)]
    
    # Generar precios con tendencia realista
    prices = []
    current_price = base_price
    
    for i in range(points):
        if period == "24h":
            volatility = 0.01
        elif period == "7d":
            volatility = 0.02
        else:
            volatility = 0.03
            
        trend = random.uniform(-volatility, volatility)
        
        if period != "24h":
            long_term_trend = 0.001 * i
            trend += long_term_trend
            
        current_price = current_price * (1 + trend)
        current_price = max(base_price * 0.9, min(base_price * 1.1, current_price))
        prices.append(round(current_price, 2))
    
    return {
        'labels': labels,
        'prices': prices,
        'current_price': prices[-1] if prices else base_price,
        'period': period
    }

def get_real_time_bond_data(bond_id, period="24h"):
    """Obtiene datos en tiempo real para el bono con período específico"""
    base_prices = {
        "CMAX-2022-001": 975.50,
        "CMAX-2022-002": 962.75
    }
    
    base_price = base_prices.get(bond_id, 950.00)
    
    # Simular fluctuaciones en tiempo real
    current_price = base_price * (1 + random.uniform(-0.005, 0.005))
    current_price = round(current_price, 2)
    
    # Obtener datos históricos según el período
    history_data = get_bond_history_by_period(bond_id, period)
    
    # Calcular cambio desde el primer punto del período
    first_price = history_data['prices'][0] if history_data['prices'] else base_price
    change = current_price - first_price
    change_percent = (change / first_price) * 100
    
    # Estructura compatible con frontend
    return {
        'current_price': current_price,
        'change': round(change, 2),
        'change_percent': round(change_percent, 2),
        'history_24h': {
            'hours': history_data['labels'],
            'prices': history_data['prices']
        },
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

def calculate_recommendation(bond_data, current_price):
    """Calcula recomendación basada en análisis financiero"""
    face_value = bond_data['face_value']
    coupon_rate = bond_data['coupon_rate']
    maturity_date = datetime.strptime(bond_data['maturity_date'], '%Y-%m-%d')
    current_date = datetime(2022, 11, 16)
    
    years_to_maturity = (maturity_date - current_date).days / 365.25
    current_yield = (coupon_rate * face_value / 100) / current_price * 100
    annual_coupon = (coupon_rate * face_value / 100)
    ytm = (annual_coupon + (face_value - current_price) / years_to_maturity) / ((face_value + current_price) / 2) * 100
    
    if current_price >= face_value * 1.05:
        recommendation = "VENDER"
        reason = f"El bono está sobrevalorado. Precio actual: ${current_price} vs Valor nominal: ${face_value}"
    elif ytm > coupon_rate + 2:
        recommendation = "MANTENER" 
        reason = f"Yield to maturity atractivo: {ytm:.2f}% vs Tasa cupón: {coupon_rate}%"
    elif current_price <= face_value * 0.95:
        recommendation = "COMPRAR MÁS"
        reason = f"Oportunidad de compra. Precio con descuento: ${current_price}"
    else:
        recommendation = "MANTENER"
        reason = "Precio en rango normal. Rendimiento esperado estable."
    
    return {
        'recommendation': recommendation,
        'reason': reason,
        'metrics': {
            'current_yield': round(current_yield, 2),
            'ytm': round(ytm, 2),
            'years_to_maturity': round(years_to_maturity, 2),
            'premium_discount': round(((current_price - face_value) / face_value * 100), 2)
        }
    }

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        users = load_users()
        if username in users and users[username]['password'] == password:
            session['username'] = username
            session['email'] = users[username]['email']
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error='Credenciales incorrectas')
    
    return render_template('login.html')

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    username = request.form['username']
    users = load_users()
    
    if username in users:
        verification_code = generate_verification_code()
        session['reset_user'] = username
        session['verification_code'] = verification_code
        session['code_expires'] = (datetime.now() + timedelta(minutes=10)).timestamp()
        
        # Modo desarrollo - mostrar código en consola
        print(f"🔐 CÓDIGO PARA {username}: {verification_code}")
        
        return jsonify({
            'success': True, 
            'message': f'Código de prueba: {verification_code} (En producción se enviaría por email)'
        })
    
    return jsonify({'success': False, 'message': 'Usuario no encontrado'})

@app.route('/verify-code', methods=['POST'])
def verify_code():
    code = request.form['code']
    username = session.get('reset_user')
    
    if not username or datetime.now().timestamp() > session.get('code_expires', 0):
        return jsonify({'success': False, 'message': 'Código expirado'})
    
    if code == session.get('verification_code'):
        session['verified'] = True
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': 'Código incorrecto'})

@app.route('/reset-password', methods=['POST'])
def reset_password():
    if not session.get('verified'):
        return jsonify({'success': False, 'message': 'Verificación requerida'})
    
    new_password = request.form['new_password']
    username = session.get('reset_user')
    
    users = load_users()
    if username in users:
        users[username]['password'] = new_password
        save_users(users)
        
        session.pop('reset_user', None)
        session.pop('verification_code', None)
        session.pop('code_expires', None)
        session.pop('verified', None)
        
        return jsonify({'success': True, 'message': 'Contraseña actualizada correctamente'})
    
    return jsonify({'success': False, 'message': 'Error actualizando contraseña'})

@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect(url_for('login'))
    
    return render_template('dashboard_premium.html', 
                         username=session['username'],
                         bonds=BONDS_DATA)

@app.route('/api/bond/<bond_id>')
def get_bond_data(bond_id):
    if bond_id not in BONDS_DATA:
        return jsonify({'error': 'Bono no encontrado'})
    
    bond_data = BONDS_DATA[bond_id]
    history_data = get_bond_history_by_period(bond_id, "24h")
    recommendation = calculate_recommendation(bond_data, history_data['current_price'])
    
    return jsonify({
        'bond_info': bond_data,
        'history': history_data,
        'recommendation': recommendation
    })

@app.route('/api/realtime/<bond_id>')
def get_realtime_bond_data(bond_id):
    """Endpoint para datos en tiempo real con período"""
    if bond_id not in BONDS_DATA:
        return jsonify({'error': 'Bono no encontrado'})
    
    period = request.args.get('period', '24h')
    
    bond_info = BONDS_DATA[bond_id]
    realtime_data = get_real_time_bond_data(bond_id, period)
    recommendation = calculate_recommendation(bond_info, realtime_data['current_price'])
    
    return jsonify({
        'bond_info': bond_info,
        'realtime_data': realtime_data,
        'recommendation': recommendation
    })

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Rutas de administración
@app.route('/admin/users')
def admin_users():
    if 'username' not in session:
        return redirect(url_for('login'))
    
    users = load_users()
    current_user_data = users.get(session['username'])
    
    if current_user_data.get('role') != 'admin':
        return "No tienes permisos de administrador", 403
    
    return render_template('admin_users.html', 
                         users=users, 
                         current_user=session['username'])

@app.route('/admin/add-user', methods=['POST'])
def admin_add_user():
    if 'username' not in session:
        return jsonify({'success': False, 'message': 'No autenticado'})
    
    users = load_users()
    current_user_data = users.get(session['username'])
    
    if current_user_data.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Sin permisos'})
    
    username = request.form['username']
    password = request.form['password']
    email = request.form['email']
    role = request.form.get('role', 'user')
    
    if username in users:
        return jsonify({'success': False, 'message': 'Usuario ya existe'})
    
    users[username] = {
        'password': password,
        'email': email,
        'role': role
    }
    
    save_users(users)
    return jsonify({'success': True, 'message': 'Usuario agregado'})

@app.route('/admin/delete-user/<username>')
def admin_delete_user(username):
    if 'username' not in session:
        return redirect(url_for('login'))
    
    users = load_users()
    current_user_data = users.get(session['username'])
    
    if current_user_data.get('role') != 'admin':
        return "Sin permisos", 403
    
    if username in users and username != session['username']:
        del users[username]
        save_users(users)
        return redirect(url_for('admin_users'))
    
    return "No se puede eliminar el usuario", 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)