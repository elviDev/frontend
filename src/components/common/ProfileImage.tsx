import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useProfileImage } from '../../hooks/useProfileImage';

export interface ProfileImageProps {
  userId: string | null;
  name?: string;
  size?: number;
  showFallback?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  textStyle?: TextStyle;
  gradientColors?: string[];
  borderRadius?: number;
  onImageError?: () => void;
}

export const ProfileImage: React.FC<ProfileImageProps> = ({
  userId,
  name = 'U',
  size = 40,
  showFallback = true,
  style,
  imageStyle,
  textStyle,
  gradientColors = ['#8B5CF6', '#3B82F6'],
  borderRadius,
  onImageError,
}) => {
  const { imageUri, isLoading, error } = useProfileImage(userId);
  
  const finalBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;
  const fontSize = size / 2.5;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: finalBorderRadius,
    overflow: 'hidden',
    ...style,
  };

  const imageStyleFinal: ImageStyle = {
    width: size,
    height: size,
    borderRadius: finalBorderRadius,
    ...imageStyle,
  };

  const textStyleFinal: TextStyle = {
    fontSize,
    fontWeight: 'bold',
    color: 'white',
    ...textStyle,
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={[containerStyle, { backgroundColor: '#F3F4F6' }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[textStyleFinal, { color: '#9CA3AF' }]}>•••</Text>
        </View>
      </View>
    );
  }

  // Show image if available
  if (imageUri && !error) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUri }}
          style={imageStyleFinal}
          onError={(e) => {
            console.warn('ProfileImage: Failed to load image:', e.nativeEvent.error);
            if (onImageError) {
              onImageError();
            }
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Show fallback gradient avatar
  if (showFallback) {
    return (
      <View style={containerStyle}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={imageStyleFinal}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={textStyleFinal}>
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Show empty placeholder
  return (
    <View style={[containerStyle, { backgroundColor: '#F3F4F6' }]}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[textStyleFinal, { color: '#9CA3AF' }]}>?</Text>
      </View>
    </View>
  );
};

// Preset sizes for common use cases
export const ProfileImageSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  xxl: 100,
} as const;

// Convenience components for common sizes
export const ProfileImageXS: React.FC<Omit<ProfileImageProps, 'size'>> = (props) => (
  <ProfileImage {...props} size={ProfileImageSizes.xs} />
);

export const ProfileImageSM: React.FC<Omit<ProfileImageProps, 'size'>> = (props) => (
  <ProfileImage {...props} size={ProfileImageSizes.sm} />
);

export const ProfileImageMD: React.FC<Omit<ProfileImageProps, 'size'>> = (props) => (
  <ProfileImage {...props} size={ProfileImageSizes.md} />
);

export const ProfileImageLG: React.FC<Omit<ProfileImageProps, 'size'>> = (props) => (
  <ProfileImage {...props} size={ProfileImageSizes.lg} />
);

export const ProfileImageXL: React.FC<Omit<ProfileImageProps, 'size'>> = (props) => (
  <ProfileImage {...props} size={ProfileImageSizes.xl} />
);

export const ProfileImageXXL: React.FC<Omit<ProfileImageProps, 'size'>> = (props) => (
  <ProfileImage {...props} size={ProfileImageSizes.xxl} />
);