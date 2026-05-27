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

// --- por el momento se va a simular la bitácora ---
const bitacoraPrueba = [];

// --- nuevamente en simulacion se manejaran las responsabilidades ---
// difiriendo entre primario y secundario
const responsabilidadesPrueba = [
    { id: 1, entidad_tipo: 'Indicador', entidad_id: 1, usuario_id: 2, tipo_responsabilidad: 'Primario' },
    { id: 2, entidad_tipo: 'Indicador', entidad_id: 1, usuario_id: 1, tipo_responsabilidad: 'Secundario' },
    { id: 3, entidad_tipo: 'Indicador', entidad_id: 2, usuario_id: 2, tipo_responsabilidad: 'Primario' }
];

const registrarBitacora = (usuario_id, tipo_evento, entidad_afectada, detalles = '') => {
    const nuevoRegistro = {
        id: bitacoraPrueba.length + 1,
        usuario_id: usuario_id,
        fecha: new Date().toISOString(), // Guarda la fecha y hora exacta
        tipo_evento: tipo_evento,
        entidad_afectada: entidad_afectada,
        detalles: detalles
    };
    bitacoraPrueba.push(nuevoRegistro);
    console.log('📝 [BITÁCORA]', nuevoRegistro); // Lo imprimimos en consola para verlo en vivo
};
// --- aquí termina ---

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

    registrarBitacora(usuario.id, 'LOGIN', 'Sistema', `El usuario ${usuario.email} inició sesión`);

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

// Admin y responsable (se implementó la bitácora)
app.post('/api/poa/edicion', verificarAutenticacion, autorizarRoles('Admin', 'Responsable'), (req, res) => {
    
    // Registramos la acción crítica
    registrarBitacora(req.usuario.id, 'CAMBIO_PERMISOS', 'Indicadores', 'Se habilitaron permisos de edición');
    
    res.json({ mensaje: 'Éxito. Permisos de edición habilitados y registrados en bitácora.' });
});

// el admin es el único que puede ver la bitácora completa,
// porque ahí se registran eventos críticos como cambios de permisos, inicios de sesión, etc.
app.get('/api/poa/bitacora', verificarAutenticacion, autorizarRoles('Admin'), (req, res) => {
    res.json({ 
        mensaje: 'Historial de auditoría (Audit Trail)', 
        total_eventos: bitacoraPrueba.length,
        datos: bitacoraPrueba 
    });
});

// lógica de permisos para que el admin pueda modificar
//  los permisos de otros usuarios, y que esa acción quede registrada en la bitácora con todo detalle.
app.put('/api/usuarios/:id/permisos', verificarAutenticacion, autorizarRoles('Admin'), (req, res) => {
    // Sacamos el ID de la URL y lo convertimos a número
    const usuarioIdModificar = parseInt(req.params.id);
    
    // Sacamos los nuevos permisos que el Admin mandó en el body
    const { rol, plantel_id } = req.body;

    // Buscamos al usuario dentro del arreglo temporal
    const usuario = usuariosPrueba.find(u => u.id === usuarioIdModificar);

    if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizamos los datos (si es que el Admin los mandó)
    if (rol) usuario.rol = rol;
    if (plantel_id) usuario.plantel_id = plantel_id;

    // guardamos todo en la bitácora a full detalle para que quede claro qué se cambió, quién lo hizo y cuándo.
    registrarBitacora(
        req.usuario.id, 
        'MODIFICACION_PERMISOS', 
        `Usuario modificado ID: ${usuario.id}`, 
        `Nuevos permisos -> Rol: ${usuario.rol}, Plantel: ${usuario.plantel_id}`
    );

    res.json({ 
        mensaje: 'Permisos actualizados correctamente', 
        usuario_actualizado: {
            id: usuario.id,
            email: usuario.email,
            rol: usuario.rol,
            plantel_id: usuario.plantel_id
        }
    });
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

// Consultar a los responsables de un indicador específico
app.get('/api/indicadores/:id/responsables', verificarAutenticacion, (req, res) => {
    const indicadorId = parseInt(req.params.id);

    // se busca quienres son los responsables de este indicador en la tabla de responsabilidades simulada
    const asignaciones = responsabilidadesPrueba.filter(
        r => r.entidad_id === indicadorId && r.entidad_tipo === 'Indicador'
    );

    // se cruzan con la tabla de usuarios para obtener los detalles de cada responsable (email, rol, etc.)
    const responsables = asignaciones.map(asignacion => {
        const usuario = usuariosPrueba.find(u => u.id === asignacion.usuario_id);
        return {
            usuario_id: usuario ? usuario.id : null,
            email: usuario ? usuario.email : 'Usuario no encontrado',
            rol: usuario ? usuario.rol : 'Sin rol',
            tipo_responsabilidad: asignacion.tipo_responsabilidad
        };
    });

    res.json({
        mensaje: `Consulta de responsables para el Indicador ${indicadorId}`,
        total_responsables: responsables.length,
        datos: responsables
    });
});

// validaicipn del alcance de los permisos
app.get('/api/validar-alcance/indicador/:id', verificarAutenticacion, (req, res) => {
    const indicadorId = parseInt(req.params.id);
    const { id: usuarioId, rol, plantel_id } = req.usuario;

    // Buscamos el indicador solicitado
    const indicador = indicadoresPrueba.find(i => i.id === indicadorId);

    if (!indicador) {
        return res.status(404).json({ error: 'Indicador no encontrado' });
    }

    let tieneAcceso = false;
    let motivo = '';

    // El Admin tiene alcance total
    if (rol === 'Admin') {
        tieneAcceso = true;
        motivo = 'Acceso total validado por rol: Admin';
    } 
    // Alcance validado por pertenecer al mismo plantel
    else if (indicador.plantel_id === plantel_id) {
        tieneAcceso = true;
        motivo = `Acceso validado por Plantel (ID: ${plantel_id})`;
    } 
    // Alcance validado por ser responsable explícito (Primario o Secundario)
    else {
        const esResponsable = responsabilidadesPrueba.some(
            r => r.entidad_tipo === 'Indicador' && r.entidad_id === indicadorId && r.usuario_id === usuarioId
        );
        if (esResponsable) {
            tieneAcceso = true;
            motivo = 'Acceso validado por ser Responsable directo del indicador';
        } else {
            motivo = 'Discrepancia/Bloqueo: No tienes permisos sobre este indicador';
        }
    }

    // Si no pasó ninguna regla, lo rechazamos
    if (!tieneAcceso) {
        return res.status(403).json({ 
            acceso: false, 
            motivo: motivo,
            indicador_id: indicadorId
        });
    }

    // Si tiene acceso, mostramos lo correspondiente
    res.json({
        acceso: true,
        motivo: motivo,
        datos_permitidos: indicador
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