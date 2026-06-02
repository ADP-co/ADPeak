import { CapturasService } from './capturas.service';
import { CreateCaptureDraftDto } from './dtos/create-capture-draft.dto';
import { UpdateCaptureDto } from './dtos/update-capture.dto';
export declare class CapturasController {
    private readonly capturasService;
    constructor(capturasService: CapturasService);
    createDraft(headers: Record<string, string | string[] | undefined>, dto: CreateCaptureDraftDto): {
        id: number;
        plantelId: number;
        indicadorId: number;
        actividadId: number;
        periodoId: number;
        responsableId: number | null;
        estado: "cerrado" | "borrador" | "enviado" | "en_revision" | "correccion_solicitada" | "aprobado";
        versionActual: number;
        payload: unknown;
        cerradoEn: string | null;
        creadoEn: string;
        actualizadoEn: string;
    };
    findOne(headers: Record<string, string | string[] | undefined>, id: number): {
        id: number;
        plantelId: number;
        indicadorId: number;
        actividadId: number;
        periodoId: number;
        responsableId: number | null;
        estado: "cerrado" | "borrador" | "enviado" | "en_revision" | "correccion_solicitada" | "aprobado";
        versionActual: number;
        payload: unknown;
        cerradoEn: string | null;
        creadoEn: string;
        actualizadoEn: string;
    };
    getStatus(headers: Record<string, string | string[] | undefined>, id: number): {
        id: number;
        estado: "cerrado" | "borrador" | "enviado" | "en_revision" | "correccion_solicitada" | "aprobado";
        versionActual: number;
        cerrado: boolean;
        actualizadoEn: string;
    };
    getHistory(headers: Record<string, string | string[] | undefined>, id: number): {
        capturaId: number;
        versionActual: number;
        versiones: {
            id: number;
            numero: number;
            payload: unknown;
            motivoCambio: string | null;
            creadoPorUsuarioId: number | null;
            creadoEn: string;
        }[];
    };
    updateDraft(headers: Record<string, string | string[] | undefined>, id: number, dto: UpdateCaptureDto): {
        id: number;
        plantelId: number;
        indicadorId: number;
        actividadId: number;
        periodoId: number;
        responsableId: number | null;
        estado: "cerrado" | "borrador" | "enviado" | "en_revision" | "correccion_solicitada" | "aprobado";
        versionActual: number;
        payload: unknown;
        cerradoEn: string | null;
        creadoEn: string;
        actualizadoEn: string;
    };
    sendToReview(headers: Record<string, string | string[] | undefined>, id: number): {
        id: number;
        plantelId: number;
        indicadorId: number;
        actividadId: number;
        periodoId: number;
        responsableId: number | null;
        estado: "cerrado" | "borrador" | "enviado" | "en_revision" | "correccion_solicitada" | "aprobado";
        versionActual: number;
        payload: unknown;
        cerradoEn: string | null;
        creadoEn: string;
        actualizadoEn: string;
    };
}
