import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCaptureDraft,
  findCaptureDraft,
  getCaptureDraft,
  sendCaptureToReview,
  updateCaptureDraft,
  type CaptureDraft,
  type CaptureDraftRequest,
  type CapturePayload,
} from '../api/capturas';

const STORAGE_KEY_PREFIX = 'sigi-poa:capture-draft-id';

type UseCaptureDraftOptions = Omit<CaptureDraftRequest, 'payload' | 'motivoCambio'> & {
  storageScope?: string;
};

function initialCaptureId(storageKey: string) {
  const value = window.localStorage.getItem(storageKey);
  const parsed = value ? Number(value) : undefined;
  return parsed && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function useCaptureDraft(options: UseCaptureDraftOptions) {
  const queryClient = useQueryClient();
  const { storageScope, ...captureOptions } = options;
  const storageKey = `${STORAGE_KEY_PREFIX}:${storageScope ?? [
    options.plantelId,
    options.indicadorId,
    options.periodoId,
    options.actividadId,
  ].join(':')}`;
  const [captureId, setCaptureId] = useState<number | undefined>(() => initialCaptureId(storageKey));

  useEffect(() => {
    setCaptureId(initialCaptureId(storageKey));
  }, [storageKey]);

  const captureQuery = useQuery({
    queryKey: ['capture-draft', storageKey, captureId],
    queryFn: () => getCaptureDraft(captureId as number),
    enabled: Boolean(captureId),
  });

  const persistCapture = (capture: CaptureDraft) => {
    setCaptureId(capture.id);
    window.localStorage.setItem(storageKey, String(capture.id));
    queryClient.setQueryData(['capture-draft', storageKey, capture.id], capture);
  };

  const scopedCaptureQuery = useQuery({
    queryKey: ['capture-draft-scope', storageKey],
    queryFn: () => findCaptureDraft(captureOptions),
    enabled: !captureId,
  });

  useEffect(() => {
    if (scopedCaptureQuery.data) {
      persistCapture(scopedCaptureQuery.data);
    }
  }, [scopedCaptureQuery.data]);

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
        ? await updateCaptureDraft(captureId, payload, 'envio a revision desde frontend')
        : await createCaptureDraft({
            ...captureOptions,
            payload,
            motivoCambio: 'borrador previo a envio a revision',
          });

      persistCapture(draft);
      return sendCaptureToReview(draft.id);
    },
    onSuccess: persistCapture,
  });

  const statusMessage = useMemo(() => {
    if (captureQuery.isLoading || scopedCaptureQuery.isLoading) {
      return 'Cargando borrador...';
    }

    if (sendToReviewMutation.isPending) {
      return 'Enviando...';
    }

    if (sendToReviewMutation.isSuccess) {
      return 'Enviado a revision.';
    }

    if (saveDraftMutation.isPending) {
      return 'Guardando...';
    }

    if (saveDraftMutation.isSuccess) {
      return 'Borrador guardado.';
    }

    if (captureQuery.data || scopedCaptureQuery.data) {
      return 'Borrador disponible.';
    }

    return undefined;
  }, [
    captureQuery.data,
    captureQuery.isLoading,
    scopedCaptureQuery.data,
    scopedCaptureQuery.isLoading,
    saveDraftMutation.isPending,
    saveDraftMutation.isSuccess,
    sendToReviewMutation.isPending,
    sendToReviewMutation.isSuccess,
  ]);

  return {
    capture: captureQuery.data ?? scopedCaptureQuery.data,
    statusMessage,
    errorMessage:
      captureQuery.error instanceof Error
        ? captureQuery.error.message
        : scopedCaptureQuery.error instanceof Error
          ? scopedCaptureQuery.error.message
        : saveDraftMutation.error instanceof Error
          ? saveDraftMutation.error.message
          : sendToReviewMutation.error instanceof Error
            ? sendToReviewMutation.error.message
            : undefined,
    saveDraft: saveDraftMutation.mutate,
    sendToReview: sendToReviewMutation.mutate,
    isBusy: captureQuery.isLoading || scopedCaptureQuery.isLoading || saveDraftMutation.isPending || sendToReviewMutation.isPending,
  };
}
