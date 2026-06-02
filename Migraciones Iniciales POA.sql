CREATE DATABASE poa;

USE poa;
CREATE table roles 
(
    id int PRIMARY KEY AUTO_INCREMENT,
    rol varchar (100),
    deleted_at TIMESTAMP NULL
);

insert into roles (rol) values ('Administrador');
insert into roles (rol) values ('Responsable');


CREATE table users
(
    id int PRIMARY KEY AUTO_INCREMENT,
    nombre varchar (100),
    usuario varchar (50) UNIQUE,
    contrasena varchar(255),
    correo varchar (100),
    numero_telefonico varchar (70),
    id_rol int,
    FOREIGN KEY (id_rol) REFERENCES roles(id),
    deleted_at TIMESTAMP NULL
);

CREATE table planteles
(
    id int PRIMARY KEY AUTO_INCREMENT,
    usuario varchar (50) UNIQUE,
    contrasena varchar(255),
    correo varchar (100),
    director varchar (100),
    numero_telefonico varchar (70),
    id_administrador int,
    FOREIGN KEY (id_administrador) REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

/*lo tomé como ciclos escolares?*/
CREATE table operational_years
(
    id int PRIMARY KEY AUTO_INCREMENT,
    inicio DATE,
    fin DATE,
    deleted_at TIMESTAMP NULL
);

/*lo tomé como semestres*/
CREATE table periods
(
    id int PRIMARY KEY AUTO_INCREMENT,
    inicio DATE,
    fin DATE,
    numero int,
    id_administrador int,
    id_operational_years int,
    FOREIGN KEY (id_operational_years) REFERENCES operational_years(id),
    deleted_at TIMESTAMP NULL
);

CREATE table actividades
(
    id int PRIMARY KEY AUTO_INCREMENT,
    nombre varchar (300);
    id_indicador int,
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    deleted_at TIMESTAMP NULL
);

CREATE table indicators
(
    id int PRIMARY KEY AUTO_INCREMENT,
    numero_indicador varchar (20),
    id_responsable int,
    FOREIGN KEY (id_responsable) REFERENCES users(id),
    id_admin int,
    FOREIGN KEY (id_admin) REFERENCES users(id),
    nombre varchar (500),
    descripccion varchar (600),
    deleted_at TIMESTAMP NULL
);

/*estas evidencias las tomé como solo para indicadores*/
CREATE table submissions
(
    id int PRIMARY KEY AUTO_INCREMENT,
    id_indicador int, 
    id_responsable int,
    id_plantel int,
    id_semestre int,
    estatus varchar (100),
    version_actual int,
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_responsable) REFERENCES users(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    FOREIGN KEY (id_semestre) REFERENCES periods(id),
    deleted_at TIMESTAMP NULL
);

CREATE table submission_versions 
(
    id int PRIMARY KEY AUTO_INCREMENT,
    n_version int,
    datos_historial JSON,
    id_submissions int,
    id_responsable int,
    FOREIGN KEY (id_submissions) REFERENCES submissions(id),
    FOREIGN KEY (id_responsable) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*estas evidencias las tomé como  solo para responsables*/
CREATE table evidence_files
(
    id int PRIMARY KEY AUTO_INCREMENT,
    enlace json,/*el json contendrá la ruta del servidor donde se encuentran los archivos, el tamaño del archivo, la extensión y el nombre original*/
    id_usuario int,
    id_semestre int,
    FOREIGN KEY (id_usuario) REFERENCES users(id),
    FOREIGN KEY (id_semestre) REFERENCES periods(id),
    deleted_at TIMESTAMP NULL
);

CREATE table reviews
(
    id int PRIMARY KEY AUTO_INCREMENT,
    estatus varchar (100),
    id_plantel int,
    id_responsable int,
    id_indicador int,
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    FOREIGN KEY (id_responsable) REFERENCES users(id),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE assignments
(
    id int PRIMARY KEY AUTO_INCREMENT,
    id_plantel int,
    id_indicador int,
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    deleted_at TIMESTAMP NULL
);

CREATE table audit_log
(
    id int PRIMARY KEY AUTO_INCREMENT,
    num_version int,
    accion_realizada varchar (100),
    valor_inicial json,
    valor_nuevo json,
    id_evidence_files int,  
    id_usuario int, 
    FOREIGN KEY (id_usuario) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*esta tabla no debera contener usuarios, contraseñas ni numero telefonicos; se evalúa desde javascript*/
/*se registrarán cambios pero no datos reales, se deja el campo vacío o se implementará un valor por defecto*/
/*esta tabla guarda las acciones*/
CREATE table audit_indicators
(
    id int PRIMARY KEY AUTO_INCREMENT,
    num_version int,
    accion_realizada varchar (100),
    valor_inicial json, /*aqui se regista el vcmpo editado y los demás datos necesarios*/
    valor_nuevo json, 
    id_submissions int,
    id_plantel int,
    id_usuario int, 
    FOREIGN KEY (id_usuario) REFERENCES users(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);