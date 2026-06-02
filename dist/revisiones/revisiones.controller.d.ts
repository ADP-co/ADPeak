import { CapturasService } from '../capturas/capturas.service';
import { ResolveReviewDto } from './dtos/resolve-review.dto';
export declare class RevisionesController {
    private readonly capturasService;
    constructor(capturasService: CapturasService);
    findForReview(headers: Record<string, string | string[] | undefined>): {
        id: number;
        plantelId: number;
        indicadorId: number;
        actividadId: number | null;
        periodoId: number;
        responsableId: number | null;
        estado: "cerrado" | "borrador" | "enviado" | "en_revision" | "correccion_solicitada" | "aprobado";
        versionActual: number;
        payload: unknown;
        cerradoEn: string | null;
        creadoEn: string;
        actualizadoEn: string;
    }[];
    resolve(headers: Record<string, string | string[] | undefined>, capturaId: number, dto: ResolveReviewDto): {
        id: number;
        plantelId: number;
        indicadorId: number;
        actividadId: number | null;
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
