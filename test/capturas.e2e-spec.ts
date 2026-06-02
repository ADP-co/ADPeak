import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';
import { AppModule } from '../src/app.module';

const plantelHeaders = {
  'x-role': 'plantel',
  'x-user-id': '3',
  'x-plantel-id': '1',
};

const otroPlantelHeaders = {
  'x-role': 'plantel',
  'x-user-id': '4',
  'x-plantel-id': '2',
};

const responsableHeaders = {
  'x-role': 'responsable',
  'x-user-id': '2',
  'x-responsable-id': '2',
};

const adminHeaders = {
  'x-role': 'admin',
  'x-user-id': '1',
};

const draftPayload = {
  plantelId: 1,
  indicadorId: 1,
  actividadId: 1,
  periodoId: 1,
  responsableId: 2,
  payload: {
    avance: 35,
    observaciones: 'Avance inicial',
  },
};

type HistoryResponse = {
  versiones: Array<{
    numero: number;
    payload: Record<string, unknown>;
  }>;
};

type RevisionSummary = {
  id: number;
  estado: string;
};

type EstadoResponse = {
  estado: string;
  versionActual: number;
  cerrado: boolean;
};

describe('SCRUM-37 captura y revision (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.ADPEAK_DB_PATH = ':memory:';

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

  it('crea borrador, versiona actualizaciones y conserva historial', async () => {
    const created = await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(plantelHeaders)
      .send(draftPayload)
      .expect(201);

    expect(created.body).toMatchObject({
      id: 1,
      estado: 'borrador',
      versionActual: 1,
      payload: draftPayload.payload,
    });

    const updatedPayload = {
      payload: {
        avance: 65,
        observaciones: 'Autoguardado con evidencia validada',
      },
      motivoCambio: 'autoguardado',
    };

    const updated = await request(app.getHttpServer() as SupertestApp)
      .put('/api/v1/capturas/1')
      .set(plantelHeaders)
      .send(updatedPayload)
      .expect(200);

    expect(updated.body).toMatchObject({
      id: 1,
      estado: 'borrador',
      versionActual: 2,
      payload: updatedPayload.payload,
    });

    const history = await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/capturas/1/historial')
      .set(plantelHeaders)
      .expect(200);

    const historyBody = history.body as HistoryResponse;
    expect(historyBody.versiones).toHaveLength(2);
    expect(historyBody.versiones[0]).toMatchObject({
      numero: 1,
      payload: draftPayload.payload,
    });
    expect(historyBody.versiones[1]).toMatchObject({
      numero: 2,
      payload: updatedPayload.payload,
    });
  });

  it('envia a revision, respeta alcance y bloquea cambios posteriores', async () => {
    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(plantelHeaders)
      .send(draftPayload)
      .expect(201);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/1/enviar-revision')
      .set(plantelHeaders)
      .expect(201);

    await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/capturas/1/estado')
      .set(plantelHeaders)
      .expect(200)
      .expect((response) => {
        const body = response.body as EstadoResponse;
        expect(body).toMatchObject({
          estado: 'en_revision',
          versionActual: 1,
          cerrado: false,
        });
      });

    await request(app.getHttpServer() as SupertestApp)
      .put('/api/v1/capturas/1')
      .set(plantelHeaders)
      .send({ payload: { avance: 90 } })
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/capturas/1')
      .set(otroPlantelHeaders)
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/revisiones')
      .set(responsableHeaders)
      .expect(200)
      .expect((response) => {
        const body = response.body as RevisionSummary[];
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: 1,
          estado: 'en_revision',
        });
      });

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/revisiones/1/resolver')
      .set(responsableHeaders)
      .send({ estado: 'cerrado', comentario: 'Cierre prematuro' })
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/revisiones/1/resolver')
      .set(responsableHeaders)
      .send({ estado: 'aprobado', comentario: 'Revision validada' })
      .expect(201)
      .expect((response) => {
        const body = response.body as RevisionSummary;
        expect(body.estado).toBe('aprobado');
      });

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/revisiones/1/resolver')
      .set(responsableHeaders)
      .send({ estado: 'correccion_solicitada' })
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/revisiones/1/resolver')
      .set(responsableHeaders)
      .send({ estado: 'cerrado', comentario: 'Cierre sin rol admin' })
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/revisiones/1/resolver')
      .set(adminHeaders)
      .send({ estado: 'cerrado', comentario: 'Cierre validado' })
      .expect(201)
      .expect((response) => {
        const body = response.body as RevisionSummary;
        expect(body.estado).toBe('cerrado');
      });

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/revisiones/1/resolver')
      .set(adminHeaders)
      .send({ estado: 'correccion_solicitada' })
      .expect(403);
  });

  it('rechaza payloads invalidos, campos extra y acciones fuera de rol', async () => {
    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .send(draftPayload)
      .expect(401);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(responsableHeaders)
      .send(draftPayload)
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(otroPlantelHeaders)
      .send(draftPayload)
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(adminHeaders)
      .send({ ...draftPayload, campoNoPermitido: true })
      .expect(400);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(adminHeaders)
      .send({ ...draftPayload, payload: 'texto no valido' })
      .expect(400);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(adminHeaders)
      .send({ ...draftPayload, actividadId: undefined })
      .expect(400);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/capturas/borradores')
      .set(adminHeaders)
      .send(draftPayload)
      .expect(201);

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/revisiones/1/resolver')
      .set(adminHeaders)
      .send({ estado: 'aprobado' })
      .expect(403);
  });
});
