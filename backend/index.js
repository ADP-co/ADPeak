require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const cors = require('cors');
const { autorizarRoles } = require('./middlewares/roleAuth');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de redis y JWT jalando desde el .env
const SECRET_KEY = process.env.SECRET_KEY;

// Aquí le paso la URL de Upstash desde el .env
const redisClient = createClient({
    url: process.env.REDIS_URL
});

// Mensajes en consola para saber si nos conectamos o si hubo error
redisClient.on('error', (err) => console.log('Error en Upstash Redis:', err));

redisClient.connect().then(() => {
    console.log('¡Conexión establecida a Upstash Redis!');
}).catch((err) => {
    console.error('Error al conectar a Upstash:', err);
});

//Usuarios de prueba para plantel, responsable y admin
const usuariosPrueba = [
    { id: 1, email: 'admin@poa.gov', password: '123', rol: 'Admin', plantel_id: null },
    { id: 2, email: 'responsable@poa.gov', password: '123', rol: 'Responsable', plantel_id: 10 },
    { id: 3, email: 'plantel@poa.gov', password: '123', rol: 'Plantel', plantel_id: 10 }
];

// ¡esto será temporal en lo que se hace la conexión a la base de datos! 
// Aquí simulamos algunos indicadores asociados a planteles y uno global para el admin.
const indicadoresPrueba = [
    { id: 101, plantel_id: 10, nombre: 'Tasa de Aprobación', valor: '85%' },
    { id: 102, plantel_id: 10, nombre: 'Deserción Escolar', valor: '5%' },
    { id: 103, plantel_id: 20, nombre: 'Tasa de Aprobación', valor: '90%' }, // De otro plantel
    { id: 104, plantel_id: null, nombre: 'Presupuesto Global', valor: '$1M' } // Global del Admin
];

// inicio de sesión (Login) asegurado
app.post('/api/auth/login', [
    // Aquí están las validaciones de seguridad (Server-side validation)
    body('email').isEmail().withMessage('Por favor ingresa un correo con formato válido (ejemplo@dominio.com)'),
    body('password').notEmpty().withMessage('La contraseña no puede ir vacía')
], async (req, res) => {
    
    // Revisamos si se encontró algún error en el req.body según nuestras validaciones. 
    // Si es así, rebotamos la petición con un status 400 (Bad Request) y un mensaje de error.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar al usuario
    const usuario = usuariosPrueba.find(u => u.email === email && u.password === password);
    
    if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar el JWT
    const payload = { id: usuario.id, rol: usuario.rol, plantel_id: usuario.plantel_id };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

    // Guardar en Redis la sesión activa
    await redisClient.set(`sesion:${usuario.id}`, token, { EX: 3600 });

    res.json({ mensaje: `Bienvenido ${usuario.rol}`, token });
});

// Rutas protegidas que rechazan no autenticados.
const verificarAutenticacion = async (req, res, next) => {
    // Extraer token del header "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado: No hay token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verificar firma del JWT
        const decodificado = jwt.verify(token, SECRET_KEY);

        // Verificar en Redis si la sesión sigue activa 
        const tokenEnRedis = await redisClient.get(`sesion:${decodificado.id}`);
        
        if (!tokenEnRedis || tokenEnRedis !== token) {
            return res.status(401).json({ error: 'Sesión revocada o inválida' });
        }

        // Si todo está bien, pasamos los datos del usuario a la ruta
        req.usuario = decodificado;
        next(); 
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

//----------------------------------------------------------------------------
// Rutas de prueba
app.get('/api/poa/dashboard', verificarAutenticacion, (req, res) => {
    res.json({ 
        mensaje: 'Estás viendo información confidencial', 
        tusDatos: req.usuario 
    });
});

// Admin
app.delete('/api/poa/admin-only', verificarAutenticacion, autorizarRoles('Admin'), (req, res) => {
    res.json({ mensaje: 'Éxito. Bienvenido Admin.' });
});

// Admin y resposable
app.post('/api/poa/edicion', verificarAutenticacion, autorizarRoles('Admin', 'Responsable'), (req, res) => {
    res.json({ mensaje: 'Éxito. Permisos de edición habilitados.' });
});

// todos los usuarios
app.get('/api/poa/ver-datos', verificarAutenticacion, autorizarRoles('Admin', 'Responsable', 'Plantel'), (req, res) => {
    res.json({ mensaje: 'Éxito. Usuarios autenticados pueden ver esto.' });
});

// Ruta con Segmentación de Datos 
app.get('/api/poa/indicadores', verificarAutenticacion, (req, res) => {
    const { rol, plantel_id } = req.usuario;

    // Si es Admin, le mandamos TODOS los datos sin filtrar
    if (rol === 'Admin') {
        return res.json({ 
            mensaje: 'Eres Admin, aquí tienes todos los datos del estado:', 
            datos: indicadoresPrueba 
        });
    }

    // Si es Plantel o Responsable, filtramos la base de datos (nuestro array) 
    // para que SOLO vea los que coinciden con su plantel_id
    if (rol === 'Plantel' || rol === 'Responsable') {
        const datosFiltrados = indicadoresPrueba.filter(
            (indicador) => indicador.plantel_id === plantel_id
        );

        return res.json({ 
            mensaje: `Aquí tienes los datos exclusivos de tu plantel (ID: ${plantel_id}):`, 
            datos: datosFiltrados 
        });
    }

    // un extra por si el rol no es reconocido (aunque no debería pasar porque el middleware de autorización ya lo controla)
    return res.status(403).json({ error: 'Rol no reconocido para esta consulta.' });
});
//----------------------------------------------------------------------------


// Cierre de sesión (Logout)
app.post('/api/auth/logout', verificarAutenticacion, async (req, res) => {
    // Se borra la sesión de Redis. Aunque el JWT siga existiendo, ya no servirá
    await redisClient.del(`sesion:${req.usuario.id}`);
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
});

// Iniciar servidor
app.listen(3000, () => console.log('Servidor de Autenticación en puerto 3000'));