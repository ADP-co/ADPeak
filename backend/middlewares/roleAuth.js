const autorizarRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Como este middleware se va a usar DESPUÉS de verificarAutenticacion,
        // req.usuario ya debe existir y tener la propiedad 'rol'.
        
        if (!req.usuario || !req.usuario.rol) {
            return res.status(401).json({ error: 'No se encontró la información del usuario en la petición.' });
        }

        // Revisamos si el rol del usuario está en nuestra lista de permitidos
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Tu rol (${req.usuario.rol}) no tiene permisos para esta acción.` 
            });
        }

        // Si su rol sí está permitido, lo dejamos pasar a la ruta
        next();
    };
};

module.exports = { autorizarRoles };