import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveCapture,
  CaptureRequestError,
  createCaptureDraft,
  findCaptureDraft,
  getCaptureDraft,
  requestCaptureCorrection,
  sendCaptureToReview,
  updateCaptureDraft,
  type CaptureDraft,
  type CaptureDraftRequest,
  type CapturePayload,
} from '../api/capturas';

const STORAGE_KEY_PREFIX = 'sigi-poa:capture-draft-id';

type UseCaptureDraftOptions = Omit<CaptureDraftRequest, 'payload' | 'motivoCambio'> & {
  requestedCaptureId?: number;
  storageScope?: string;
  enabled?: boolean;
};

function initialCaptureId(storageKey: string) {
  const value = window.localStorage.getItem(storageKey);
  const parsed = value ? Number(value) : undefined;
  return parsed && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function useCaptureDraft(options: UseCaptureDraftOptions) {
  const queryClient = useQueryClient();
  const { requestedCaptureId, storageScope, enabled = true, ...captureOptions } = options;
  const hasRequestedCapture = Boolean(requestedCaptureId);
  const storageKey = `${STORAGE_KEY_PREFIX}:${storageScope ?? [
    options.plantelId,
    options.indicadorId,
    options.periodoId,
    options.actividadId,
  ].join(':')}`;
  const [captureId, setCaptureId] = useState<number | undefined>(() => requestedCaptureId ?? initialCaptureId(storageKey));

  useEffect(() => {
    setCaptureId(requestedCaptureId ?? initialCaptureId(storageKey));
  }, [requestedCaptureId, storageKey]);

  const captureQuery = useQuery({
    queryKey: ['capture-draft', storageKey, captureId],
    queryFn: () => getCaptureDraft(captureId as number),
    enabled: enabled && Boolean(captureId),
  });

  const persistCapture = (capture: CaptureDraft) => {
    setCaptureId(capture.id);
    window.localStorage.setItem(storageKey, String(capture.id));
    queryClient.setQueryData(['capture-draft', storageKey, capture.id], capture);
    if (!hasRequestedCapture) {
      queryClient.setQueryData(['capture-draft-scope', storageKey], capture);
    }
  };

  const scopedCaptureQuery = useQuery({
    queryKey: ['capture-draft-scope', storageKey],
    queryFn: () => findCaptureDraft(captureOptions),
    enabled: enabled && !captureId && !hasRequestedCapture,
  });
  const scopedCapture = hasRequestedCapture ? undefined : scopedCaptureQuery.data;

  useEffect(() => {
    if (!hasRequestedCapture && scopedCaptureQuery.data) {
      persistCapture(scopedCaptureQuery.data);
    }
  }, [hasRequestedCapture, scopedCaptureQuery.data]);

  useEffect(() => {
    if (
      !hasRequestedCapture &&
      captureQuery.error instanceof CaptureRequestError &&
      captureQuery.error.code === 'capture_not_found'
    ) {
      window.localStorage.removeItem(storageKey);
      setCaptureId(undefined);
    }
  }, [captureQuery.error, hasRequestedCapture, storageKey]);

  const saveDraftMutation = useMutation({
    mutationFn: async (payload: CapturePayload) => {
      if (captureId) {
        return updateCaptureDraft(captureId, payload);
      }

      return createCaptureDraft({
        ...captureOptions,
        payload,
        motivoCambio: 'borrador desde frontend',
      });
    },
    onSuccess: persistCapture,
  });

  const sendToReviewMutation = useMutation({
    mutationFn: async (payload: CapturePayload) => {
      const draft = captureId
        ? await updateCaptureDraft(captureId, payload, 'envío a revisión desde frontend')
        : await createCaptureDraft({
            ...captureOptions,
            payload,
            motivoCambio: 'borrador previo a envío a revisión',
          });

      persistCapture(draft);
      return sendCaptureToReview(draft.id);
    },
    onSuccess: persistCapture,
  });

  const requestCorrectionMutation = useMutation({
    mutationFn: async (observacion: string) => {
      const draftId = captureId ?? scopedCapture?.id;

      if (!draftId) {
        throw new CaptureRequestError('Primero debe existir una captura enviada a revisión.');
      }

      return requestCaptureCorrection(draftId, observacion);
    },
    onSuccess: persistCapture,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const draftId = captureId ?? scopedCapture?.id;

      if (!draftId) {
        throw new CaptureRequestError('Primero debe existir una captura enviada a revisión.');
      }

      return approveCapture(draftId);
    },
    onSuccess: persistCapture,
  });

  const statusMessage = useMemo(() => {
    if (captureQuery.isLoading || (!hasRequestedCapture && scopedCaptureQuery.isLoading)) {
      return 'Cargando borrador...';
    }

    if (sendToReviewMutation.isPending) {
      return 'Enviando...';
    }

    if (sendToReviewMutation.isSuccess) {
      return 'Enviado a revisión.';
    }

    if (saveDraftMutation.isPending) {
      return 'Guardando...';
    }

    if (saveDraftMutation.isSuccess) {
      return 'Borrador guardado.';
    }

    if (captureQuery.data || scopedCapture) {
      return 'Borrador disponible.';
    }

    return undefined;
  }, [
    captureQuery.data,
    captureQuery.isLoading,
    scopedCapture,
    scopedCaptureQuery.isLoading,
    hasRequestedCapture,
    saveDraftMutation.isPending,
    saveDraftMutation.isSuccess,
    sendToReviewMutation.isPending,
    sendToReviewMutation.isSuccess,
  ]);

  return {
    capture: captureQuery.data ?? scopedCapture,
    statusMessage,
    errorMessage:
      captureQuery.error instanceof Error
        ? captureQuery.error.message
        : !hasRequestedCapture && scopedCaptureQuery.error instanceof Error
          ? scopedCaptureQuery.error.message
        : saveDraftMutation.error instanceof Error
          ? saveDraftMutation.error.message
          : sendToReviewMutation.error instanceof Error
            ? sendToReviewMutation.error.message
            : requestCorrectionMutation.error instanceof Error
              ? requestCorrectionMutation.error.message
              : approveMutation.error instanceof Error
                ? approveMutation.error.message
            : undefined,
    saveDraft: saveDraftMutation.mutate,
    sendToReview: sendToReviewMutation.mutate,
    requestCorrection: requestCorrectionMutation.mutate,
    approve: approveMutation.mutate,
    isBusy:
      captureQuery.isLoading ||
      (!hasRequestedCapture && scopedCaptureQuery.isLoading) ||
      saveDraftMutation.isPending ||
      sendToReviewMutation.isPending ||
      requestCorrectionMutation.isPending ||
      approveMutation.isPending,
  };
}
