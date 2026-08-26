import { useEffect } from 'react';
import { useVoiceCommand, FormFieldsHandler } from '../context/VoiceCommandContext';

export const useVoiceForm = (pageKey: string, handler: FormFieldsHandler) => {
  const { registerFormHandler, unregisterFormHandler } = useVoiceCommand();

  useEffect(() => {
    registerFormHandler(pageKey, handler);
    return () => {
      unregisterFormHandler(pageKey);
    };
  }, [pageKey, handler]);
};
