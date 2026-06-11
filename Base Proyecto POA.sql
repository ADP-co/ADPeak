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





/* primera seccion de tablas; responsable -> Adriana Ruiz */
CREATE TABLE porcentaje_titulacion_cohorte_NMS (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    delegacion VARCHAR(100),
    plantel VARCHAR(100),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE porcentaje_titulacion_registros (
     id INT PRIMARY KEY AUTO_INCREMENT,
     programa VARCHAR(300),
     genero VARCHAR(30),
     titulados INT,
     matricula_cohorte INT,
     porcentaje_titulacion INT,
     id_porcentaje_titulacion_cohorte_NMS INT,
     FOREIGN KEY (id_porcentaje_titulacion_cohorte_NMS) REFERENCES porcentaje_titulacion_cohorte_NMS(id),
     deleted_at TIMESTAMP NULL
);

CREATE TABLE informe_semestral_realizacion_academias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_programa VARCHAR(300),
    numero_academias INT,
    numero_seciones_ordinarias INT,
    numero_seciones_extraordinarias INT,
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE estimulo_personal_docente_tiempo_completo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    ptc VARCHAR(100), -- Se corrigió agregando tipo de dato
    nombre_docente VARCHAR(100),
    nivel INT,
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

/* segunda seccion de tablas; responsable -> Angel Ordoñez Ayala */
CREATE TABLE sistemas_informacion_institucionales_interoperan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_software VARCHAR(100),
    aspecto_seguimiento VARCHAR(100), -- Se corrigió coma faltante
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE sistemas_implementados_fortalecer_gestion_procesos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    fecha VARCHAR(70),
    Versiones INT,
    responsable VARCHAR(100),
    decripccion_breve_cambio VARCHAR(600),
    autorizo VARCHAR(100),
    observaciones VARCHAR(500),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE porcentajeUO_acciones_infraestructura_tecnologica (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    dependencia_area VARCHAR(100),
    responsable VARCHAR(100),
    actividad VARCHAR(300),
    descripccion VARCHAR(500),
    fecha VARCHAR(70),
    estatus_tipo VARCHAR(100), 
    total_equipos INT,
    equipos_atendidos INT,
    porcentaje_equipos_atendidos INT,
    observaciones VARCHAR(500),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

/* tercera seccion de tablas; responsable -> Adriana Zuñiga */
CREATE TABLE porcentaje_estudiantes_acciones_igualdad_genero (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_capacion_actividades VARCHAR(300),
    temas_abordados VARCHAR(500),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_personas_igualdad (
    id INT PRIMARY KEY AUTO_INCREMENT,
    genero VARCHAR(30),
    perfil VARCHAR(30),
    id_porcentaje_estudiantes_acciones_igualdad_genero INT,
    FOREIGN KEY (id_porcentaje_estudiantes_acciones_igualdad_genero) REFERENCES porcentaje_estudiantes_acciones_igualdad_genero(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE pap_porcentaje_participantes_actividades_formacion_integral (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    responsable_actividad VARCHAR(100),
    cargo_correo_responsable VARCHAR(100),
    nombre_charla VARCHAR(100),
    ponente VARCHAR(100), 
    fecha_actividad VARCHAR(70),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_personas_formacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    genero VARCHAR(30),
    perfil VARCHAR(30),
    id_pap_porcentaje_participantes_actividades_formacion_integral INT,
    FOREIGN KEY (id_pap_porcentaje_participantes_actividades_formacion_integral) REFERENCES pap_porcentaje_participantes_actividades_formacion_integral(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE estudiantes_colabora_proyectos_investigacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_proyecto_investigacion VARCHAR(300),
    numero_estudiantes_m INT,
    numero_estudiantes_h INT,
    observaciones_periodo_proyecto VARCHAR(500),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

/* cuarta seccion de tablas; responsable -> Carlos Nava */
CREATE TABLE estudiantes_atendidos_servicios_salud (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    servicios_medicos VARCHAR(500),
    DGDI VARCHAR(100),
    CUAP VARCHAR(100),
    descripccion VARCHAR(600),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_personas_salud (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_semestre INT,
    genero VARCHAR(30),
    id_estudiantes_atendidos_servicios_salud INT,
    FOREIGN KEY (id_semestre) REFERENCES periods(id), -- Ajustado a tu tabla base
    FOREIGN KEY (id_estudiantes_atendidos_servicios_salud) REFERENCES estudiantes_atendidos_servicios_salud(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE porcentaje_estudiantes_actividades_formacion_integral (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_lugar_visitado VARCHAR(300),
    descripccion_impacto_academico VARCHAR(500),
    decripccion_experiencias_logradas VARCHAR(500),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_personas_actividades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    perfil VARCHAR(30),
    genero VARCHAR(30),
    id_porcentaje_estudiantes_actividades INT,
    FOREIGN KEY (id_porcentaje_estudiantes_actividades) REFERENCES porcentaje_estudiantes_actividades_formacion_integral(id),
    deleted_at TIMESTAMP NULL
);

/* quinta seccion de tablas; responsable -> Daniela Navarro */
CREATE TABLE retencion_escolar_ems_raa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_actividad VARCHAR(100),
    responable VARCHAR(100),
    periodo_realizacion VARCHAR(70),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_personas_retencion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    perfil VARCHAR(30),
    genero VARCHAR(30),
    id_retencion_escolar INT,
    FOREIGN KEY (id_retencion_escolar) REFERENCES retencion_escolar_ems_raa(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE tasa_abandono_escolar_ems_ecae (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    estrategias VARCHAR(300),
    alumnos_h INT,
    alumnas_m INT,
    total_amunos INT,
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE estudiantes_actividades_fromacion_integral_MUNCOL (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_alumno VARCHAR(100),
    numero_cuenta VARCHAR(30),
    profesor_acompanante VARCHAR(100),
    alumnos_m INT,
    alumnos_h INT,
    total_alumnos INT,
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE estudiantes_actividades_fromacion_integral_CE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_convocatoria VARCHAR(300),
    docentes INT,
    administrativos INT,
    coordinadores_academicos INT,
    asesores_pedagogicos INT,
    otros INT,
    alumnos_h INT,
    alumnos_m INT,
    total_alumnos INT,
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

/* sexta seccion de tablas; responsable -> Laura Calvario */
CREATE TABLE estudiantes_certificados_dominio_lengua_extrangera (
    id INT PRIMARY KEY AUTO_INCREMENT,  
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    nombre_convocatoria VARCHAR(300),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE alumnos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    genero VARCHAR(30),
    cantidad INT,
    id_estudiantes_certificados_dominio_lengua_extrangera INT,
    FOREIGN KEY (id_estudiantes_certificados_dominio_lengua_extrangera) REFERENCES estudiantes_certificados_dominio_lengua_extrangera(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE participantes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    perfil VARCHAR(30),
    cantidad INT,
    id_estudiantes_certificados_dominio_lengua_extrangera INT,
    FOREIGN KEY (id_estudiantes_certificados_dominio_lengua_extrangera) REFERENCES estudiantes_certificados_dominio_lengua_extrangera(id),
    deleted_at TIMESTAMP NULL
);

/* septima seccion de tablas; responsable -> Liliana Rojas */
CREATE TABLE retencion_educacion_media_superior (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    id_semestre INT,
    ciclo INT, 
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    FOREIGN KEY (id_semestre) REFERENCES periods(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_estudiantes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cantidad_h INT,
    cantidad_m INT,
    total INT,
    id_retencion_educacion_media_superior INT,
    FOREIGN KEY (id_retencion_educacion_media_superior) REFERENCES retencion_educacion_media_superior(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE tasa_abandono_escolar_ems (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    programa_educativo VARCHAR(300),
    matricula VARCHAR(30),
    justificacion VARCHAR(600),
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_personas_abandono (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cantidad_h INT,
    cantidad_m INT,
    grado INT,
    id_tasa_abandono_escolar_ems INT,
    FOREIGN KEY (id_tasa_abandono_escolar_ems) REFERENCES tasa_abandono_escolar_ems(id),
    deleted_at TIMESTAMP NULL
);

/* octava seccion de tablas; responsable -> Marcial Aviña*/
CREATE TABLE reporte_estudiantes_nivelacion_ordinario (
    id INT PRIMARY KEY AUTO_INCREMENT, -- Se agregó llave primaria faltante
    id_indicador INT,
    id_plantel INT,
    estatus VARCHAR(50),
    id_semestre INT, -- Se asignó tipo de dato INT
    grado VARCHAR(50), -- Se asignó tipo de dato VARCHAR
    no_asignaturas_ordinarios INT, -- Se asignó tipo de dato INT
    no_asignaturas_nivelacion INT, -- Se asignó tipo de dato INT
    FOREIGN KEY (id_indicador) REFERENCES indicators(id),
    FOREIGN KEY (id_plantel) REFERENCES planteles(id),
    FOREIGN KEY (id_semestre) REFERENCES periods(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE matricula (
    id INT PRIMARY KEY AUTO_INCREMENT, -- Se corrigió ; por ,
    cantidad_h INT, -- Se asignó tipo de dato INT
    cantidad_m INT, -- Se asignó tipo de dato INT
    total INT, -- Se asignó tipo de dato INT
    id_reporte_estudiantes_nivelacion_ordinario INT,
    FOREIGN KEY (id_reporte_estudiantes_nivelacion_ordinario) REFERENCES reporte_estudiantes_nivelacion_ordinario(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE estudiantes_ordinarios (
    id INT PRIMARY KEY AUTO_INCREMENT, -- Se corrigió ; por ,
    grupo CHAR(2),
    cantidad_estudiantes INT,
    id_reporte_estudiantes_nivelacion_ordinario INT,
    FOREIGN KEY (id_reporte_estudiantes_nivelacion_ordinario) REFERENCES reporte_estudiantes_nivelacion_ordinario(id),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE cantidad_asistencias (
    id INT PRIMARY KEY AUTO_INCREMENT, -- Se corrigió ; por ,
    cantidad_h INT,
    cantidad_m INT,
    total INT,
    porcentaje_atencion FLOAT,
    id_reporte_estudiantes_nivelacion_ordinario INT,
    FOREIGN KEY (id_reporte_estudiantes_nivelacion_ordinario) REFERENCES reporte_estudiantes_nivelacion_ordinario(id),
    deleted_at TIMESTAMP NULL   
);
