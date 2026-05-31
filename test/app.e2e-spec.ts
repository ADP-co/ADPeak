import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type ResourceCase = {
  name: string;
  path: string;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

const resources: ResourceCase[] = [
  {
    name: 'usuarios',
    path: '/api/v1/usuarios',
    create: { nombre: 'Usuario Admin', email: 'admin@sigi.test', rol: 'Admin' },
    update: { nombre: 'Usuario Admin Editado', rol: 'Responsable' },
  },
  {
    name: 'planteles',
    path: '/api/v1/catalogos/planteles',
    create: { nombre: 'Bachillerato 10', clave: 'B10', municipio: 'Colima' },
    update: { nombre: 'Bachillerato 10 Editado' },
  },
  {
    name: 'indicadores',
    path: '/api/v1/catalogos/indicadores',
    create: {
      nombre: 'Tasa de aprobacion',
      descripcion: 'Indicador de aprobacion semestral',
      plantelId: 1,
      actividadId: 1,
      unidadMedida: 'porcentaje',
    },
    update: { nombre: 'Tasa de aprobacion ajustada', unidadMedida: 'porcentaje' },
  },
  {
    name: 'actividades',
    path: '/api/v1/catalogos/actividades',
    create: {
      nombre: 'Captura de avance',
      descripcion: 'Actividad para capturar avance POA',
      indicadorId: 1,
      plantelId: 1,
    },
    update: { nombre: 'Captura de avance editada' },
  },
  {
    name: 'periodos',
    path: '/api/v1/catalogos/periodos',
    create: { nombre: 'Periodo 2026-A', fechaInicio: '2026-01-01', fechaFin: '2026-06-30' },
    update: { nombre: 'Periodo 2026-A editado' },
  },
  {
    name: 'ciclos POA',
    path: '/api/v1/catalogos/ciclos-poa',
    create: { nombre: 'Ciclo POA 2026', anio: 2026, estado: 'planeacion' },
    update: { estado: 'abierto' },
  },
  {
    name: 'responsables',
    path: '/api/v1/catalogos/responsables',
    create: {
      usuarioId: 1,
      entidadTipo: 'Indicador',
      entidadId: 1,
      tipoResponsabilidad: 'Primario',
      nombre: 'Responsable principal',
    },
    update: { tipoResponsabilidad: 'Secundario' },
  },
  {
    name: 'contribuyentes',
    path: '/api/v1/catalogos/contribuyentes',
    create: {
      nombre: 'Contribuyente plantel',
      responsableId: 1,
      entidadTipo: 'Actividad',
      entidadId: 1,
    },
    update: { nombre: 'Contribuyente editado' },
  },
];

describe('SCRUM-36 CRUD administrativo (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(resources)('$name permite listar, crear, consultar, editar y desactivar', async (resource) => {
    await request(app.getHttpServer()).get(resource.path).expect(200).expect([]);

    const createResponse = await request(app.getHttpServer())
      .post(resource.path)
      .send(resource.create)
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: 1,
      activo: true,
      ...resource.create,
    });

    await request(app.getHttpServer())
      .get(resource.path)
      .expect(200)
      .expect([createResponse.body]);

    await request(app.getHttpServer()).get(`${resource.path}/1`).expect(200).expect(createResponse.body);

    const updateResponse = await request(app.getHttpServer())
      .put(`${resource.path}/1`)
      .send(resource.update)
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: 1,
      activo: true,
      ...resource.create,
      ...resource.update,
    });

    await request(app.getHttpServer())
      .patch(`${resource.path}/1/desactivar`)
      .expect(200)
      .expect((response) => {
        expect(response.body.activo).toBe(false);
      });

    await request(app.getHttpServer()).get(`${resource.path}/999`).expect(404);
  });

  it.each(resources)('$name rechaza payloads invalidos y campos no permitidos', async (resource) => {
    await request(app.getHttpServer()).post(resource.path).send({}).expect(400);

    await request(app.getHttpServer())
      .post(resource.path)
      .send({ ...resource.create, campoNoPermitido: true })
      .expect(400);

    await request(app.getHttpServer()).get(`${resource.path}/abc`).expect(400);
  });
});
