import { useTranslation } from 'react-i18next';

/**
 * Custom hook that provides typed translations for the app
 * This ensures type safety and better developer experience
 */
export const useAppTranslation = () => {
  const { t, i18n } = useTranslation();

  return {
    t,
    i18n,
    // Auth translations
    auth: {
      login: () => t('auth.login'),
      logout: () => t('auth.logout'),
      register: () => t('auth.register'),
      email: () => t('auth.email'),
      password: () => t('auth.password'),
      forgotPassword: () => t('auth.forgotPassword'),
      loginSuccess: () => t('auth.loginSuccess'),
      logoutConfirm: () => t('auth.logoutConfirm'),
      cancel: () => t('auth.cancel'),
    },
    // Task translations
    tasks: {
      title: () => t('tasks.title'),
      createTask: () => t('tasks.createTask'),
      editTask: () => t('tasks.editTask'),
      description: () => t('tasks.description'),
      priority: () => t('tasks.priority'),
      status: () => t('tasks.status'),
      saveTask: () => t('tasks.saveTask'),
      deleteTask: () => t('tasks.deleteTask'),
      taskCreated: () => t('tasks.taskCreated'),
      taskUpdated: () => t('tasks.taskUpdated'),
      taskDeleted: () => t('tasks.taskDeleted'),
      noTasks: () => t('tasks.noTasks'),
    },
    // Common translations
    common: {
      save: () => t('common.save'),
      cancel: () => t('common.cancel'),
      delete: () => t('common.delete'),
      edit: () => t('common.edit'),
      loading: () => t('common.loading'),
      error: () => t('common.error'),
      success: () => t('common.success'),
      confirm: () => t('common.confirm'),
      yes: () => t('common.yes'),
      no: () => t('common.no'),
      ok: () => t('common.ok'),
    },
    // Navigation translations
    navigation: {
      home: () => t('navigation.home'),
      tasks: () => t('navigation.tasks'),
      channels: () => t('navigation.channels'),
      activity: () => t('navigation.activity'),
      profile: () => t('navigation.profile'),
    },
    // Channel translations
    channels: {
      title: () => t('channels.title'),
      createChannel: () => t('channels.createChannel'),
      editChannel: () => t('channels.editChannel'),
      deleteChannel: () => t('channels.deleteChannel'),
      viewChannel: () => t('channels.viewChannel'),
      channelOptions: () => t('channels.channelOptions'),
      searchChannels: () => t('channels.searchChannels'),
      createFirstChannel: () => t('channels.createFirstChannel'),
      channelCreated: () => t('channels.channelCreated'),
      channelUpdated: () => t('channels.channelUpdated'),
      channelDeleted: () => t('channels.channelDeleted'),
      deleteChannelConfirm: () => t('channels.deleteChannelConfirm'),
      channelNameRequired: () => t('channels.channelNameRequired'),
      channelNameTooShort: () => t('channels.channelNameTooShort'),
      channelsFound: (count: number) => count === 1 ? t('channels.channelsFound') : t('channels.channelsFoundPlural'),
    },
    // Error translations
    errors: {
      networkError: () => t('errors.networkError'),
      serverError: () => t('errors.serverError'),
      unknownError: () => t('errors.unknownError'),
      emailRequired: () => t('errors.emailRequired'),
      emailInvalid: () => t('errors.emailInvalid'),
      passwordRequired: () => t('errors.passwordRequired'),
    },
  };
};