const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de redis y JWT
const SECRET_KEY = 'clave_deprueba'; // En producción, esto va en un archivo .env

// Aquí le paso la URL de Upstash (una base de datos Redis gestionada en la nube)
const redisClient = createClient({
    url: 'rediss://default:gQAAAAAAAd5XAAIgcDFlYWM0MmI5NDBhNzM0OGE1YjkxZDVlMDQ1ODI1OWFiNw@optimal-aphid-122455.upstash.io:6379'
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

// inicio de sesión (Login)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    // Buscar al usuario
    const usuario = usuariosPrueba.find(u => u.email === email && u.password === password);
    
    if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar el JWT
    const payload = { id: usuario.id, rol: usuario.rol, plantel_id: usuario.plantel_id };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' }); // Expira en 1 hora

    // Guardar en Redis la sesión activa del usuario. Esto nos permitirá invalidar el token si el usuario cierra sesión o si queremos revocar el acceso.
    // Guardamos la llave "sesion:<id_usuario>" con el token. EX = 3600 segundos (1 hora)
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

// Rutas de prueba
app.get('/api/poa/dashboard', verificarAutenticacion, (req, res) => {
    res.json({ 
        mensaje: 'Estás viendo información confidencial', 
        tusDatos: req.usuario 
    });
});

// Cierre de sesión (Logout)
app.post('/api/auth/logout', verificarAutenticacion, async (req, res) => {
    // Se borra la sesión de Redis. Aunque el JWT siga existiendo, ya no servirá
    await redisClient.del(`sesion:${req.usuario.id}`);
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
});

// Iniciar servidor
app.listen(3000, () => console.log('Servidor de Autenticación en puerto 3000'));