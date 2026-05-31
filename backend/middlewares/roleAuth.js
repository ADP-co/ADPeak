function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario?.rol) {
      return res.status(401).json({
        error: 'No se encontro la informacion del usuario en la peticion.',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado para el rol actual.',
        rol: req.usuario.rol,
        rolesPermitidos,
      });
    }

    return next();
  };
}

module.exports = { autorizarRoles };
