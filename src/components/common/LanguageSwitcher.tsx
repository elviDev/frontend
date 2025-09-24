import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../utils/colors';

interface LanguageSwitcherProps {
  style?: any;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ style }) => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{t('profile.language')}</Text>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            currentLanguage === 'es' && styles.activeButton,
          ]}
          onPress={() => changeLanguage('es')}
        >
          <Text
            style={[
              styles.buttonText,
              currentLanguage === 'es' && styles.activeButtonText,
            ]}
          >
            Español
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            currentLanguage === 'en' && styles.activeButton,
          ]}
          onPress={() => changeLanguage('en')}
        >
          <Text
            style={[
              styles.buttonText,
              currentLanguage === 'en' && styles.activeButtonText,
            ]}
          >
            English
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: Colors.background,
    padding: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeButtonText: {
    color: Colors.white,
  },
});