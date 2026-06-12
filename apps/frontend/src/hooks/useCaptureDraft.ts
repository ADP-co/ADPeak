import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCaptureDraft,
  getCaptureDraft,
  sendCaptureToReview,
  updateCaptureDraft,
  type CaptureDraft,
  type CaptureDraftRequest,
  type CapturePayload,
} from '../api/capturas';

const STORAGE_KEY = 'sigi-poa:capture-draft-id';

type UseCaptureDraftOptions = Omit<CaptureDraftRequest, 'payload' | 'motivoCambio'>;

function initialCaptureId() {
  const value = window.localStorage.getItem(STORAGE_KEY);
  const parsed = value ? Number(value) : undefined;
  return parsed && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function useCaptureDraft(options: UseCaptureDraftOptions) {
  const queryClient = useQueryClient();
  const [captureId, setCaptureId] = useState<number | undefined>(() => initialCaptureId());

  const captureQuery = useQuery({
    queryKey: ['capture-draft', captureId],
    queryFn: () => getCaptureDraft(captureId as number),
    enabled: Boolean(captureId),
  });

  const persistCapture = (capture: CaptureDraft) => {
    setCaptureId(capture.id);
    window.localStorage.setItem(STORAGE_KEY, String(capture.id));
    queryClient.setQueryData(['capture-draft', capture.id], capture);
  };

  const saveDraftMutation = useMutation({
    mutationFn: async (payload: CapturePayload) => {
      if (captureId) {
        return updateCaptureDraft(captureId, payload);
      }

      return createCaptureDraft({
        ...options,
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
            ...options,
            payload,
            motivoCambio: 'borrador previo a envio a revision',
          });

      persistCapture(draft);
      return sendCaptureToReview(draft.id);
    },
    onSuccess: persistCapture,
  });

  const statusMessage = useMemo(() => {
    if (captureQuery.isLoading) {
      return 'Recuperando borrador existente...';
    }

    if (sendToReviewMutation.isPending) {
      return 'Enviando captura a revision...';
    }

    if (sendToReviewMutation.isSuccess) {
      return `Captura enviada a revision. Estado: ${sendToReviewMutation.data.estado}.`;
    }

    if (saveDraftMutation.isPending) {
      return 'Guardando borrador...';
    }

    if (saveDraftMutation.isSuccess) {
      return `Borrador guardado en el sistema. Captura #${saveDraftMutation.data.id}, version ${saveDraftMutation.data.versionActual}.`;
    }

    if (captureQuery.data) {
      return `Borrador recuperado. Captura #${captureQuery.data.id}, estado ${captureQuery.data.estado}.`;
    }

    return undefined;
  }, [
    captureQuery.data,
    captureQuery.isLoading,
    saveDraftMutation.data,
    saveDraftMutation.isPending,
    saveDraftMutation.isSuccess,
    sendToReviewMutation.data,
    sendToReviewMutation.isPending,
    sendToReviewMutation.isSuccess,
  ]);

  return {
    capture: captureQuery.data,
    statusMessage,
    errorMessage:
      captureQuery.error instanceof Error
        ? captureQuery.error.message
        : saveDraftMutation.error instanceof Error
          ? saveDraftMutation.error.message
          : sendToReviewMutation.error instanceof Error
            ? sendToReviewMutation.error.message
            : undefined,
    saveDraft: saveDraftMutation.mutate,
    sendToReview: sendToReviewMutation.mutate,
    isBusy: captureQuery.isLoading || saveDraftMutation.isPending || sendToReviewMutation.isPending,
  };
}
