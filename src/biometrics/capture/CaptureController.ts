import { useState, useEffect } from 'react';
import { CaptureState } from './CaptureState';
import { CaptureMessages } from './CaptureMessages';
import { DetectionState } from '../detection/DetectionTypes';

export const useCaptureController = (
  detectionState: DetectionState,
  isCentered: boolean
) => {
  const [currentState, setCurrentState] = useState<CaptureState>(CaptureState.RED);
  const [message, setMessage] = useState<string>(CaptureMessages.NO_FACE);
  const [captureReady, setCaptureReady] = useState<boolean>(false);

  useEffect(() => {
    let readyTimer: ReturnType<typeof setTimeout>;

    console.log('[CAP_CTRL] useEffect: detectionState=' + detectionState + ' isCentered=' + isCentered);

    if (detectionState === DetectionState.NO_FACE) {
      console.log('[CAP_CTRL] RING => RED (NO_FACE)');
      setCurrentState(CaptureState.RED);
      setMessage(CaptureMessages.NO_FACE);
      setCaptureReady(false);
    } else if (detectionState === DetectionState.MULTIPLE_FACES) {
      console.log('[CAP_CTRL] RING => RED (MULTIPLE_FACES)');
      setCurrentState(CaptureState.RED);
      setMessage(CaptureMessages.MULTIPLE_FACES);
      setCaptureReady(false);
    } else if (detectionState === DetectionState.ONE_FACE) {
      if (!isCentered) {
        console.log('[CAP_CTRL] RING => YELLOW (ONE_FACE, not centered)');
        setCurrentState(CaptureState.YELLOW);
        setMessage(CaptureMessages.CENTER_FACE);
        setCaptureReady(false);
      } else {
        console.log('[CAP_CTRL] RING => GREEN (ONE_FACE, centered!)');
        setCurrentState(CaptureState.GREEN);
        setMessage(CaptureMessages.HOLD_STEADY);
        
        // Face is centered. Wait 1.5 seconds to confirm readiness.
        readyTimer = setTimeout(() => {
          setMessage(CaptureMessages.READY);
          setCaptureReady(true);
        }, 1500);
      }
    }

    return () => {
      if (readyTimer) clearTimeout(readyTimer);
    };
  }, [detectionState, isCentered]);

  return {
    currentState,
    message,
    captureReady,
  };
};
