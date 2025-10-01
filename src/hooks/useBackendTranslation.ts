import { useTranslation } from 'react-i18next';

export const useBackendTranslation = () => {
  const { t } = useTranslation();

  const translateTaskStatus = (status: string): string => {
    // Normalize status (remove spaces, convert to lowercase, replace with underscore)
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    return t(`backendTranslations.taskStatuses.${normalizedStatus}`, status);
  };

  const translateTaskPriority = (priority: string): string => {
    const normalizedPriority = priority.toLowerCase().replace(/\s+/g, '_');
    return t(`backendTranslations.taskPriorities.${normalizedPriority}`, priority);
  };

  const translateChannelType = (channelType: string): string => {
    const normalizedType = channelType.toLowerCase().replace(/\s+/g, '_');
    return t(`backendTranslations.channelTypes.${normalizedType}`, channelType);
  };

  const translateUserRole = (role: string): string => {
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '_');
    return t(`backendTranslations.userRoles.${normalizedRole}`, role);
  };

  const translateActivityType = (activityType: string): string => {
    const normalizedType = activityType.toLowerCase().replace(/\s+/g, '_');
    return t(`backendTranslations.activityTypes.${normalizedType}`, activityType);
  };

  const translateCommonTerm = (term: string): string => {
    const normalizedTerm = term.toLowerCase().replace(/\s+/g, '_');
    return t(`backendTranslations.commonTerms.${normalizedTerm}`, term);
  };

  // Advanced function for translating any backend text with smart fallback
  const translateBackendText = (text: string, category?: string): string => {
    if (!text) return text;

    // If category is specified, try that first
    if (category) {
      const normalizedText = text.toLowerCase().replace(/\s+/g, '_');
      const translatedText = t(`backendTranslations.${category}.${normalizedText}`, '');
      if (translatedText) return translatedText;
    }

    // Try all categories automatically
    const categories = ['taskStatuses', 'taskPriorities', 'channelTypes', 'userRoles', 'activityTypes', 'commonTerms'];
    const normalizedText = text.toLowerCase().replace(/\s+/g, '_');
    
    for (const cat of categories) {
      const translatedText = t(`backendTranslations.${cat}.${normalizedText}`, '');
      if (translatedText) return translatedText;
    }

    // Return original text if no translation found
    return text;
  };

  return {
    translateTaskStatus,
    translateTaskPriority,
    translateChannelType,
    translateUserRole,
    translateActivityType,
    translateCommonTerm,
    translateBackendText,
  };
};