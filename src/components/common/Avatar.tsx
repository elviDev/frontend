import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface AvatarProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    isOnline?: boolean;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  showOnlineStatus?: boolean;
  gradientColors?: string[];
}

const SIZE_CONFIG = {
  xs: { size: 24, text: 10, statusSize: 8, statusOffset: -2 },
  sm: { size: 32, text: 12, statusSize: 10, statusOffset: -2 },
  md: { size: 40, text: 14, statusSize: 12, statusOffset: -2 },
  lg: { size: 48, text: 16, statusSize: 14, statusOffset: -2 },
  xl: { size: 64, text: 20, statusSize: 16, statusOffset: -4 },
};

const GRADIENT_COLORS: string[][] = [
  ['#FF6B6B', '#FF8E8E'],
  ['#4ECDC4', '#44A08D'],
  ['#45B7D1', '#96C93D'],
  ['#FFA07A', '#FA8072'],
  ['#98D8C8', '#F7DC6F'],
  ['#BB9CC0', '#FDBB2D'],
  ['#A8E6CF', '#88D8A3'],
  ['#FFB347', '#FFCC5C'],
];

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  onPress,
  showOnlineStatus = false,
  gradientColors,
}) => {
  const config = SIZE_CONFIG[size];
  const initials = (user.name || 'U')
    .split(' ')
    .map(n => n?.charAt(0) || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Generate consistent gradient based on user ID with safety checks
  const getUserGradient = () => {
    if (gradientColors && Array.isArray(gradientColors) && gradientColors.length === 2) {
      return gradientColors;
    }
    
    if (!GRADIENT_COLORS || !Array.isArray(GRADIENT_COLORS) || GRADIENT_COLORS.length === 0) {
      return ['#6B7280', '#9CA3AF']; // Fallback gray gradient
    }

    console.log('User ID:', user);
    
    const userId = user?.id || '0';
    const numericId = parseInt(userId, 10) || 0;
    const gradientIndex = numericId % GRADIENT_COLORS.length;
    const selectedGradient = GRADIENT_COLORS[gradientIndex];
    
    if (!selectedGradient || !Array.isArray(selectedGradient) || selectedGradient.length < 2) {
      return ['#6B7280', '#9CA3AF']; // Fallback gray gradient
    }
    
    return selectedGradient;
  };
  
  const userGradient = getUserGradient();

  const AvatarContent = () => (
    <View style={{ position: 'relative' }}>
      {user.avatar?.includes('http') || user.avatar?.includes('https') ? (
        <Image
          source={{ uri: user.avatar }}
          style={{
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
          }}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={userGradient}
          style={{
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 0,
          }}
        >
          <Text
            style={{
              fontSize: config.text,
              fontWeight: '600',
              color: 'white',
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {initials}
          </Text>
        </LinearGradient>
      )}

      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <View
          style={{
            position: 'absolute',
            bottom: config.statusOffset,
            right: config.statusOffset,
            width: config.statusSize,
            height: config.statusSize,
            borderRadius: config.statusSize / 2,
            backgroundColor: user.isOnline ? '#10B981' : '#6B7280',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      )}

      {/* Role Badge for larger sizes */}
      {size === 'lg' || size === 'xl' ? (
        user.role && (
          <View
            style={{
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: [{ translateX: -20 }],
              backgroundColor: '#3B82F6',
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
              minWidth: 40,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: 'white',
                fontWeight: '500',
                textAlign: 'center',
              }}
            >
              {user.role}
            </Text>
          </View>
        )
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={{ alignItems: 'center' }}>
        <AvatarContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <AvatarContent />
    </View>
  );
};